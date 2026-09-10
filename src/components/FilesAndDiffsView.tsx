import React, { useState, useEffect } from 'react';
import {
  FileText,
  GitBranch,
  RefreshCw,
  Folder,
  FileCode,
  AlertCircle,
  CheckCircle2,
  FilePlus,
  FileMinus,
  FileEdit,
  Terminal,
} from 'lucide-react';
import { FileDiffItem } from '../types.js';

interface FilesAndDiffsViewProps {
  currentDir: string;
}

export const FilesAndDiffsView: React.FC<FilesAndDiffsViewProps> = ({ currentDir }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [diffs, setDiffs] = useState<FileDiffItem[]>([]);
  const [gitStatus, setGitStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDiffPath, setSelectedDiffPath] = useState<string | null>(null);

  const fetchFilesAndDiffs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/files?dir=${encodeURIComponent(currentDir || '')}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setDiffs(data.diffs || []);
        setGitStatus(data.gitStatus || '');
        if (data.diffs && data.diffs.length > 0 && !selectedDiffPath) {
          setSelectedDiffPath(data.diffs[0].path);
        }
      }
    } catch (err) {
      console.error('Failed to load files and diffs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilesAndDiffs();
  }, [currentDir]);

  const activeDiff = diffs.find((d) => d.path === selectedDiffPath) || diffs[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Subheader */}
      <div className="h-12 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            Inspeção Real do Repositório & Filesystem
          </span>
          <span className="text-[11px] font-mono text-zinc-500 truncate max-w-md ml-2">
            {currentDir || 'Workspace atual'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 font-medium">{gitStatus}</span>
          <button
            onClick={fetchFilesAndDiffs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Main Diff Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Changed Files List */}
        <div className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Arquivos Alterados ({diffs.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {diffs.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-80" />
                Nenhuma alteração pendente no repositório.
              </div>
            ) : (
              diffs.map((diff) => {
                const isSelected = diff.path === selectedDiffPath;
                return (
                  <button
                    key={diff.path}
                    onClick={() => setSelectedDiffPath(diff.path)}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center gap-2 transition ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {diff.status === 'added' ? (
                      <FilePlus className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : diff.status === 'deleted' ? (
                      <FileMinus className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <FileEdit className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="truncate flex-1 font-mono text-[11px]">{diff.path}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom: All Directory Entries */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 max-h-48 overflow-y-auto">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase mb-1 px-1">
              Diretório ({files.length} itens)
            </div>
            <div className="space-y-0.5">
              {files.map((file) => (
                <div
                  key={file}
                  className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {file.endsWith('/') ? (
                    <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  )}
                  <span className="truncate">{file}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Unified Diff Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 text-zinc-100 font-mono text-xs">
          {activeDiff ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-10 px-4 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-200">{activeDiff.path}</span>
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      activeDiff.status === 'added'
                        ? 'bg-emerald-900/60 text-emerald-300'
                        : activeDiff.status === 'deleted'
                        ? 'bg-rose-900/60 text-rose-300'
                        : 'bg-amber-900/60 text-amber-300'
                    }`}
                  >
                    {activeDiff.status}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500">Diff real do Git</span>
              </div>

              <div className="flex-1 overflow-auto p-4 leading-relaxed font-mono">
                {activeDiff.diff.split('\n').map((line, idx) => {
                  let lineClass = 'text-zinc-400';
                  if (line.startsWith('+') && !line.startsWith('+++')) {
                    lineClass = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 pl-2';
                  } else if (line.startsWith('-') && !line.startsWith('---')) {
                    lineClass = 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 pl-2';
                  } else if (line.startsWith('@@')) {
                    lineClass = 'text-blue-400 font-bold bg-blue-950/30 py-0.5 px-1 rounded my-1';
                  }

                  return (
                    <div key={idx} className={`py-0.5 ${lineClass}`}>
                      {line || ' '}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Selecione um arquivo com alterações para inspecionar o diff.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
