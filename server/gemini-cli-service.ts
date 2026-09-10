import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { GoogleGenAI } from '@google/genai';
import { CliStatus } from '../src/types.js';

let activeChildProcess: ChildProcess | null = null;
let currentCustomCliPath: string = '';

let lastValidationCache: {
  timestamp: number;
  result: {
    configured: boolean;
    valid: boolean;
    message: string;
    modelTested?: string;
    latencyMs?: number;
  };
} | null = null;

export async function validateGeminiApiKey(forceFresh = false): Promise<{
  configured: boolean;
  valid: boolean;
  message: string;
  modelTested?: string;
  latencyMs?: number;
}> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      valid: false,
      message: 'A variável de ambiente GEMINI_API_KEY não foi encontrada.',
    };
  }

  // Use 30-second cache unless forced
  const now = Date.now();
  if (!forceFresh && lastValidationCache && (now - lastValidationCache.timestamp < 30000)) {
    return lastValidationCache.result;
  }

  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Real ping call to verify key authenticity and operational state
    await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: 'ping',
      config: {
        maxOutputTokens: 2,
        temperature: 0,
      },
    });

    const latencyMs = Date.now() - startTime;
    const res = {
      configured: true,
      valid: true,
      message: 'Chave GEMINI_API_KEY ativa e validada com sucesso no Google Gemini API.',
      modelTested: 'gemini-flash-latest',
      latencyMs,
    };
    lastValidationCache = { timestamp: now, result: res };
    return res;
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errMsg = err?.message || String(err);
    const res = {
      configured: true,
      valid: false,
      message: `Chave presente no ambiente, mas a validação com a API retornou: ${errMsg}`,
      latencyMs,
    };
    lastValidationCache = { timestamp: now, result: res };
    return res;
  }
}

const knownSessions = new Set<string>();

