import React from 'react';
import {
  Terminal,
  Settings,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { CliStatus, ProjectItem, AgentConfig, ChatMessage, AuthorizedDir, SkillConfig, McpConfig } from '../types.js';
import { TokenMonitorBar } from './TokenMonitorBar.js';

interface HeaderProps {
  cliStatus: CliStatus | null;
  projects: ProjectItem[];
  activeProject: ProjectItem | null;
  onSelectProject: (proj: ProjectItem) => void;
  onOpenProjectsModal: () => void;
  agents: AgentConfig[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  activeView: 'chat' | 'diffs';
  onSelectView: (view: 'chat' | 'diffs') => void;
  onOpenDirsModal: () => void;
  onOpenHistory: () => void;
  onOpenSettings: (tab?: string) => void;
  autoPlayTts: boolean;
  onToggleAutoPlayTts: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onRefreshStatus: () => void;
  isCheckingStatus: boolean;
  messages?: ChatMessage[];
  isStreaming?: boolean;
  authorizedDirs?: AuthorizedDir[];
  skills?: SkillConfig[];
  mcpServers?: McpConfig[];
  metrics?: { rpm: number; tpm: number; rpd: number };
}

export const Header: React.FC<HeaderProps> = ({
  cliStatus,
  projects,
  activeProject,
  onSelectProject,
  onOpenProjectsModal,
  agents,
  selectedAgentId,
  onSelectAgent,
  activeView,
  onSelectView,
  onOpenDirsModal,
  onOpenHistory,
  onOpenSettings,
  autoPlayTts,
  onToggleAutoPlayTts,
  theme,
  onToggleTheme,
  onRefreshStatus,
  isCheckingStatus,
  messages = [],
  isStreaming = false,
  authorizedDirs = [],
  skills = [],
  mcpServers = [],
  metrics = { rpm: 1, tpm: 0, rpd: 1 },
}) => {
  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 flex items-center justify-between relative z-20 shrink-0 select-none">
      {/* Brand & CLI Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">
                GeminiCLI By Satiro
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                {cliStatus?.version ? `v${cliStatus.version}` : '...'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                  isCheckingStatus
                    ? 'bg-blue-500 animate-pulse'
                    : !cliStatus?.authConfigured
                    ? 'bg-rose-500'
                    : cliStatus?.apiValid === false
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-500 shadow-sm shadow-emerald-500/40'
                }`}
              />
              <div
                className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-1 cursor-pointer hover:underline"
                onClick={() => onOpenSettings('cli')}
                title={
                  cliStatus?.apiError
                    ? `Erro na API: ${cliStatus.apiError}`
                    : cliStatus?.apiValid
                    ? `API conectada com sucesso (${cliStatus.modelTested || 'gemini-3.1-flash-lite'})`
                    : 'Clique para abrir configurações da API'
                }
              >
                {isCheckingStatus ? (
                  <span className="text-zinc-400">Sincronizando...</span>
                ) : !cliStatus?.authConfigured ? (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">Sem Chave API</span>
                ) : cliStatus?.apiValid === false ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {cliStatus.apiError?.includes('429') || cliStatus.apiError?.includes('quota') || cliStatus.apiError?.includes('RESOURCE_EXHAUSTED')
                      ? 'API: Cota Excedida (429)'
                      : 'API com Aviso/Erro'}
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    API Ativa
                  </span>
                )}

                {cliStatus?.apiValid && cliStatus?.latencyMs !== undefined && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50/10 px-1 py-0.2 rounded ml-0.5">
                    {cliStatus.latencyMs}ms
                  </span>
                )}
              </div>

              <button
                onClick={onRefreshStatus}
                disabled={isCheckingStatus}
                title="Sincronizar e revalidar conexão com a API Gemini"
                className="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 ml-1 transition cursor-pointer p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin text-blue-500' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Center Nav Views (Perfectly Centered) */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => onSelectView('chat')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeView === 'chat'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Conversa & Terminal
          </button>
          <button
            onClick={() => onSelectView('diffs')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeView === 'diffs'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Arquivos & Diffs
          </button>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onOpenSettings('logs')}
          title="Ver Logs do Sistema em Tempo Real com Data e Hora"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 transition border border-emerald-200/70 dark:border-emerald-800/60"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          <span>Logs</span>
        </button>

        <button
          onClick={onToggleAutoPlayTts}
          title={autoPlayTts ? 'Auto-narração TTS Ativa' : 'Auto-narração TTS Desativada'}
          className={`p-2 rounded-lg transition border border-zinc-200/60 dark:border-zinc-800 ${
            autoPlayTts
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
              : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {autoPlayTts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          onClick={onToggleTheme}
          title="Alternar Tema Claro/Escuro"
          className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-zinc-200/60 dark:border-zinc-800"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
        </button>

        <button
          onClick={() => onOpenSettings()}
          title="Configurações (CLI, Agentes, Skills, MCP, Empacotamento)"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition shadow-sm"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configurações</span>
        </button>
      </div>
    </header>
  );
};
