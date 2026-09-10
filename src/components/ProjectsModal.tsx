import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ExternalLink,
  Layers,
  Folder,
} from 'lucide-react';
import { ProjectItem } from '../types.js';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectItem[];
  activeProject: ProjectItem | null;
  onSelectProject: (proj: ProjectItem) => void;
  onCreateProject: (name: string, description: string, dirs: string[]) => Promise<void>;
  onUpdateProject: (id: string, updates: Partial<ProjectItem>) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dirPath, setDirPath] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onCreateProject(
      name.trim(),
      description.trim(),
      dirPath.trim() ? [dirPath.trim()] : [process.cwd()]
    );
    setName('');
    setDescription('');
    setDirPath('');
    setIsCreating(false);
  };

  const startEdit = (proj: ProjectItem) => {
    setEditingId(proj.id);
    setEditName(proj.name);
    setEditDescription(proj.description);
  };

  const saveEdit = async (id: string) => {
    await onUpdateProject(id, {
      name: editName.trim(),
      description: editDescription.trim(),
    });
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                Gerenciador de Projetos
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Organize workspaces, diretórios associados e histórico de conversas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Create Button or Form */}
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-3 px-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/50 flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Projeto</span>
            </button>
          ) : (
            <form
              onSubmit={handleCreate}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Novo Projeto</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-600"
                >
                  Cancelar
                </button>
              </div>
              <input
                type="text"
                placeholder="Nome do projeto (ex: Backend Ubuntu, Microsserviço)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none"
              />
              <input
                type="text"
                placeholder="Descrição resumida do propósito"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none"
              />
              <input
                type="text"
                placeholder="Diretório associado (opcional, padrão: workspace atual)"
                value={dirPath}
                onChange={(e) => setDirPath(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none font-mono"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  Salvar Projeto
                </button>
              </div>
            </form>
          )}

          {/* List of Projects */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Projetos Registrados ({projects.length})
            </h4>

            {projects.map((proj) => {
              const isActive = activeProject?.id === proj.id;
              const isEditing = editingId === proj.id;

              return (
                <div
                  key={proj.id}
                  className={`p-4 rounded-xl border transition flex flex-col gap-2 ${
                    isActive
                      ? 'border-blue-500/80 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none"
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-xs text-zinc-500"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveEdit(proj.id)}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-blue-600 text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                              {proj.name}
                            </span>
                            {isActive && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                Ativo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {proj.description || 'Sem descrição'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {!isActive && (
                            <button
                              onClick={() => {
                                onSelectProject(proj);
                                onClose();
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                            >
                              Abrir
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(proj)}
                            title="Renomear"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {projects.length > 1 && (
                            <button
                              onClick={() => {
                                if (confirm(`Deseja excluir o projeto '${proj.name}'?`)) {
                                  onDeleteProject(proj.id);
                                }
                              }}
                              title="Excluir Projeto"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                        <div className="flex items-center gap-1 truncate max-w-md">
                          <Folder className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="truncate">
                            {proj.associatedDirs.join(', ') || 'Nenhum diretório'}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(proj.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