export function isExistingSession(sessionId?: string): boolean {
  if (!sessionId) return false;
  if (knownSessions.has(sessionId)) return true;

  try {
    const homedir = os.homedir();
    const geminiTmp = path.join(homedir, '.gemini', 'tmp');
    if (fs.existsSync(geminiTmp)) {
      const checkDir = (dir: string, depth = 0): boolean => {
        if (depth > 5) return false;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (checkDir(fullPath, depth + 1)) return true;
          } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
            try {
              const fd = fs.openSync(fullPath, 'r');
              const buf = Buffer.alloc(300);
              const bytesRead = fs.readSync(fd, buf, 0, 300, 0);
              fs.closeSync(fd);
              const header = buf.toString('utf8', 0, bytesRead);
              if (header.includes(`"sessionId":"${sessionId}"`)) {
                knownSessions.add(sessionId);
                return true;
              }
            } catch {
              // Ignore reading errors
            }
          }
        }
        return false;
      };
      return checkDir(geminiTmp);
    }
  } catch {
    // Ignore error
  }
  return false;
}

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
  const apiCheck = authConfigured ? await validateGeminiApiKey() : {
    configured: false,
    valid: false,
    message: 'Nenhuma GEMINI_API_KEY configurada no ambiente.',
  };

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
          apiValid: apiCheck.valid,
          apiChecked: true,
          apiError: !apiCheck.valid ? apiCheck.message : undefined,
          latencyMs: apiCheck.latencyMs,
          modelTested: apiCheck.modelTested,
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
            apiValid: apiCheck.valid,
            apiChecked: true,
            apiError: !apiCheck.valid ? apiCheck.message : undefined,
            latencyMs: apiCheck.latencyMs,
            modelTested: apiCheck.modelTested,
            approvalMode: 'default',
            errorMessage: !authConfigured ? 'Atenção: Nenhuma GEMINI_API_KEY detectada no ambiente.' : undefined,
          });
        } else {
          resolve({
            available: false,
            version: 'Indisponível',
            cliPath,
            connectionState: 'error',
            authConfigured,
            apiValid: apiCheck.valid,
            apiChecked: true,
            apiError: !apiCheck.valid ? apiCheck.message : undefined,
            latencyMs: apiCheck.latencyMs,
            modelTested: apiCheck.modelTested,
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
        apiValid: apiCheck.valid,
        apiChecked: true,
        apiError: !apiCheck.valid ? apiCheck.message : undefined,
        latencyMs: apiCheck.latencyMs,
        modelTested: apiCheck.modelTested,
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
  resume?: boolean;
  workDir?: string;
  onEvent: (event: { type: string; data: any }) => void;
  onDone: (exitCode: number | null, signal: string | null) => void;
  onError: (error: Error) => void;
}

export function executeGeminiCli(params: CliExecutionParams, isRetry = false): { cancel: () => void } {
  const cliPath = getResolvedCliPath();
  const args: string[] = [
    '-p', params.prompt,
    '-o', 'stream-json',
    '--skip-trust',
  ];

  // Determine model: respect the configured model for the agent/execution, default to 'gemini-3.5-flash-lite'
  let chosenModel = params.model;
  if (!chosenModel || chosenModel === 'auto') {
    chosenModel = 'gemini-3.5-flash-lite';
  }
  args.push('-m', chosenModel);

  if (params.approvalMode) {
    args.push('--approval-mode', params.approvalMode);
  }

  if (params.authorizedDirs && params.authorizedDirs.length > 0) {
    args.push('--include-directories', params.authorizedDirs.join(','));
  }

  if (params.sessionId) {
    const shouldResume = params.resume || isRetry || isExistingSession(params.sessionId);
    if (shouldResume) {
      args.push('-r', params.sessionId);
    } else {
      args.push('--session-id', params.sessionId);
      knownSessions.add(params.sessionId);
    }
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
  let stderrText = '';
  let reportedErrorText = '';

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
          if (parsed.type === 'result' && parsed.status === 'error') {
            reportedErrorText = parsed.error?.message || 'Erro de execução reportado pelo Gemini CLI.';
            params.onEvent({
              type: 'process_error',
              data: {
                message: reportedErrorText,
                error: parsed.error,
              },
            });
          }
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
    stderrText += raw;
    params.onEvent({ type: 'stderr_raw', data: { text: raw } });
  });

  child.on('error', (err) => {
    activeChildProcess = null;
    params.onError(err);
  });

  child.on('close', (code, signal) => {
    // If Gemini CLI exited with code 42 due to session collision, auto-retry with resume
    if (
      code === 42 &&
      (stderrText.includes('already exists') || stderrText.includes('--resume') || stderrText.includes('Session ID')) &&
      params.sessionId &&
      !isRetry
    ) {
      knownSessions.add(params.sessionId);
      activeChildProcess = null;
      executeGeminiCli({ ...params, resume: true }, true);
      return;
    }

    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        if (parsed.type === 'result' && parsed.status === 'error') {
          reportedErrorText = parsed.error?.message || reportedErrorText;
        }
        params.onEvent({ type: 'stream_event', data: parsed });
      } catch {
        params.onEvent({ type: 'stdout_raw', data: { text: buffer.trim() } });
      }
    }

    if (code !== 0 && code !== null) {
      const isQuotaError =
        stderrText.includes('TerminalQuotaError') ||
        stderrText.includes('Quota exceeded') ||
        stderrText.includes('429') ||
        reportedErrorText.toLowerCase().includes('quota') ||
        reportedErrorText.includes('429');

      // If quota was exceeded on another model, attempt auto-fallback to gemini-3.5-flash-lite
      if (isQuotaError && !isRetry && chosenModel !== 'gemini-3.5-flash-lite') {
        params.onEvent({
          type: 'stream_event',
          data: {
            type: 'message',
            role: 'assistant',
            content: '⚠️ *Limite gratuito do modelo atingido. Alternando automaticamente para Gemini 3.5 Flash-Lite para continuar sua solicitação...*\n\n',
          },
        });
        activeChildProcess = null;
        executeGeminiCli({ ...params, model: 'gemini-3.5-flash-lite', resume: true }, true);
        return;
      }

      let finalMessage = reportedErrorText || stderrText.trim();
      if (stderrText.includes('Please set an Auth method') || stderrText.includes('GEMINI_API_KEY')) {
        finalMessage = 'A chave de API do Gemini (GEMINI_API_KEY) não está configurada no seu ambiente. Configure-a no menu de Configurações da GUI ou exporte a variável no terminal.';
      } else if (isQuotaError) {
        const retryMatch = (stderrText + ' ' + reportedErrorText).match(/Please retry in ([0-9.]+s?)/i);
        const retryTime = retryMatch ? ` em aproximadamente ${retryMatch[1]}` : ' em alguns instantes';
        finalMessage = `⚠️ Cota da API do Gemini Excedida (Erro 429):
Você atingiu o limite gratuito de requisições da sua conta para o modelo atual.
• Tente novamente${retryTime}.
• Recomendação: utilize o modelo "Gemini 3.5 Flash-Lite" no seletor de agentes para maior velocidade e limites de requisição.
• Você também pode configurar sua chave de API própria no menu de Configurações ou em https://aistudio.google.com.`;
      } else if (!finalMessage) {
        finalMessage = `O Gemini CLI encerrou com código de erro ${code}.`;
      }

      params.onEvent({
        type: 'process_error',
        data: {
          exitCode: code,
          stderr: stderrText,
          message: finalMessage,
        },
      });
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
