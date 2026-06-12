import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// SERVER-ONLY. Designed for the locally-run tool: it clones a GitHub repo to a
// temp dir, or reads a local absolute path the operator provides.

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'out', 'coverage',
  '.venv', 'venv', '__pycache__', '.turbo', 'vendor', 'target', '.cache',
  '.vercel', '.idea', '.svelte-kit', '.parcel-cache',
]);
const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java',
  '.rb', '.php', '.css', '.scss', '.html', '.json', '.md', '.txt', '.yml',
  '.yaml', '.toml', '.sql', '.sh', '.vue', '.svelte', '.c', '.cpp', '.h', '.kt',
]);
const KEY_FILES = [
  'README.md', 'readme.md', 'package.json', 'pyproject.toml',
  'requirements.txt', 'tsconfig.json', 'next.config.ts', 'next.config.js',
  'go.mod', 'Cargo.toml', 'Gemfile', 'composer.json', 'Dockerfile',
];

const MAX_FILE_BYTES = 100_000;
const MAX_DIGEST_CHARS = 120_000;
const MAX_FILES_IN_TREE = 2000;

export interface IngestResult {
  source: string;
  ref: string;
  digest: string;
  fileCount: number;
  truncated: boolean;
  docs: { prd?: string; spec?: string; tasks?: string };
}

export async function ingestCodebase(input: {
  kind: 'github' | 'local';
  value: string;
}): Promise<IngestResult> {
  let rootDir: string;
  let source: string;
  let ref = '';
  let cleanup: (() => Promise<void>) | null = null;

  if (input.kind === 'github') {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rootui-ingest-'));
    await execFileAsync('git', ['clone', '--depth', '1', input.value, tmp], {
      timeout: 120_000,
    });
    rootDir = tmp;
    source = `github:${input.value}`;
    try {
      const { stdout } = await execFileAsync('git', ['-C', tmp, 'rev-parse', 'HEAD']);
      ref = stdout.trim().slice(0, 12);
    } catch {
      // shallow clone without rev-parse — ignore
    }
    cleanup = async () => {
      await fs.rm(tmp, { recursive: true, force: true });
    };
  } else {
    const abs = path.resolve(input.value);
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat?.isDirectory()) {
      throw new Error('Local path not found or not a directory');
    }
    rootDir = abs;
    source = `local:${abs}`;
    ref = abs;
  }

  try {
    return await buildDigest(rootDir, source, ref);
  } finally {
    if (cleanup) await cleanup();
  }
}

async function walk(dir: string, root: string, files: string[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      await walk(path.join(dir, e.name), root, files);
    } else if (e.isFile()) {
      files.push(path.relative(root, path.join(dir, e.name)));
    }
  }
}

function classifyDoc(rel: string): 'prd' | 'spec' | 'tasks' | null {
  const base = path.basename(rel).toLowerCase();
  if (!base.endsWith('.md')) return null;
  if (base.includes('tech-spec') || base === 'spec.md') return 'spec';
  if (base === 'prd.md' || base.includes('prd')) return 'prd';
  if (base === 'tasks.md' || base.includes('tasks')) return 'tasks';
  return null;
}

async function buildDigest(
  rootDir: string,
  source: string,
  ref: string
): Promise<IngestResult> {
  const files: string[] = [];
  await walk(rootDir, rootDir, files);
  files.sort();
  const fileCount = files.length;

  // Look for importable root_ docs.
  const docs: IngestResult['docs'] = {};
  for (const rel of files) {
    const kind = classifyDoc(rel);
    if (kind && !docs[kind]) {
      try {
        const st = await fs.stat(path.join(rootDir, rel));
        if (st.size <= 500_000) {
          docs[kind] = await fs.readFile(path.join(rootDir, rel), 'utf-8');
        }
      } catch {
        // unreadable — skip
      }
    }
  }

  const treeFiles = files.slice(0, MAX_FILES_IN_TREE);
  let truncated = fileCount > MAX_FILES_IN_TREE;
  let digest =
    `# Codebase: ${source}\n\nFile tree (${fileCount} files` +
    `${truncated ? ', truncated' : ''}):\n\n${treeFiles.join('\n')}\n\n# Key files\n`;

  const isText = (f: string) =>
    TEXT_EXT.has(path.extname(f)) || KEY_FILES.includes(path.basename(f));
  const included = files.filter(isText).sort((a, b) => {
    const ak = KEY_FILES.includes(path.basename(a)) ? 0 : 1;
    const bk = KEY_FILES.includes(path.basename(b)) ? 0 : 1;
    return ak - bk || a.length - b.length;
  });

  for (const rel of included) {
    if (digest.length >= MAX_DIGEST_CHARS) {
      truncated = true;
      break;
    }
    try {
      const full = path.join(rootDir, rel);
      const st = await fs.stat(full);
      if (st.size > MAX_FILE_BYTES) continue;
      const content = await fs.readFile(full, 'utf-8');
      const block = `\n\n## ${rel}\n\`\`\`\n${content}\n\`\`\`\n`;
      if (digest.length + block.length > MAX_DIGEST_CHARS) {
        truncated = true;
        continue;
      }
      digest += block;
    } catch {
      // unreadable / binary — skip
    }
  }

  return { source, ref, digest, fileCount, truncated, docs };
}
