'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Badge, Button, Card, Input } from '@/components/ui';
import { apiFetch } from '@/lib/api/client';
import { DESCRIPTION_MAX, type Project } from '@/lib/types';

const LANG_MAP: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
};

type Status = 'idle' | 'recording' | 'stopped';

export default function MeetingsPage() {
  const router = useRouter();
  const locale = useLocale();
  const [source, setSource] = useState<'mic' | 'screen'>('mic');
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Assume supported during SSR/first render to avoid a hydration mismatch;
  // detect for real after mount.
  const [speechSupported, setSpeechSupported] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [progress, setProgress] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamsRef = useRef<MediaStream[]>([]);
  const recordingBlobRef = useRef<Blob | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    setSpeechSupported(
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
    return () => workerRef.current?.terminate();
  }, []);

  async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
    const buffer = await blob.arrayBuffer();
    const ctx = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await ctx.decodeAudioData(buffer);
    let data: Float32Array;
    if (audioBuffer.numberOfChannels === 1) {
      data = audioBuffer.getChannelData(0);
    } else {
      const a = audioBuffer.getChannelData(0);
      const b = audioBuffer.getChannelData(1);
      data = new Float32Array(a.length);
      for (let i = 0; i < a.length; i++) data[i] = (a[i] + b[i]) / 2;
    }
    await ctx.close();
    return data;
  }

  async function transcribeRecording() {
    const blob = recordingBlobRef.current;
    if (!blob) return;
    setTranscribing(true);
    setError(null);
    setProgress('Preparing…');
    try {
      const audio = await decodeTo16kMono(blob);
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL('../../../lib/whisper/worker.ts', import.meta.url)
        );
      }
      const worker = workerRef.current;
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          const d = msg.data;
          if (d?.status === 'progress' && d?.file) {
            setProgress(`Downloading model: ${d.file} ${Math.round(d.progress ?? 0)}%`);
          } else if (d?.status === 'ready') {
            setProgress('Transcribing…');
          }
        } else if (msg.type === 'done') {
          setTranscript((msg.text ?? '').trim());
          setTranscribing(false);
          setProgress('');
        } else if (msg.type === 'error') {
          setError(msg.message);
          setTranscribing(false);
          setProgress('');
        }
      };
      setProgress('Loading model (first run downloads ~80 MB)…');
      worker.postMessage({ audio, language: locale }, [audio.buffer]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transcription failed');
      setTranscribing(false);
      setProgress('');
    }
  }

  async function start() {
    setError(null);
    setTranscript('');
    setInterim('');
    setRecordingUrl(null);
    chunksRef.current = [];
    try {
      const recStream =
        source === 'screen'
          ? await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            })
          : await navigator.mediaDevices.getUserMedia({ audio: true });
      streamsRef.current.push(recStream);

      const mr = new MediaRecorder(recStream);
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const type = chunksRef.current[0]?.type || 'video/webm';
        const blob = new Blob(chunksRef.current, { type });
        recordingBlobRef.current = blob;
        setRecordingUrl(URL.createObjectURL(blob));
      };
      mr.start();
      recorderRef.current = mr;

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.lang = LANG_MAP[locale] ?? 'en-US';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          let finalText = '';
          let interimText = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) finalText += r[0].transcript + ' ';
            else interimText += r[0].transcript;
          }
          if (finalText) setTranscript((t) => t + finalText);
          setInterim(interimText);
        };
        rec.onend = () => {
          if (recorderRef.current?.state === 'recording') {
            try {
              rec.start();
            } catch {
              // already started
            }
          }
        };
        rec.start();
        recognitionRef.current = rec;
      }

      setStatus('recording');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start recording');
    }
  }

  function stop() {
    recorderRef.current?.stop();
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    setInterim('');
    setStatus('stopped');
  }

  async function createProject() {
    if (!title.trim() || !transcript.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { data } = await apiFetch<{ data: Project }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: title,
          description: transcript.slice(0, DESCRIPTION_MAX),
        }),
      });
      router.push(`/projects/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-white">Meeting → PRD</h1>
        <p className="font-body text-sm text-gray-400">
          Record a meeting, get a live transcript, then turn it into a project
          and generate the PRD from it.
        </p>
      </div>

      {!speechSupported && (
        <Card className="border-error">
          <p className="font-body text-sm text-error">
            Live transcription needs the Web Speech API (use Chrome). You can
            still record and type the transcript manually.
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="font-body text-xs uppercase tracking-wide text-gray-400">
            Source
          </span>
          {(['mic', 'screen'] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={status === 'recording'}
              onClick={() => setSource(s)}
              className={`rounded-sm px-2 py-1 font-body text-xs ${
                source === s ? 'bg-coral text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {s === 'mic' ? 'Microphone' : 'Screen + audio'}
            </button>
          ))}
          {status === 'recording' && (
            <Badge variant="completed">● Recording</Badge>
          )}
        </div>

        <div className="flex gap-2">
          {status !== 'recording' ? (
            <Button onClick={start}>Start recording</Button>
          ) : (
            <Button variant="danger" onClick={stop}>
              Stop
            </Button>
          )}
        </div>

        {error && (
          <p role="alert" className="font-body text-sm text-error">
            {error}
          </p>
        )}

        {recordingUrl && (
          <div className="flex flex-col gap-2 border-t border-gray-200 pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={transcribeRecording} disabled={transcribing}>
                {transcribing ? 'Transcribing…' : 'Transcribe recording (local Whisper)'}
              </Button>
              <a
                href={recordingUrl}
                download={`${title || 'meeting'}.webm`}
                className="font-body text-sm text-coral hover:underline"
              >
                ↓ Download recording
              </a>
            </div>
            {transcribing && (
              <span className="font-mono text-xs text-gray-400">{progress}</span>
            )}
            <span className="font-body text-xs text-gray-400">
              Transcribes the full recording (all voices) locally — no key, no
              upload. First run downloads the model.
            </span>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-2">
        <span className="font-body text-xs uppercase tracking-wide text-gray-400">
          Transcript (editable)
        </span>
        <textarea
          rows={12}
          value={transcript + (interim ? ` ${interim}` : '')}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="The transcript appears here as you speak…"
          className="rounded-md border border-gray-200 bg-black px-3 py-2 font-mono text-sm text-white focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral"
        />
        <span className="font-mono text-xs text-gray-400">
          {transcript.length} chars
        </span>
      </Card>

      <Card className="flex flex-col gap-3">
        <span className="font-body text-xs uppercase tracking-wide text-gray-400">
          Create project from this meeting
        </span>
        <Input
          label="Project name"
          name="title"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          onClick={createProject}
          disabled={creating || !title.trim() || !transcript.trim()}
        >
          {creating ? 'Creating…' : 'Create project & generate PRD'}
        </Button>
        <p className="font-body text-xs text-gray-400">
          The transcript becomes the project brief; you generate the PRD on the
          project page.
        </p>
      </Card>
    </div>
  );
}
