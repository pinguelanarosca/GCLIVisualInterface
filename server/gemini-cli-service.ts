import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { CliStatus } from '../src/types.js';

let activeChildProcess: ChildProcess | null = null;
let currentCustomCliPath: string = '';

export function getResolvedCliPath(): string {
  if (currentCustomCliPath && fs.existsSync(currentCustomCliPath)) {
    return currentCustomCliPath;
  }
  // Try local node_modules/.bin/gemini
  const localBin = path.resolve(process.cwd(), 'node_modules', '.bin', 'gemini');
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  // Fallback to system 'gemini'
  return 'gemini';
}

export function setCustomCliPath(newPath: string) {
  currentCustomCliPath = newPath;
}

export async function detectCliStatus(): Promise<CliStatus> {
  const cliPath = getResolvedCliPath();
  const authConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY);

  return new Promise((resolve) => {
    try {
      const child = spawn(cliPath, ['--version'], {
        env: { ...process.env, NO_COLOR: '1' },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        resolve({
          available: false,
          version: 'Não detectado',
          cliPath,
          connectionState: 'not_detected',
          authConfigured,
          approvalMode: 'default',
          errorMessage: `Erro ao executar binário: ${err.message}`,
        });
      });

      child.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          resolve({
            available: true,
            version: stdout.trim(),
            cliPath,
            connectionState: 'connected',
            authConfigured,
            approvalMode: 'default',
          });
        } else {
          resolve({
            available: false,
            version: 'Indisponível',
            cliPath,
            connectionState: 'error',
            authConfigured,
            approvalMode: 'default',
            errorMessage: stderr.trim() || `Processo saiu com código ${code}`,
          });
        }
      });
    } catch (err: any) {
      resolve({
        available: false,
        version: 'Falha',
        cliPath,
        connectionState: 'error',
        authConfigured,
        approvalMode: 'default',
        errorMessage: err.message,
      });
    }
  });
}

export interface CliExecutionParams {
  prompt: string;
  model?: string;
  approvalMode?: 'default' | 'auto_edit' | 'yolo' | 'plan';
  authorizedDirs?: string[];
  sessionId?: string;
  workDir?: string;
  onEvent: (event: { type: string; data: any }) => void;
  onDone: (exitCode: number | null, signal: string | null) => void;
  onError: (error: Error) => void;
}

export function executeGeminiCli(params: CliExecutionParams): { cancel: () => void } {
  const cliPath = getResolvedCliPath();
  const args: string[] = [
    '-p', params.prompt,
    '-o', 'stream-json',
    '--skip-trust',
  ];

  if (params.model && params.model !== 'auto') {
    args.push('-m', params.model);
  }

  if (params.approvalMode) {
    args.push('--approval-mode', params.approvalMode);
  }

  if (params.authorizedDirs && params.authorizedDirs.length > 0) {
    args.push('--include-directories', params.authorizedDirs.join(','));
  }

  if (params.sessionId) {
    args.push('--session-id', params.sessionId);
  }

  const cwd = params.workDir || (params.authorizedDirs && params.authorizedDirs[0]) || process.cwd();

  const env = {
    ...process.env,
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    GEMINI_CLI_TRUST_WORKSPACE: 'true',
  };

  const child = spawn(cliPath, args, {
    cwd,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  activeChildProcess = child;

  let buffer = '';

  child.stdout?.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          params.onEvent({ type: 'stream_event', data: parsed });
          continue;
        } catch {
          // Fall through to raw chunk if not valid JSON
        }
      }
      params.onEvent({ type: 'stdout_raw', data: { text: trimmed } });
    }
  });

  child.stderr?.on('data', (chunk) => {
    const raw = chunk.toString();
    params.onEvent({ type: 'stderr_raw', data: { text: raw } });
  });

  child.on('error', (err) => {
    activeChildProcess = null;
    params.onError(err);
  });

  child.on('close', (code, signal) => {
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        params.onEvent({ type: 'stream_event', data: parsed });
      } catch {
        params.onEvent({ type: 'stdout_raw', data: { text: buffer.trim() } });
      }
    }
    activeChildProcess = null;
    params.onDone(code, signal);
  });

  return {
    cancel: () => {
      if (child && !child.killed) {
        child.kill('SIGINT');
      }
    },
  };
}

export function cancelActiveExecution(): boolean {
  if (activeChildProcess && !activeChildProcess.killed) {
    activeChildProcess.kill('SIGINT');
    activeChildProcess = null;
    return true;
  }
  return false;
}
