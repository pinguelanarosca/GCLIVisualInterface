import { spawn, execSync, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { GoogleGenAI } from '@google/genai';
import { CliStatus } from '../src/types.js';
import { sysLog } from './logger-service.js';

let activeChildProcess: ChildProcess | null = null;
let currentCustomCliPath: string = '';

export function getLocalCliPath(): string {
  const localBin = path.resolve(process.cwd(), 'node_modules', '.bin', 'gemini');
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  return '';
}

export function getGlobalCliPath(): string {
  try {
    const whichOut = execSync('which gemini', { encoding: 'utf-8' }).trim();
    if (whichOut && fs.existsSync(whichOut) && !whichOut.includes('node_modules')) {
      return whichOut;
    }
  } catch {}

  const commonPaths = ['/usr/local/bin/gemini', '/usr/bin/gemini', '/bin/gemini'];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return 'gemini';
}

export function queryBinaryVersion(binPath: string): Promise<string> {
  return new Promise((resolve) => {
    if (!binPath) {
      resolve('');
      return;
    }
    try {
      const child = spawn(binPath, ['--version'], {
        env: { ...process.env, NO_COLOR: '1' },
      });
      let stdout = '';
      child.stdout?.on('data', (d) => { stdout += d.toString(); });
      child.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          resolve('');
        }
      });
      child.on('error', () => resolve(''));
    } catch {
      resolve('');
    }
  });
}

let lastValidationCache: {
  timestamp: number;
  model: string;
  result: {
    configured: boolean;
    valid: boolean;
    message: string;
    modelTested?: string;
    latencyMs?: number;
  };
} | null = null;

