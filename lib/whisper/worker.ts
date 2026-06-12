/// <reference lib="webworker" />
import { pipeline, env } from '@huggingface/transformers';

// Always fetch the model from the Hugging Face CDN (no local model files).
env.allowLocalModels = false;

type Transcriber = (
  audio: Float32Array,
  options: Record<string, unknown>
) => Promise<{ text: string }>;

let transcriber: Transcriber | null = null;

self.addEventListener('message', async (event: MessageEvent) => {
  const { audio, language } = event.data as {
    audio: Float32Array;
    language: string;
  };

  try {
    if (!transcriber) {
      transcriber = (await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny',
        {
          // fp32 = no quantization at all, so the q4/NBits "missing scale"
          // crash in the WASM runtime cannot happen. whisper-tiny keeps the
          // (one-time) download small.
          dtype: 'fp32',
          device: 'wasm',
          progress_callback: (p: unknown) =>
            self.postMessage({ type: 'progress', data: p }),
        }
      )) as unknown as Transcriber;
    }

    const output = await transcriber(audio, {
      language,
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    self.postMessage({ type: 'done', text: output.text });
  } catch (e) {
    self.postMessage({
      type: 'error',
      message: e instanceof Error ? e.message : 'Transcription failed',
    });
  }
});
