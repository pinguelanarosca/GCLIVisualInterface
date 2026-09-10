/**
 * Type definitions for Gemini CLI GUI (Ubuntu Linux Local App)
 */

export type StatusGrade = 'IMPLEMENTED' | 'CONFIGURED' | 'TESTED' | 'VALIDATED' | 'NOT VALIDATED';

export interface CliStatus {
  available: boolean;
  version: string;
  cliPath: string;
  connectionState: 'connected' | 'error' | 'not_detected';
  authConfigured: boolean;
  activeSessionId?: string;
  errorMessage?: string;
  approvalMode: 'default' | 'auto_edit' | 'yolo' | 'plan';
}

export interface AgentConfig {
  id: string;
  name: string;
  displayName: string;
  role: string;
  model: string;
  description: string;
  systemInstructions: string;
  enabled: boolean;
  kind: 'local' | 'remote';
  tools: string[];
  temperature?: number;
  maxTurns?: number;
  statusGrade: StatusGrade;
}

export interface SkillConfig {
  name: string;
  description: string;
  content: string;
  enabled: boolean;
  statusGrade: StatusGrade;
}

export interface CommandConfig {
  name: string; // e.g., "/debug"
  description: string;
  promptTemplate: string;
  enabled: boolean;
  statusGrade: StatusGrade;
}

export interface McpConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  status: 'connected' | 'stopped' | 'error' | 'unknown';
  statusGrade: StatusGrade;
}

export interface HookConfig {
  id: string;
  name: string;
  event: 'pre-tool' | 'post-tool' | 'session-start' | 'session-end';
  command: string;
  enabled: boolean;
  supportedInCliVersion: boolean;
  statusGrade: StatusGrade;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  associatedDirs: string[];
  createdAt: string;
  updatedAt: string;
  activeSessionId?: string;
}

export interface AuthorizedDir {
  path: string;
  exists: boolean;
  isWritable: boolean;
  alias?: string;
  addedAt: string;
}

export interface ToolCallStep {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  result?: string;
  error?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'requires_approval';
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  agentName?: string;
  toolCalls?: ToolCallStep[];
  isStreaming?: boolean;
  error?: string;
  audioUrl?: string;
  isNarrating?: boolean;
}

export interface SessionItem {
  id: string;
  title: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages: ChatMessage[];
  statusGrade: StatusGrade;
}

export interface FileDiffItem {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked';
  diff: string;
  binary?: boolean;
}

export interface AudioSettings {
  sttEnabled: boolean;
  sttModel: string; // 'gemini-3.5-transcribe' or 'browser-native'
  ttsEnabled: boolean;
  ttsModel: string; // 'gemini-3.1-flash-tts-preview' or 'browser-native'
  ttsVoice: string; // 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'
  ttsSpeed: number; // 0.75 - 1.5
  autoPlayTts: boolean;
  filterCodeInTts: boolean;
  filterDiffsInTts: boolean;
  micStatus: 'ready' | 'recording' | 'transcribing' | 'error';
  audioModelStatus: {
    sttAvailable: boolean;
    ttsAvailable: boolean;
    liveAvailable: boolean;
    message?: string;
  };
}

export interface AppSettings {
  cliPath: string;
  approvalMode: 'default' | 'auto_edit' | 'yolo' | 'plan';
  defaultModel: string;
  streamOutput: boolean;
  permissions: {
    allowShellCommands: boolean;
    allowFileWrites: boolean;
    allowGitOperations: boolean;
    allowMcpExecution: boolean;
    allowDestructiveActions: boolean;
  };
  audio: AudioSettings;
  theme: 'dark' | 'light' | 'system';
}

export interface ValidationItem {
  item: string;
  category: 'CORE' | 'AGENTS' | 'SKILLS' | 'COMMANDS' | 'MCP' | 'HOOKS' | 'AUDIO' | 'PACKAGING';
  status: StatusGrade;
  evidence: string;
  notes: string;
}
