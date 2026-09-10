import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { GitAppStatus, GitCommitInfo, GitUpdateCheckResult, GitUpdateResult } from '../src/types.js';

export const DEFAULT_GIT_REPO_URL = 'https://github.com/pinguelanarosca/GCLIVisualInterface';
export const DEFAULT_GIT_BRANCH = 'main';

function getGitVersion(): string | undefined {
  try {
    const out = execSync('git --version', { encoding: 'utf-8', timeout: 5000 });
    return out.trim();
  } catch {
    return undefined;
  }
}

function parseGithubRepo(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const cleanUrl = repoUrl.trim().replace(/\.git$/, '');
    const match = cleanUrl.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  } catch {
    return null;
  }
}

export function getGitStatus(customRepoUrl?: string): GitAppStatus {
  const cwd = process.cwd();
  const gitVersion = getGitVersion();
  const gitAvailable = Boolean(gitVersion);
  const repoUrl = customRepoUrl || DEFAULT_GIT_REPO_URL;
  const branch = DEFAULT_GIT_BRANCH;

  if (!gitAvailable) {
    return {
      isGitRepo: false,
      repoUrl,
      branch,
      hasUncommittedChanges: false,
      uncommittedFilesCount: 0,
      gitAvailable: false,
    };
  }

  try {
    const isRepo = execSync('git rev-parse --is-inside-work-tree', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 4000,
    }).trim() === 'true';

    if (!isRepo) {
      return {
        isGitRepo: false,
        repoUrl,
        branch,
        hasUncommittedChanges: false,
        uncommittedFilesCount: 0,
        gitAvailable: true,
        gitVersion,
      };
    }

    let currentBranch = branch;
    try {
      currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 4000,
      }).trim();
    } catch {}

    let currentCommit = '';
    let currentCommitShort = '';
    try {
      currentCommit = execSync('git rev-parse HEAD', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 4000,
      }).trim();
      currentCommitShort = currentCommit.substring(0, 7);
    } catch {}

    let commitMessage = '';
    let commitDate = '';
    try {
      commitMessage = execSync('git log -1 --pretty=format:"%s"', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 4000,
      }).trim().replace(/^"|"$/g, '');

      commitDate = execSync('git log -1 --pretty=format:"%cd" --date=relative', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 4000,
      }).trim().replace(/^"|"$/g, '');
    } catch {}

    let remoteUrl = '';
    try {
      remoteUrl = execSync('git config --get remote.origin.url', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 4000,
      }).trim();
    } catch {}

    let uncommittedFilesCount = 0;
    try {
      const statusOutput = execSync('git status --porcelain', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 4000,
      }).trim();
      if (statusOutput) {
        uncommittedFilesCount = statusOutput.split('\n').filter(Boolean).length;
      }
    } catch {}

    return {
      isGitRepo: true,
      repoUrl: remoteUrl || repoUrl,
      branch: currentBranch || branch,
      currentCommit,
      currentCommitShort,
      commitMessage,
      commitDate,
      hasUncommittedChanges: uncommittedFilesCount > 0,
      uncommittedFilesCount,
      remoteUrl: remoteUrl || undefined,
      gitAvailable: true,
      gitVersion,
    };
  } catch {
    return {
      isGitRepo: false,
      repoUrl,
      branch,
      hasUncommittedChanges: false,
      uncommittedFilesCount: 0,
      gitAvailable: true,
      gitVersion,
    };
  }
}

export async function checkRemoteGitUpdates(
  repoUrl: string = DEFAULT_GIT_REPO_URL,
  branch: string = DEFAULT_GIT_BRANCH
): Promise<GitUpdateCheckResult> {
  const currentStatus = getGitStatus(repoUrl);
  const cleanRepoUrl = repoUrl.trim() || DEFAULT_GIT_REPO_URL;
  const targetBranch = branch.trim() || DEFAULT_GIT_BRANCH;

  let remoteCommit = '';
  let remoteCommitShort = '';
  let remoteCommitInfo: GitCommitInfo | undefined;

  // 1. Query remote commit hash via git ls-remote
  try {
    const lsOutput = execSync(`git ls-remote "${cleanRepoUrl}" refs/heads/${targetBranch} HEAD`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    }).trim();

    const lines = lsOutput.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        if (parts[1] === `refs/heads/${targetBranch}` || parts[1] === 'HEAD') {
          remoteCommit = parts[0];
          remoteCommitShort = remoteCommit.substring(0, 7);
          break;
        }
      }
    }
  } catch (err: any) {
    // If git ls-remote fails, we will try GitHub API fallback below
  }

  // 2. Query GitHub public API if it's a GitHub URL for rich commit info
  const ghRepo = parseGithubRepo(cleanRepoUrl);
  if (ghRepo) {
    try {
      const res = await fetch(`https://api.github.com/repos/${ghRepo.owner}/${ghRepo.repo}/commits/${targetBranch}`, {
        headers: {
          'User-Agent': 'Gemini-GUI-GitUpdater',
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.sha) {
          if (!remoteCommit) {
            remoteCommit = data.sha;
            remoteCommitShort = data.sha.substring(0, 7);
          }
          remoteCommitInfo = {
            sha: data.sha,
            shortSha: data.sha.substring(0, 7),
            message: data.commit?.message?.split('\n')[0] || 'Atualização recente',
            author: data.commit?.author?.name || data.author?.login || 'pinguelanarosca',
            date: data.commit?.author?.date ? new Date(data.commit.author.date).toLocaleString('pt-BR') : '',
            url: data.html_url,
          };
        }
      }
    } catch {}
  }

  if (!remoteCommit) {
    return {
      hasUpdate: false,
      branch: targetBranch,
      repoUrl: cleanRepoUrl,
      message: 'Não foi possível consultar o repositório remoto informado. Verifique a URL do Git.',
      error: 'Falha na conexão com o repositório Git remoto.',
    };
  }

  const localCommit = currentStatus.currentCommit;
  const hasUpdate = Boolean(localCommit && remoteCommit && localCommit !== remoteCommit) || !currentStatus.isGitRepo;

  let message = '';
  if (!currentStatus.isGitRepo) {
    message = `Repositório remoto encontrado (${remoteCommitShort}). O diretório local pode ser sincronizado com o Git.`;
  } else if (hasUpdate) {
    message = `Nova versão disponível no repositório (${remoteCommitShort}). Commit local: ${currentStatus.currentCommitShort || 'N/D'}.`;
  } else {
    message = `A aplicação já está atualizada com o commit mais recente (${remoteCommitShort}) da branch ${targetBranch}.`;
  }

  return {
    hasUpdate,
    localCommit: currentStatus.currentCommit,
    remoteCommit,
    remoteCommitShort,
    remoteCommitInfo,
    branch: targetBranch,
    repoUrl: cleanRepoUrl,
    message,
  };
}

