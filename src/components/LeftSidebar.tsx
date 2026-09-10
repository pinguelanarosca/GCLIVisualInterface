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
  Sparkles,
  Terminal,
  MoreVertical,
  Archive,
  History,
  FolderCheck,
  CheckSquare,
  Square,
  X,
  FileCheck2,
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

  // New features
  onOpenDirsModal: () => void;
  onOpenHistory: () => void;
  onOpenArchivedChats: () => void;
  onUpdateSession: (id: string, updates: Partial<SessionItem>) => void;
  onDeriveSession: (sess: SessionItem) => void;
  selectedSessionIds: string[];
  setSelectedSessionIds: React.Dispatch<React.SetStateAction<string[]>>;
  onDeleteMultipleSessions: (ids: string[]) => void;
  onArchiveMultipleSessions: (ids: string[]) => void;
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

  onOpenDirsModal,
  onOpenHistory,
  onOpenArchivedChats,
  onUpdateSession,
  onDeriveSession,
  selectedSessionIds,
  setSelectedSessionIds,
  onDeleteMultipleSessions,
  onArchiveMultipleSessions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
  const [showProjMenuId, setShowProjMenuId] = useState<string | null>(null);

  // Filtered sessions (only non-archived ones)
  const nonArchivedSessions = sessions.filter((s) => s.isArchived !== true);

  const filteredSessions = nonArchivedSessions.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const titleMatch = (s.title || '').toLowerCase().includes(term);
    const msgMatch = s.messages?.some((m) => m.content.toLowerCase().includes(term));
    return titleMatch || msgMatch;
  });

  const toggleSelectSession = (sessId: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(sessId) ? prev.filter((id) => id !== sessId) : [...prev, sessId]
    );
  };

  const handleBatchDelete = () => {
    if (confirm(`Deseja realmente excluir as ${selectedSessionIds.length} conversas selecionadas?`)) {
      onDeleteMultipleSessions(selectedSessionIds);
      setSelectedSessionIds([]);
      setIsSelectionMode(false);
    }
  };

  const handleBatchArchive = () => {
    onArchiveMultipleSessions(selectedSessionIds);
    setSelectedSessionIds([]);
    setIsSelectionMode(false);
  };

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
                Gemini Code by Satiro
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
              className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer text-[10px]"
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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedSessionIds([]);
                  }}
                  title={isSelectionMode ? 'Cancelar seleção' : 'Selecionar vários chats'}
                  className={`p-1 rounded transition cursor-pointer ${
                    isSelectionMode ? 'bg-blue-600/30 text-blue-400' : 'hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-sans">
                  {nonArchivedSessions.length}
                </span>
              </div>
            </div>

            {/* Batch actions bar in selection mode */}
            {isSelectionMode && selectedSessionIds.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs gap-1">
                <span className="font-medium text-[11px] text-zinc-300">
                  {selectedSessionIds.length} sel.
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleBatchArchive}
                    title="Arquivar selecionados"
                    className="p-1 hover:bg-zinc-700 rounded text-blue-400 hover:text-blue-300 transition"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    title="Excluir selecionados"
                    className="p-1 hover:bg-zinc-700 rounded text-rose-400 hover:text-rose-300 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedSessionIds([]);
                    }}
                    title="Sair do modo de seleção"
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

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
            const isSelected = selectedSessionIds.includes(sess.id);

            if (!isExpanded) {
              return (
                <button
                  key={sess.id}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelectSession(sess.id);
                    } else {
                      onSelectSession(sess);
                    }
                  }}
                  title={`${sess.title || 'Conversa'} (${formatTokenCount(totalTokens)} tokens)`}
                  className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center relative transition ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : isActive
                      ? 'bg-blue-900/40 text-white border border-blue-500/30'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-zinc-900" />
                  )}
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
                onClick={() => {
                  if (isSelectionMode) {
                    toggleSelectSession(sess.id);
                  } else {
                    onSelectSession(sess);
                  }
                }}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1 pr-1">
                  {/* Selection Checkbox */}
                  {isSelectionMode ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectSession(sess.id);
                      }}
                      className="mt-0.5 shrink-0 text-blue-400 hover:text-blue-300"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600 hover:text-zinc-400" />
                      )}
                    </button>
                  ) : (
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                        isActive ? 'text-blue-400' : 'text-zinc-500'
                      }`}
                    />
                  )}

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

                {/* Individual Chat Options Trigger Button */}
                {!isSelectionMode && (
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuSessionId(activeMenuSessionId === sess.id ? null : sess.id);
                        setShowProjMenuId(null);
                      }}
                      title="Opções do Chat"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Options Dropdown Menu */}
                    {activeMenuSessionId === sess.id && (
                      <div className="absolute right-0 mt-1 w-44 rounded-xl border border-zinc-700 bg-zinc-850 p-1 shadow-xl z-35 text-xs animate-in fade-in duration-100">
                        {/* Option: Derivar Chat */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeriveSession(sess);
                            setActiveMenuSessionId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-700/80 rounded-lg text-zinc-200 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Derivar Chat</span>
                        </button>

                        {/* Option: Adicionar ao Projeto... */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowProjMenuId(showProjMenuId === sess.id ? null : sess.id);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-700/80 rounded-lg text-zinc-200 hover:text-white flex items-center justify-between gap-1.5 transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
                              <span>Adicionar a...</span>
                            </span>
                            <ChevronRight className="w-3 h-3 text-zinc-500" />
                          </button>

                          {/* Submenu Projects */}
                          {showProjMenuId === sess.id && (
                            <div className="absolute left-[-150px] top-0 w-36 rounded-lg border border-zinc-700 bg-zinc-850 p-1 shadow-xl z-40 text-[11px]">
                              {projects.map((proj) => (
                                <button
                                  key={proj.id}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    onUpdateSession(sess.id, { projectId: proj.id });
                                    setActiveMenuSessionId(null);
                                    setShowProjMenuId(null);
                                  }}
                                  className="w-full text-left px-2 py-1 hover:bg-zinc-700 rounded-md text-zinc-300 hover:text-white truncate transition cursor-pointer"
                                >
                                  📁 {proj.name}
                                </button>
                              ))}
                              {projects.length === 0 && (
                                <div className="p-2 text-zinc-500 text-center text-[10px]">Sem projetos</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Option: Arquivar */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateSession(sess.id, { isArchived: true });
                            setActiveMenuSessionId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-700/80 rounded-lg text-zinc-200 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5 text-amber-400" />
                          <span>Arquivar</span>
                        </button>

                        {/* Divider */}
                        <div className="h-px bg-zinc-700/50 my-1" />

                        {/* Option: Remover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Deseja realmente excluir esta conversa?')) {
                              onDeleteSession(sess.id);
                              setActiveMenuSessionId(null);
                            }
                          }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-rose-900/40 rounded-lg text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Remover</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer with Moved Headers Buttons */}
      <div className="p-2 border-t border-zinc-800 shrink-0 space-y-1">
        {/* Link para Arquivos de Chats Arquivados */}
        <button
          onClick={onOpenArchivedChats}
          title="Abrir Chats Arquivados (Arquivos)"
          className={`w-full flex items-center justify-start gap-2 py-2 px-3 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition ${
            !isExpanded ? 'justify-center px-0' : ''
          }`}
        >
          <Archive className="w-4 h-4 text-amber-500 shrink-0" />
          {isExpanded && <span>Arquivos</span>}
        </button>

        {/* Diretórios */}
        <button
          onClick={onOpenDirsModal}
          title="Diretórios Autorizados"
          className={`w-full flex items-center justify-start gap-2 py-2 px-3 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition ${
            !isExpanded ? 'justify-center px-0' : ''
          }`}
        >
          <FolderCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          {isExpanded && <span>Diretórios</span>}
        </button>

        {/* Histórico */}
        <button
          onClick={onOpenHistory}
          title="Histórico de Sessões"
          className={`w-full flex items-center justify-start gap-2 py-2 px-3 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition ${
            !isExpanded ? 'justify-center px-0' : ''
          }`}
        >
          <History className="w-4 h-4 text-blue-400 shrink-0" />
          {isExpanded && <span>Histórico</span>}
        </button>

        {/* Contexto & Tokens */}
        <button
          onClick={() => onOpenSettings('context')}
          title="Configurações de Contexto & Tokens"
          className={`w-full flex items-center justify-start gap-2 py-2 px-3 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition ${
            !isExpanded ? 'justify-center px-0' : ''
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          {isExpanded && <span>Contexto & Tokens</span>}
        </button>
      </div>
    </aside>
  );
};
