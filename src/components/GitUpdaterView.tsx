import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitPullRequest,
  GitCommit,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  Terminal,
  ExternalLink,
  Copy,
  Clock,
  ArrowUpCircle,
  Check,
} from 'lucide-react';
import { GitAppStatus, GitUpdateCheckResult, GitUpdateResult } from '../types';

interface GitUpdaterViewProps {
  onRefreshGlobalStatus?: () => void;
}

export const GitUpdaterView: React.FC<GitUpdaterViewProps> = ({ onRefreshGlobalStatus }) => {
  const [repoUrl, setRepoUrl] = useState('https://github.com/pinguelanarosca/GCLIVisualInterface');
  const [branch, setBranch] = useState('main');
  const [gitStatus, setGitStatus] = useState<GitAppStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateCheckResult, setUpdateCheckResult] = useState<GitUpdateCheckResult | null>(null);

  const [isPullingUpdate, setIsPullingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<GitUpdateResult | null>(null);

  const [forceSync, setForceSync] = useState(false);
  const [copiedManual, setCopiedManual] = useState(false);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch(`/api/git/status?repoUrl=${encodeURIComponent(repoUrl)}`);
      const data = await res.json();
      setGitStatus(data);
      if (data.remoteUrl && !repoUrl) {
        setRepoUrl(data.remoteUrl);
      }
      if (data.branch && !branch) {
        setBranch(data.branch);
      }
    } catch (err) {
      console.error('Failed to load git status', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateCheckResult(null);
    setUpdateResult(null);
    try {
      const res = await fetch('/api/git/check-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim(), branch: branch.trim() }),
      });
      const data = await res.json();
      setUpdateCheckResult(data);
    } catch (err: any) {
      setUpdateCheckResult({
        hasUpdate: false,
        branch,
        repoUrl,
        message: err.message || 'Erro ao consultar atualizações remotas',
        error: err.message,
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handlePerformUpdate = async () => {
    setIsPullingUpdate(true);
    setUpdateResult(null);
    try {
      const res = await fetch('/api/git/pull-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          branch: branch.trim(),
          forceSync,
        }),
      });
      const data = await res.json();
      setUpdateResult(data);
      if (data.success) {
        await loadStatus();
        if (onRefreshGlobalStatus) {
          onRefreshGlobalStatus();
        }
      }
    } catch (err: any) {
      setUpdateResult({
        success: false,
        message: err.message || 'Erro ao aplicar atualização do Git',
        logs: [`❌ Erro inesperado: ${err.message}`],
        error: err.message,
      });
    } finally {
      setIsPullingUpdate(false);
    }
  };

  const manualCommands = `# 1. Navegar até a pasta da aplicação no Ubuntu:
cd /opt/gemini-gui || cd ~/gemini-cli-gui

# 2. Buscar e aplicar as alterações do repositório:
git fetch origin ${branch || 'main'}
git pull origin ${branch || 'main'}

# 3. Atualizar dependências e recompilar a interface:
npm install
npm run build

# 4. Reiniciar o serviço da aplicação:
npm start`;

  const copyManualCmds = () => {
    navigator.clipboard.writeText(manualCommands);
    setCopiedManual(true);
    setTimeout(() => setCopiedManual(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <GitPullRequest className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Atualização do Aplicativo via Git (GitHub)</span>
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
          Verifique novidades, sincronize commits e atualize a interface gráfica diretamente do repositório oficial do projeto.
        </p>
      </div>

      {/* Repository & Branch Input Card */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Repositório Git de Origem</span>
          </h5>
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Abrir no GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              URL do Repositório Git / GitHub
            </label>
            <div className="relative">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/pinguelanarosca/GCLIVisualInterface"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Branch / Ramo
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Buttons for checking and updating */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleCheckUpdates}
            disabled={isCheckingUpdate || !repoUrl.trim()}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            {isCheckingUpdate ? 'Consultando GitHub...' : 'Verificar Atualizações no GitHub'}
          </button>

          <button
            type="button"
            onClick={handlePerformUpdate}
            disabled={isPullingUpdate || !repoUrl.trim()}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className={`w-3.5 h-3.5 ${isPullingUpdate ? 'animate-bounce' : ''}`} />
            {isPullingUpdate ? 'Atualizando Aplicação...' : 'Atualizar Aplicação Agora'}
          </button>

          <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={forceSync}
              onChange={(e) => setForceSync(e.target.checked)}
              className="rounded"
            />
            <span>Sincronização limpa (Reset forçado / overwrite)</span>
          </label>
        </div>
      </div>

      {/* Current Local Environment Status */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2.5 text-xs">
        <div className="flex justify-between items-center pb-1 border-b border-zinc-200/60 dark:border-zinc-700/60">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5 text-zinc-500" />
            <span>Estado Atual do Ambiente Local</span>
          </span>
          <button
            onClick={loadStatus}
            disabled={isLoadingStatus}
            title="Recarregar status do Git"
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Repositório Git:</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {gitStatus?.isGitRepo ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Inicializado & Ativo
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Standalone (Pronto p/ Sync)
                </span>
              )}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Branch Local:</span>
            <span className="font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
              {gitStatus?.branch || branch}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Commit Local Atual:</span>
            <span className="font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
              {gitStatus?.currentCommitShort || 'Última versão'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-500">Modificações não salvas:</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {gitStatus?.hasUncommittedChanges ? (
                <span className="text-amber-600 dark:text-amber-400">
                  {gitStatus.uncommittedFilesCount} arquivos modificados
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">Diretório limpo</span>
              )}
            </span>
          </div>
        </div>

        {gitStatus?.commitMessage && (
          <div className="pt-1 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="truncate">
              Último commit: <em>"{gitStatus.commitMessage}"</em> ({gitStatus.commitDate})
            </span>
          </div>
        )}
      </div>

      {/* Check Result Banner */}
      {updateCheckResult && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-2.5 ${
            updateCheckResult.error
              ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
              : updateCheckResult.hasUpdate
              ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300'
              : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {updateCheckResult.error ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            ) : updateCheckResult.hasUpdate ? (
              <ArrowUpCircle className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="font-semibold">{updateCheckResult.message}</span>
          </div>

          {updateCheckResult.remoteCommitInfo && (
            <div className="p-3 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800 space-y-1.5 text-zinc-800 dark:text-zinc-200">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <GitCommit className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  Commit Remoto: {updateCheckResult.remoteCommitInfo.shortSha}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {updateCheckResult.remoteCommitInfo.date}
                </span>
              </div>
              <p className="text-xs font-mono bg-zinc-50 dark:bg-zinc-800 p-2 rounded border border-zinc-200/50 dark:border-zinc-700/50">
                {updateCheckResult.remoteCommitInfo.message}
              </p>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Autor: <span className="font-medium text-zinc-700 dark:text-zinc-300">{updateCheckResult.remoteCommitInfo.author}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pull / Update Result Output Box */}
      {updateResult && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-3 ${
            updateResult.success
              ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {updateResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span
              className={`font-semibold ${
                updateResult.success ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-900 dark:text-rose-200'
              }`}
            >
              {updateResult.message}
            </span>
          </div>

          {/* Logs container */}
          {updateResult.logs && updateResult.logs.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block">
                Relatório de Execução do Git:
              </span>
              <div className="p-3 rounded-lg bg-zinc-900 text-zinc-200 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1 border border-zinc-800">
                {updateResult.logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Terminal Commands for Ubuntu */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
            <span>Execução Manual no Terminal (Ubuntu / Linux)</span>
          </h5>
          <button
            type="button"
            onClick={copyManualCmds}
            className="text-[11px] flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {copiedManual ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar Comandos</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Se você instalou a aplicação em um servidor Ubuntu ou máquina local, também pode atualizá-la executando:
        </p>

        <div className="p-3 rounded-lg bg-zinc-900 text-zinc-200 font-mono text-[11px] overflow-x-auto space-y-1">
          <p className="text-zinc-500"># Atualizar código fonte do repositório:</p>
          <p className="text-blue-400">git fetch origin {branch || 'main'}</p>
          <p className="text-blue-400">git pull origin {branch || 'main'}</p>
          <p className="text-zinc-500 pt-1"># Instalar pacotes e compilar:</p>
          <p className="text-emerald-400">npm install && npm run build</p>
        </div>
      </div>
    </div>
  );
};