export function performGitUpdate(
  repoUrl: string = DEFAULT_GIT_REPO_URL,
  branch: string = DEFAULT_GIT_BRANCH,
  forceSync: boolean = false
): GitUpdateResult {
  const cwd = process.cwd();
  const cleanRepoUrl = repoUrl.trim() || DEFAULT_GIT_REPO_URL;
  const targetBranch = branch.trim() || DEFAULT_GIT_BRANCH;
  const logs: string[] = [];

  const runCmd = (cmd: string, description: string) => {
    logs.push(`⚙️ [${description}] Executando: ${cmd}`);
    const res = spawnSync(cmd, {
      cwd,
      shell: true,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 45000,
    });
    if (res.stdout && res.stdout.trim()) {
      logs.push(`📤 stdout: ${res.stdout.trim()}`);
    }
    if (res.stderr && res.stderr.trim()) {
      logs.push(`⚠️ stderr: ${res.stderr.trim()}`);
    }
    if (res.status !== 0 && res.status !== null) {
      throw new Error(`Erro na etapa "${description}": ${res.stderr || res.stdout || 'Falha no comando'}`);
    }
    return res.stdout ? res.stdout.trim() : '';
  };

  try {
    const status = getGitStatus(cleanRepoUrl);

    // If not a git repo, initialize
    if (!status.isGitRepo) {
      runCmd('git init', 'Inicializar repositório Git local');
      runCmd(`git remote add origin "${cleanRepoUrl}" || git remote set-url origin "${cleanRepoUrl}"`, 'Configurar Remote Origin');
      runCmd(`git fetch origin ${targetBranch}`, 'Buscar ramos remotos');
      
      // Try checkout or merge
      try {
        runCmd(`git checkout -B ${targetBranch} origin/${targetBranch}`, 'Checkout do branch remoto');
      } catch {
        runCmd(`git reset --hard origin/${targetBranch}`, 'Reset para branch remota');
      }
    } else {
      // Is git repo
      runCmd(`git remote set-url origin "${cleanRepoUrl}" || git remote add origin "${cleanRepoUrl}"`, 'Atualizar URL do Remote Origin');
      runCmd(`git fetch origin ${targetBranch}`, 'Buscar atualizações remotas');

      if (forceSync) {
        runCmd(`git reset --hard origin/${targetBranch}`, 'Sincronização forçada com o remoto');
      } else {
        try {
          runCmd(`git merge origin/${targetBranch} -m "Merge update from ${cleanRepoUrl}"`, 'Mesclar atualizações');
        } catch (mergeErr: any) {
          logs.push(`⚠️ Conflito no merge detectado. Aplicando sincronização limpa do branch ${targetBranch}...`);
          runCmd(`git reset --hard origin/${targetBranch}`, 'Reset forçado para versão mais recente');
        }
      }
    }

    // Check new commit
    let newCommit = '';
    try {
      newCommit = execSync('git rev-parse HEAD', { cwd, encoding: 'utf-8' }).trim();
    } catch {}

    logs.push(`✅ Aplicação sincronizada com sucesso para o commit ${newCommit ? newCommit.substring(0, 7) : 'recente'}!`);

    return {
      success: true,
      message: `Aplicação atualizada com sucesso a partir de ${cleanRepoUrl} (${targetBranch})!`,
      updatedCommit: newCommit,
      logs,
      requiresRestart: true,
    };
  } catch (err: any) {
    logs.push(`❌ Erro no processo de atualização: ${err.message}`);
    return {
      success: false,
      message: `Falha ao atualizar a aplicação via Git: ${err.message}`,
      logs,
      error: err.message,
    };
  }
}

export function generateManualUpdateCommands(
  repoUrl: string = DEFAULT_GIT_REPO_URL,
  branch: string = DEFAULT_GIT_BRANCH
): string {
  return [
    '# Atualização rápida manual no Ubuntu / Linux:',
    'git fetch origin ' + branch,
    'git pull origin ' + branch,
    'npm install',
    'npm run build',
  ].join('\n');
}
