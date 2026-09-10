import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  FolderGit2,
  ChevronLeft,
  ChevronRight,
  Zap,
  FolderPlus,
  Sparkles,
  Terminal,
  Settings,
} from 'lucide-react';
import { SessionItem, ProjectItem } from '../types.js';
import { calculateSessionTokens, formatTokenCount } from '../utils/tokenUtils.js';

interface LeftSidebarProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  sessions: SessionItem[];
  currentSessionId: string;
  onSelectSession: (session: SessionItem) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  projects: ProjectItem[];
  activeProject: ProjectItem | null;
  onSelectProject: (proj: ProjectItem) => void;
  onOpenProjectsModal: () => void;
  onOpenSettings: (tab?: string) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isExpanded,
  onToggleExpand,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  projects,
  activeProject,
  onSelectProject,
  onOpenProjectsModal,
  onOpenSettings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const titleMatch = (s.title || '').toLowerCase().includes(term);
    const msgMatch = s.messages?.some((m) => m.content.toLowerCase().includes(term));
    return titleMatch || msgMatch;
  });

  return (
    <aside
      className={`h-full bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-300 z-20 shrink-0 text-zinc-300 select-none ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Sidebar Header & Brand */}
      <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
        {isExpanded ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-zinc-100 text-xs tracking-tight truncate">
                Gemini CLI Studio
              </span>
              <span className="text-[10px] text-zinc-400 font-mono truncate">
                AI Coding Agent
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
        )}

        <button
          onClick={onToggleExpand}
          title={isExpanded ? 'Recolher Barra Lateral' : 'Expandir Barra Lateral'}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
        >
          {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Action: Novo Chat */}
      <div className="p-3 shrink-0">
        <button
          onClick={onNewSession}
          title="Iniciar Nova Conversa (Novo Chat)"
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md transition transform active:scale-95 cursor-pointer ${
            !isExpanded ? 'px-0' : ''
          }`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {isExpanded && <span>Novo Chat</span>}
        </button>
      </div>

      {/* Projects Section */}
      {isExpanded && (
        <div className="px-3 py-2 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center justify-between mb-1.5 text-[10px] uppercase font-mono text-zinc-400 font-semibold tracking-wider">
            <span className="flex items-center gap-1">
              <FolderGit2 className="w-3 h-3 text-blue-400" />
              Projetos
            </span>
            <button
              onClick={onOpenProjectsModal}
              title="Gerenciar Projetos"
              className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
            >
              + Gerenciar
            </button>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-1.5 border border-zinc-700/50">
            <select
              value={activeProject?.id || ''}
              onChange={(e) => {
                const p = projects.find((x) => x.id === e.target.value);
                if (p) onSelectProject(p);
              }}
              className="w-full bg-transparent text-xs font-medium text-zinc-200 outline-none cursor-pointer"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id} className="bg-zinc-900 text-zinc-200">
                  📁 {proj.name}
                </option>
              ))}
            </select>
            {activeProject?.associatedDirs?.[0] && (
              <div
                onClick={onOpenProjectsModal}
                title={`Diretório ativo: ${activeProject.associatedDirs[0]}`}
                className="text-[10px] font-mono text-zinc-400 truncate mt-1 px-1 cursor-pointer hover:text-blue-400"
              >
                {activeProject.associatedDirs[0]}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History & Chats Section */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {isExpanded && (
          <div className="px-1 mb-2 space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase font-mono text-zinc-400 font-semibold tracking-wider">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                Histórico de Chats
              </span>
              <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-sans">
                {sessions.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar conversas..."
                className="w-full bg-zinc-800/80 text-xs text-zinc-200 pl-8 pr-2 py-1.5 rounded-lg border border-zinc-700/60 placeholder-zinc-500 outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>
        )}

        {/* Sessions list */}
        {filteredSessions.length === 0 ? (
          isExpanded ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              <MessageSquare className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
              Nenhum chat encontrado.
            </div>
          ) : null
        ) : (
          filteredSessions.map((sess) => {
            const isActive = sess.id === currentSessionId;
            const tokenStats = calculateSessionTokens(sess.messages || []);
            const totalTokens = sess.tokenStats?.totalTokens || tokenStats.totalTokens;

            if (!isExpanded) {
              return (
                <button
                  key={sess.id}
                  onClick={() => onSelectSession(sess)}
                  title={`${sess.title || 'Conversa'} (${formatTokenCount(totalTokens)} tokens)`}
                  className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              );
            }

            return (
              <div
                key={sess.id}
                className={`group relative flex items-center justify-between p-2 rounded-xl transition cursor-pointer border ${
                  isActive
                    ? 'bg-blue-900/30 border-blue-500/50 text-white'
                    : 'bg-zinc-900/50 border-transparent hover:bg-zinc-800/80 text-zinc-300'
                }`}
                onClick={() => onSelectSession(sess)}
              >
                <div className="flex items-start gap-2 min-w-0 flex-1 pr-1">
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                      isActive ? 'text-blue-400' : 'text-zinc-500'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">
                      {sess.title || 'Nova Conversa'}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500 font-mono">
                      <span>{sess.messages?.length || 0} msgs</span>
                      <span>•</span>
                      <span className="flex items-center text-amber-400 font-semibold">
                        <Zap className="w-2.5 h-2.5 mr-0.5" />
                        {formatTokenCount(totalTokens)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Deseja excluir esta conversa?')) {
                      onDeleteSession(sess.id);
                    }
                  }}
                  title="Excluir Chat"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-900/50 text-zinc-400 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-2 border-t border-zinc-800 shrink-0">
        <button
          onClick={() => onOpenSettings('context')}
          title="Configurações de Contexto & Tokens"
          className={`w-full flex items-center justify-center gap-2 py-2 px-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition ${
            !isExpanded ? 'px-0' : ''
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          {isExpanded && <span>Contexto & Tokens</span>}
        </button>
      </div>
    </aside>
  );
};