export async function validateGeminiApiKey(
  forceFresh = false,
  targetModel = 'gemini-3.1-flash-lite'
): Promise<{
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

  // Use 30-second cache unless forced or model changed
  const now = Date.now();
  if (
    !forceFresh &&
    lastValidationCache &&
    lastValidationCache.model === targetModel &&
    now - lastValidationCache.timestamp < 30000
  ) {
    return lastValidationCache.result;
  }

  const startTime = Date.now();
  const validationModels = [
    targetModel,
    'gemini-2.5-flash-native-audio-latest',
    'antigravity-preview-05-2026'
  ];

  let lastError: any = null;
  let validatedModel = '';

  for (const model of validationModels) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Se for um agente gerenciado, precisa usar o Interactions API com parâmetro 'agent'
      if (model.includes('antigravity') || model.includes('deep-research')) {
        await ai.interactions.create({
          agent: model,
          input: 'ping',
          environment: 'remote',
        });
      } else {
        // Para modelos padrão, tentamos primeiro o Interactions API que é o mais moderno e exigido por alguns modelos novos
        try {
          await ai.interactions.create({
            model: model,
            input: 'ping',
          });
        } catch (intErr: any) {
          // Se falhar informando que o modelo NÃO suporta Interactions, tentamos o generateContent tradicional
          if (intErr.message?.includes('not supported') || intErr.message?.includes('generateContent')) {
            await ai.models.generateContent({
              model,
              contents: 'ping',
              config: {
                maxOutputTokens: 2,
                temperature: 0,
              },
            });
          } else {
            throw intErr;
          }
        }
      }

      validatedModel = model;
      break; // Success!
    } catch (err: any) {
      lastError = err;
      sysLog.warn('API', `Falha ao validar modelo ${model}: ${err.message || err}`);
    }
  }

  if (validatedModel) {
    const latencyMs = Date.now() - startTime;
    const res = {
      configured: true,
      valid: true,
      message: `Chave GEMINI_API_KEY ativa e validada com sucesso no Google Gemini API (${validatedModel}).`,
      modelTested: validatedModel,
      latencyMs,
    };
    lastValidationCache = { timestamp: now, model: targetModel, result: res };
    sysLog.success('API', `Validação da GEMINI_API_KEY bem-sucedida (${latencyMs}ms)`, { model: res.modelTested });
    return res;
  } else {
    const latencyMs = Date.now() - startTime;
    const errMsg = lastError?.message || String(lastError);
    const res = {
      configured: true,
      valid: false,
      message: `Chave presente no ambiente, mas a validação falhou em todos os modelos testados (${validationModels.join(', ')}). Último erro: ${errMsg}`,
      modelTested: targetModel,
      latencyMs,
    };
    lastValidationCache = { timestamp: now, model: targetModel, result: res };
    sysLog.warn('API', `Validação da GEMINI_API_KEY falhou em todos os modelos: ${errMsg}`, { latencyMs });
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

export async function detectCliStatus(
  forceFresh = false,
  targetModel = 'gemini-3.1-flash-lite'
): Promise<CliStatus> {
  const cliPath = getResolvedCliPath();
  const localCliPath = getLocalCliPath();
  const globalCliPath = getGlobalCliPath();

  const rawApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '';
  const authConfigured = Boolean(rawApiKey);
  let maskedApiKey = undefined;
  if (rawApiKey) {
    if (rawApiKey.length > 8) {
      maskedApiKey = `${rawApiKey.substring(0, 4)}...${rawApiKey.substring(rawApiKey.length - 4)}`;
    } else {
      maskedApiKey = '***';
    }
  }

  const [localVersion, globalVersion, apiCheck] = await Promise.all([
    queryBinaryVersion(localCliPath),
    queryBinaryVersion(globalCliPath),
    authConfigured ? validateGeminiApiKey(forceFresh, targetModel) : Promise.resolve<{
      configured: boolean;
      valid: boolean;
      message: string;
      modelTested?: string;
      latencyMs?: number;
    }>({
      configured: false,
      valid: false,
      message: 'Nenhuma GEMINI_API_KEY configurada no ambiente.',
      latencyMs: undefined,
      modelTested: undefined,
    }),
  ]);

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
          localCliPath,
          localVersion: localVersion || undefined,
          globalCliPath,
          globalVersion: globalVersion || undefined,
          connectionState: 'not_detected',
          authConfigured,
          maskedApiKey,
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
            localCliPath,
            localVersion: localVersion || undefined,
            globalCliPath,
            globalVersion: globalVersion || undefined,
            connectionState: 'connected',
            authConfigured,
            maskedApiKey,
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
            localCliPath,
            localVersion: localVersion || undefined,
            globalCliPath,
            globalVersion: globalVersion || undefined,
            connectionState: 'error',
            authConfigured,
            maskedApiKey,
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
        localCliPath,
        localVersion: localVersion || undefined,
        globalCliPath,
        globalVersion: globalVersion || undefined,
        connectionState: 'error',
        authConfigured,
        maskedApiKey,
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
  agentId?: string;
  onEvent: (event: { type: string; data: any }) => void;
  onDone: (exitCode: number | null, signal: string | null) => void;
  onError: (error: Error) => void;
}

export const AGENT_FALLBACK_CHAINS: Record<string, string[]> = {
  auditor: ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'],
  investigator: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3-flash'],
  principal: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.5-flash'],
  tester: ['gemini-3-flash', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'],
  worker: ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3-flash'],
};

export function getApiErrorCode(code: number, stderrText: string, reportedErrorText: string): number | null {
  const combined = (stderrText + ' ' + reportedErrorText).toLowerCase();
  if (combined.includes('409') || combined.includes('conflict') || combined.includes('already_exists')) {
    return 409;
  }
  if (combined.includes('429') || combined.includes('quota') || combined.includes('rate limit') || combined.includes('terminalquotaerror')) {
    return 429;
  }
  if (combined.includes('500') || combined.includes('internal error') || combined.includes('internal server error')) {
    return 500;
  }
  if (combined.includes('503') || combined.includes('unavailable') || combined.includes('service unavailable') || combined.includes('experiencing high demand')) {
    return 503;
  }
  return null;
}

export function executeGeminiCli(
  params: CliExecutionParams,
  isRetry = false,
  state?: {
    currentModel?: string;
    retryCount?: number;
    fallbackIndex?: number;
    fallbackChain?: string[];
  }
): { cancel: () => void } {
  let cliPath = getResolvedCliPath();

  let cwd = params.workDir || (params.authorizedDirs && params.authorizedDirs[0]) || process.cwd();
  if (!cwd || !fs.existsSync(cwd)) {
    cwd = process.cwd();
  }

  const shouldResume = params.sessionId ? (isExistingSession(params.sessionId) || isRetry) : false;
  let finalPrompt = params.prompt;

  // For new sessions, prepend explicit workspace and directory context so the model knows its working directory
  if (!shouldResume) {
    const workspaceHeader = `[CONTEXTO DO PROJETO E WORKSPACE]\nVocê está executando dentro do diretório do projeto: "${cwd}".\nDiretórios autorizados do projeto: ${params.authorizedDirs && params.authorizedDirs.length > 0 ? params.authorizedDirs.join(', ') : cwd}.\nSempre inspecione e responda com base nos arquivos localizados neste diretório.\n---\n\n`;
    finalPrompt = workspaceHeader + params.prompt;
  }

  const args: string[] = [
    '-p', finalPrompt,
    '-o', 'stream-json',
    '--skip-trust',
  ];

  const customPolicyPath = path.join(process.cwd(), '.gemini', 'web-preview-policy.toml');
  if (fs.existsSync(customPolicyPath)) {
    args.push('--policy', customPolicyPath);
  }

  // Determine model: respect the configured model for the agent/execution, default to 'gemini-3.5-flash-lite'
  let requestedModel = state?.currentModel || params.model;
  if (!requestedModel || requestedModel === 'auto') {
    requestedModel = 'gemini-3.5-flash-lite';
  }

  // Infer agentId if not explicitly provided
  let agentId = params.agentId?.toLowerCase() || '';
  if (!agentId && requestedModel) {
    if (requestedModel.includes('3.8')) agentId = 'auditor';
    else if (requestedModel.includes('3.7')) agentId = 'investigator';
    else if (requestedModel.includes('3.5-flash-lite')) agentId = 'principal';
    else if (requestedModel.includes('3.1-flash-lite')) agentId = 'worker';
    else if (requestedModel === 'gemini-3-flash') agentId = 'tester';
  }

  const fallbackChain = state?.fallbackChain || (AGENT_FALLBACK_CHAINS[agentId] || []);
  const retryCount = state?.retryCount || 1;
  const fallbackIndex = state?.fallbackIndex !== undefined 
    ? state.fallbackIndex 
    : (fallbackChain.indexOf(requestedModel) !== -1 ? fallbackChain.indexOf(requestedModel) : -1);

  const chosenModel = requestedModel;
  args.push('-m', chosenModel);

  if (params.approvalMode) {
    args.push('--approval-mode', params.approvalMode);
  }

  if (params.authorizedDirs && params.authorizedDirs.length > 0) {
    args.push('--include-directories', params.authorizedDirs.join(','));
  }

  if (params.sessionId) {
    if (shouldResume) {
      args.push('-r', params.sessionId);
    } else {
      args.push('--session-id', params.sessionId);
      knownSessions.add(params.sessionId);
    }
  }

  if (!cliPath || (cliPath !== 'gemini' && !fs.existsSync(cliPath))) {
    cliPath = getLocalCliPath() || getGlobalCliPath() || 'gemini';
  }

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
  sysLog.info(
    'CLI',
    `Iniciando execução Gemini CLI [Modelo: ${chosenModel}, Agente: ${agentId || 'N/D'}, Tentativa: ${retryCount}/3] (Prompt: "${params.prompt.substring(0, 50)}${params.prompt.length > 50 ? '...' : ''}")`,
    { model: chosenModel, sessionId: params.sessionId, approvalMode: params.approvalMode, cwd, agentId, retryCount }
  );

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

  child.on('error', (err: any) => {
    activeChildProcess = null;
    const isEnoent = err?.code === 'ENOENT' || err?.errno === -2;
    const errMsg = isEnoent
      ? `O executável do Gemini CLI ou o diretório de trabalho não foi encontrado no sistema (Caminho: ${cliPath}).`
      : (err?.message || 'Erro ao iniciar o processo do Gemini CLI.');

    params.onEvent({
      type: 'process_error',
      data: {
        type: 'process_error',
        exitCode: err?.errno || -2,
        stderr: err?.message || '',
        message: errMsg,
      },
    });
    params.onError(err);
  });

  child.on('close', (code, signal) => {
    // If Gemini CLI exited with code 42 due to session collision/missing session, auto-retry with correct params
    if (code === 42 && params.sessionId && !isRetry) {
      const isMissingSession = stderrText.includes('No previous sessions found') || 
                               stderrText.includes('no previous session') || 
                               stderrText.includes('not found') || 
                               stderrText.includes('Erro ao retomar a sessão');
      if (isMissingSession) {
        knownSessions.delete(params.sessionId);
        activeChildProcess = null;
        executeGeminiCli({ ...params, resume: false }, true);
        return;
      } else {
        knownSessions.add(params.sessionId);
        activeChildProcess = null;
        executeGeminiCli({ ...params, resume: true }, true);
        return;
      }
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

      const apiErrCode = getApiErrorCode(code, stderrText, reportedErrorText);

      if (apiErrCode !== null) {
        if (retryCount < 3) {
          const nextRetry = retryCount + 1;
          const backoffDelay = 1500 * retryCount;
          params.onEvent({
            type: 'stream_event',
            data: {
              type: 'message',
              role: 'assistant',
              content: `\n⚠️ *[Tentativa ${retryCount}/3] Falha com status HTTP ${apiErrCode}. Retentando no modelo ${chosenModel} em ${backoffDelay / 1000}s...*\n\n`,
            },
          });
          sysLog.warn('CLI', `Falha temporária com status ${apiErrCode} no modelo ${chosenModel}. Agendando tentativa ${nextRetry}/3 em ${backoffDelay}ms.`);
          activeChildProcess = null;
          setTimeout(() => {
            executeGeminiCli(params, true, {
              currentModel: chosenModel,
              retryCount: nextRetry,
              fallbackIndex,
              fallbackChain,
            });
          }, backoffDelay);
          return;
        } else {
          // 3 attempts have failed. Time for fallback!
          if (fallbackChain && fallbackChain.length > 0) {
            const nextIdx = fallbackIndex + 1;
            if (nextIdx < fallbackChain.length) {
              const nextModel = fallbackChain[nextIdx];
              params.onEvent({
                type: 'stream_event',
                data: {
                  type: 'message',
                  role: 'assistant',
                  content: `\n⚠️ *[Fallback de Modelo] 3 tentativas falharam no modelo ${chosenModel} (Erro ${apiErrCode}). Alternando para o modelo de fallback do agente: ${nextModel}...*\n\n`,
                },
              });
              sysLog.warn('CLI', `3 tentativas falharam no modelo ${chosenModel}. Alternando para o fallback ${nextModel} do agente ${agentId}.`);
              activeChildProcess = null;
              setTimeout(() => {
                executeGeminiCli(params, true, {
                  currentModel: nextModel,
                  retryCount: 1,
                  fallbackIndex: nextIdx,
                  fallbackChain,
                });
              }, 2000);
              return;
            }
          }
          // Exhausted all retries and fallbacks
          sysLog.error('CLI', `Todos os modelos de fallback falharam para o agente ${agentId}. Interrompendo tarefa.`);
          params.onEvent({
            type: 'stream_event',
            data: {
              type: 'message',
              role: 'assistant',
              content: `\n❌ *[Erro Crítico] Todos os modelos de fallback falharam para o agente ${agentId}. A execução foi interrompida devido à indisponibilidade persistente do serviço (Status: ${apiErrCode}).*\n\n`,
            },
          });
        }
      }

      // Default fallback catch-all if quota was exceeded on another model
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
      if (code === -2 || stderrText.includes('ENOENT')) {
        finalMessage = `O executável do Gemini CLI (${cliPath}) ou o diretório de trabalho (${cwd}) não foi localizado no sistema (Erro -2 / ENOENT).`;
      } else if (stderrText.includes('Please set an Auth method') || stderrText.includes('GEMINI_API_KEY')) {
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
          type: 'process_error',
          exitCode: code,
          stderr: stderrText,
          message: finalMessage,
        },
      });
      sysLog.error('CLI', `Gemini CLI finalizado com erro (código: ${code}): ${finalMessage.substring(0, 100)}`, { exitCode: code, stderr: stderrText.substring(0, 200) });
    } else {
      sysLog.success('CLI', `Execução do Gemini CLI concluída com sucesso (código 0).`, { sessionId: params.sessionId });
    }

    activeChildProcess = null;
    params.onDone(code, signal);
  });

  return {
    cancel: () => {
      if (child && !child.killed) {
        sysLog.warn('CLI', 'Execução cancelada via sinal SIGINT.');
        child.kill('SIGINT');
      }
    },
  };
}

export function cancelActiveExecution(): boolean {
  if (activeChildProcess && !activeChildProcess.killed) {
    sysLog.warn('CLI', 'Execução ativa do Gemini CLI cancelada pelo usuário.');
    activeChildProcess.kill('SIGINT');
    activeChildProcess = null;
    return true;
  }
  return false;
}
