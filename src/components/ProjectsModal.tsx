import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Layers,
  Folder,
  FolderCheck,
  FolderPlus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ProjectItem, AuthorizedDir } from '../types.js';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectItem[];
  activeProject: ProjectItem | null;
  onSelectProject: (proj: ProjectItem) => void;
  onCreateProject: (name: string, description: string, dirs: string[]) => Promise<void>;
  onUpdateProject: (id: string, updates: Partial<ProjectItem>) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  authorizedDirs?: AuthorizedDir[];
  onInspectProjectDirs?: (dir: string) => void;
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
  authorizedDirs = [],
  onInspectProjectDirs,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [newDirs, setNewDirs] = useState<string[]>(['']);
  
  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDirs, setEditDirs] = useState<string[]>([]);

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setIsCreating(false);
      setEditingId(null);
      setName('');
      setDescription('');
      setNewDirs(['']);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setName('');
    setDescription('');
    setNewDirs(['']);
  };

  const handleAddDirInput = () => {
    setNewDirs((prev) => [...prev, '']);
  };

  const handleUpdateDirInput = (index: number, val: string) => {
    setNewDirs((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveDirInput = (index: number) => {
    setNewDirs((prev) => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validDirs = newDirs
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    await onCreateProject(
      name.trim(),
      description.trim(),
      validDirs
    );
    setName('');
    setDescription('');
    setNewDirs(['']);
    setIsCreating(false);
  };

  const handleStartEdit = (proj: ProjectItem) => {
    setEditingId(proj.id);
    setIsCreating(false);
    setEditName(proj.name);
    setEditDescription(proj.description || '');
    setEditDirs(proj.associatedDirs && proj.associatedDirs.length > 0 ? [...proj.associatedDirs] : ['']);
  };

  const handleAddEditDir = () => {
    setEditDirs((prev) => [...prev, '']);
  };

  const handleUpdateEditDir = (index: number, val: string) => {
    setEditDirs((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveEditDir = (index: number) => {
    setEditDirs((prev) => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    const validDirs = editDirs
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    await onUpdateProject(id, {
      name: editName.trim(),
      description: editDescription.trim(),
      associatedDirs: validDirs,
    });
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Gerenciador de Projetos & Diretórios Locais
              </h2>
              <p className="text-xs text-zinc-500">
                Especifique diretórios locais de trabalho associados a cada projeto do Gemini CLI.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top action bar */}
          {!isCreating && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Projetos Cadastrados ({projects.length})
              </span>
              <button
                onClick={handleStartCreate}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Projeto</span>
              </button>
            </div>
          )}

          {/* Form: Create Project */}
          {isCreating && (
            <form onSubmit={handleCreateSubmit} className="bg-zinc-50 dark:bg-zinc-800/40 border border-blue-500/30 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700/60 pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <FolderPlus className="w-4 h-4 text-blue-500" />
                  <span>Criar Novo Projeto</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome do Projeto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: API Backend, Portal Web, App Mobile..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Finalidade e escopo do projeto..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Local Directories Input List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Diretório(s) Local(is) do Projeto
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDirInput}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Adicionar outro diretório
                  </button>
                </div>

                <div className="space-y-2">
                  {newDirs.map((dir, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Folder className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="/caminho/local/do/projeto ou ~/meu-app ou ./src"
                          value={dir}
                          onChange={(e) => handleUpdateDirInput(idx, e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      {newDirs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDirInput(idx)}
                          className="p-2 text-zinc-400 hover:text-rose-500 transition rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-zinc-400">Atalhos rápidos:</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateDirInput(0, '.')}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                  >
                    Workspace Atual (.)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateDirInput(0, '~')}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                  >
                    Home do Usuário (~)
                  </button>
                  {authorizedDirs.slice(0, 2).map((ad) => (
                    <button
                      key={ad.path}
                      type="button"
                      onClick={() => handleUpdateDirInput(0, ad.path)}
                      className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 font-mono truncate max-w-[140px]"
                      title={ad.path}
                    >
                      {ad.path}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700/60">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm"
                >
                  Salvar Projeto
                </button>
              </div>
            </form>
          )}

          {/* Projects List */}
          <div className="space-y-3">
            {projects.map((proj) => {
              const isActive = activeProject?.id === proj.id;
              const isEditing = editingId === proj.id;

              if (isEditing) {
                return (
                  <div
                    key={proj.id}
                    className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/40 rounded-xl p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-900/40 pb-2">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        Editando Projeto: {proj.name}
                      </span>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-zinc-400 hover:text-zinc-600"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Nome do Projeto
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Descrição
                      </label>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Edit Associated Local Directories */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Diretórios Locais Associados
                        </label>
                        <button
                          type="button"
                          onClick={handleAddEditDir}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar Diretório
                        </button>
                      </div>

                      <div className="space-y-2">
                        {editDirs.map((dir, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Folder className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                              <input
                                type="text"
                                value={dir}
                                placeholder="/caminho/local/do/projeto"
                                onChange={(e) => handleUpdateEditDir(idx, e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            {editDirs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEditDir(idx)}
                                className="p-1.5 text-zinc-400 hover:text-rose-500 transition rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-blue-200 dark:border-blue-900/40">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(proj.id)}
                        className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={proj.id}
                  className={`p-4 rounded-xl border transition flex flex-col gap-3 ${
                    isActive
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500/50 shadow-sm'
                      : 'bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <FolderGit2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {proj.name}
                          </h4>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Ativo
                            </span>
                          )}
                        </div>
                        {proj.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {proj.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isActive && (
                        <button
                          onClick={() => onSelectProject(proj)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                        >
                          Ativar
                        </button>
                      )}
                      <button
                        onClick={() => handleStartEdit(proj)}
                        title="Editar Projeto e Diretórios"
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {projects.length > 1 && (
                        <button
                          onClick={() => onDeleteProject(proj.id)}
                          title="Excluir Projeto"
                          className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Associated Directories Display */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/60 rounded-lg p-2.5 border border-zinc-200/60 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                      <span>Diretórios Locais Associados:</span>
                      {onInspectProjectDirs && proj.associatedDirs.length > 0 && (
                        <button
                          onClick={() => {
                            onInspectProjectDirs(proj.associatedDirs[0]);
                            onClose();
                          }}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>Ver Arquivos & Diffs</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {proj.associatedDirs && proj.associatedDirs.length > 0 ? (
                        proj.associatedDirs.map((dir, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono text-[11px]"
                          >
                            <Folder className="w-3 h-3 text-blue-500" />
                            <span className="truncate max-w-sm">{dir}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-400 italic">
                          Nenhum diretório específico (utilizando raiz do sistema)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {activeProject ? `Projeto ativo: ${activeProject.name}` : 'Nenhum projeto selecionado'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:opacity-90 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
