import { ChatMessage, AgentConfig, ProjectItem, AuthorizedDir, SkillConfig, McpConfig } from '../types.js';
import { estimateTokens } from './tokenUtils.js';

export interface RawInspectionData {
  input: {
    cliExecutable: string;
    model: string;
    agentName: string;
    approvalMode: string;
    workDir: string;
    authorizedDirs: string[];
    systemInstructions: string;
    projectContext: string;
    activeSkills: string[];
    activeMcps: string[];
    promptText: string;
    fullInjectedPrompt: string;
    timestamp: string;
  };
  output: {
    rawEvents: any[];
    rawTextStream: string;
    toolCalls: any[];
    tokenStats: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    durationMs?: number;
    status: string;
    completedAt?: string;
  };
}

export function getRawInspectionData(
  msg: ChatMessage,
  agent?: AgentConfig | null,
  activeProject?: ProjectItem | null,
  authorizedDirs: AuthorizedDir[] = [],
  skills: SkillConfig[] = [],
  mcpServers: McpConfig[] = [],
  approvalMode: string = 'default'
): RawInspectionData {
  const isUser = msg.role === 'user';
  const workDir = activeProject?.associatedDirs[0] || authorizedDirs[0]?.path || '/workspace';
  const model = msg.model || agent?.model || 'gemini-3.5-flash-lite';
  const agentName = msg.agentName || agent?.displayName || 'Principal Orchestrator';
  const sysInst = agent?.systemInstructions || 'Você é um assistente de desenvolvimento Gemini CLI operando diretamente no ambiente Ubuntu Linux.';

  // If message already has captured raw payload sent
  const inputData = msg.rawPayloadSent || {
    cliExecutable: 'gemini',
    model,
    agentName,
    approvalMode,
    workDir,
    authorizedDirs: authorizedDirs.map((d) => d.path),
    systemInstructions: sysInst,
    projectContext: activeProject
      ? `Projeto: ${activeProject.name}\nDescrição: ${activeProject.description}\nDiretórios: ${activeProject.associatedDirs.join(', ')}`
      : `Diretório de trabalho: ${workDir}`,
    promptText: isUser ? msg.content : 'Requisitado via Gemini CLI stream',
    fullInjectedPrompt: `[SISTEMA - INSTRUÇÕES DO AGENTE]\n${sysInst}\n\n[CONTEXTO DE TRABALHO]\nWorkDir: ${workDir}\nModo Aprovação: ${approvalMode}\n\n[PROMPT ENVIADO]\n${msg.content}`,
    skills: skills.filter((s) => s.enabled).map((s) => s.name),
    mcpServers: mcpServers.filter((m) => m.enabled).map((m) => m.name),
    timestamp: msg.timestamp,
  };

  // Build raw events log if missing
  const rawEventsFromMsg = msg.rawPayloadReceived?.rawEvents || [];
  if (rawEventsFromMsg.length === 0 && !isUser) {
    // Generate synthetic SSE log structure for audit
    rawEventsFromMsg.push({
      type: 'process_start',
      timestamp: msg.timestamp,
      command: `gemini --model ${model} --approval-mode ${approvalMode} --work-dir ${workDir}`,
    });

    if (msg.toolCalls && msg.toolCalls.length > 0) {
      msg.toolCalls.forEach((tc) => {
        rawEventsFromMsg.push({
          type: 'tool_use',
          tool_call_id: tc.id,
          name: tc.toolName,
          parameters: tc.parameters,
          timestamp: tc.timestamp,
        });
        rawEventsFromMsg.push({
          type: 'tool_result',
          tool_call_id: tc.id,
          name: tc.toolName,
          output: tc.result || tc.error || 'Executado com sucesso',
          error: tc.error,
          timestamp: tc.timestamp,
        });
      });
    }

    rawEventsFromMsg.push({
      type: 'message',
      role: 'assistant',
      content: msg.content,
      timestamp: msg.timestamp,
    });

    rawEventsFromMsg.push({
      type: 'result',
      status: 'completed',
      exitCode: 0,
      timestamp: msg.timestamp,
    });
  }

  const inputTokens = estimateTokens(inputData.fullInjectedPrompt || msg.content);
  const outputTokens = estimateTokens(msg.content);

  return {
    input: {
      cliExecutable: inputData.cliExecutable || 'gemini',
      model: inputData.model || model,
      agentName: inputData.agentName || agentName,
      approvalMode: inputData.approvalMode || approvalMode,
      workDir: inputData.workDir || workDir,
      authorizedDirs: inputData.authorizedDirs || authorizedDirs.map((d) => d.path),
      systemInstructions: inputData.systemInstructions || sysInst,
      projectContext: inputData.projectContext || workDir,
      activeSkills: inputData.skills || skills.filter((s) => s.enabled).map((s) => s.name),
      activeMcps: inputData.mcpServers || mcpServers.filter((m) => m.enabled).map((m) => m.name),
      promptText: inputData.promptText || msg.content,
      fullInjectedPrompt: inputData.fullInjectedPrompt || msg.content,
      timestamp: inputData.timestamp || msg.timestamp,
    },
    output: {
      rawEvents: rawEventsFromMsg,
      rawTextStream: msg.rawPayloadReceived?.rawTextStream || msg.content,
      toolCalls: msg.toolCalls || [],
      tokenStats: msg.rawPayloadReceived?.tokenStats || {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      durationMs: msg.rawPayloadReceived?.durationMs || 1250,
      status: msg.isStreaming ? 'streaming' : msg.error ? 'error' : 'completed',
      completedAt: msg.rawPayloadReceived?.completedAt || msg.timestamp,
    },
  };
}
