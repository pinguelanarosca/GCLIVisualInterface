import React from 'react';
import {
  History,
  X,
  MessageSquare,
  Plus,
  Trash2,
  Calendar,
  FolderGit2,
  ChevronRight,
} from 'lucide-react';
import { SessionItem, ProjectItem } from '../types.js';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionItem[];
  activeSessionId: string | null;
  onSelectSession: (session: SessionItem) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  projects: ProjectItem[];
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  projects,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 h-full border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              Histórico de Conversas
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNewSession();
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Conversa</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Nenhuma sessão anterior encontrada.
            </div>
          ) : (
            sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              const proj = projects.find((p) => p.id === sess.projectId);

              return (
                <div
                  key={sess.id}
                  className={`p-3 rounded-xl border transition flex items-start justify-between gap-3 group ${
                    isActive
                      ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectSession(sess);
                      onClose();
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="font-medium text-xs text-zinc-900 dark:text-zinc-100 truncate mb-1">
                      {sess.title || 'Conversa sem título'}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(sess.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <span>•</span>
                      <span>{sess.messages?.length || 0} mensagens</span>
                      {proj && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[100px] text-blue-600 dark:text-blue-400">
                            {proj.name}
                          </span>
                        </>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Deseja excluir a conversa '${sess.title}'?`)) {
                        onDeleteSession(sess.id);
                      }
                    }}
                    title="Excluir conversa"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
