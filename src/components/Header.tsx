import React from 'react';
import {
  Terminal,
  FolderGit2,
  FolderCheck,
  History,
  Settings,
  Bot,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { CliStatus, ProjectItem, AgentConfig } from '../types.js';
import { DEFAULT_AGENTS } from '../constants/defaultAgents.js';

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
}) => {
  const isConnected = cliStatus?.available && cliStatus?.connectionState === 'connected';

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Brand & CLI Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">
                Gemini CLI GUI
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                {cliStatus?.version ? `v${cliStatus.version}` : 'v0.59.0'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  !isConnected
                    ? 'bg-rose-500'
                    : !cliStatus?.authConfigured
                    ? 'bg-amber-500 animate-pulse'
                    : cliStatus?.apiValid === false
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-500 animate-pulse'
                }`}
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                {!isConnected
                  ? 'CLI Indisponível'
                  : !cliStatus?.authConfigured
                  ? 'CLI Ativo (Sem Chave no Ambiente)'
                  : cliStatus?.apiValid === false
                  ? 'CLI Ativo (API Não Validada)'
                  : 'Motor CLI & API Ativos'}
                {cliStatus?.apiValid && cliStatus?.latencyMs !== undefined && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-1 py-0.2 rounded ml-0.5">
                    {cliStatus.latencyMs}ms
                  </span>
                )}
              </span>
              <button
                onClick={onRefreshStatus}
                disabled={isCheckingStatus}
                title="Recarregar status do CLI e validar API"
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ml-1 transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingStatus ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-zinc-200 dark:border-zinc-800 mx-2" />

        {/* Project Selector */}
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60">
          <FolderGit2 className="w-4 h-4 text-zinc-500 ml-1.5" />
          <select
            value={activeProject?.id || ''}
            onChange={(e) => {
              const p = projects.find((x) => x.id === e.target.value);
              if (p) onSelectProject(p);
            }}
            className="bg-transparent text-xs font-medium text-zinc-800 dark:text-zinc-200 outline-none pr-2 cursor-pointer"
          >
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                {proj.name}
              </option>
            ))}
          </select>
          <button
            onClick={onOpenProjectsModal}
            title="Gerenciar Projetos"
            className="text-[11px] px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            Gerenciar
          </button>
        </div>

        {/* Agent Selector */}
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60">
          <Bot className="w-4 h-4 text-blue-500 ml-1.5" />
          <select
            value={selectedAgentId}
            onChange={(e) => onSelectAgent(e.target.value)}
            className="bg-transparent text-xs font-medium text-zinc-800 dark:text-zinc-200 outline-none pr-2 cursor-pointer"
          >
            {(agents && agents.length > 0 ? agents : DEFAULT_AGENTS).map((agent) => (
              <option key={agent.id} value={agent.id} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                {agent.displayName || agent.name} ({agent.model})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Center Nav Views */}
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => onSelectView('chat')}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
            activeView === 'chat'
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Conversa & Terminal
        </button>
        <button
          onClick={() => onSelectView('diffs')}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
            activeView === 'diffs'
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Arquivos & Diffs Reais
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenDirsModal}
          title="Diretórios Autorizados"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-zinc-200/60 dark:border-zinc-800"
        >
          <FolderCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Diretórios</span>
        </button>

        <button
          onClick={() => onOpenSettings('logs')}
          title="Ver Logs do Sistema em Tempo Real com Data e Hora"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 transition border border-emerald-200/70 dark:border-emerald-800/60"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          <span>Logs</span>
        </button>

        <button
          onClick={onOpenHistory}
          title="Histórico de Sessões"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-zinc-200/60 dark:border-zinc-800"
        >
          <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Histórico</span>
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
