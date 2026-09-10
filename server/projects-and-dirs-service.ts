import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { ProjectItem, AuthorizedDir, SessionItem, FileDiffItem, FilesAndDiffsResult, FileEntryItem } from '../src/types.js';
import { sysLog } from './logger-service.js';

const STORAGE_FILE = path.join(process.cwd(), '.gemini-gui-storage.json');

interface AppDataStore {
  projects: ProjectItem[];
  authorizedDirs: string[];
  activeProjectId?: string;
  sessions: SessionItem[];
}

export function resolveLocalPath(inputPath?: string): string {
  if (!inputPath || !inputPath.trim()) {
    return process.cwd();
  }
  let p = inputPath.trim();
  if (p.startsWith('~')) {
    p = path.join(os.homedir(), p.slice(1));
  }
  if (!path.isAbsolute(p)) {
    p = path.resolve(process.cwd(), p);
  }
  return path.normalize(p);
}

function loadStore(): AppDataStore {
  if (fs.existsSync(STORAGE_FILE)) {
    try {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.projects)) {
        // Sanitize projects to guarantee valid directories
        parsed.projects = parsed.projects.map((proj: ProjectItem) => {
          const validDirs = (proj.associatedDirs || [])
            .map((d: string) => resolveLocalPath(d))
            .filter((d: string) => fs.existsSync(d));

          if (validDirs.length === 0) {
            validDirs.push(process.cwd());
          }
          return {
            ...proj,
            associatedDirs: validDirs,
          };
        });

        // Sanitize authorizedDirs
        const validAuthDirs = (parsed.authorizedDirs || [])
          .map((d: string) => resolveLocalPath(d))
          .filter((d: string) => fs.existsSync(d));

        if (validAuthDirs.length === 0) {
          validAuthDirs.push(process.cwd());
        }
        parsed.authorizedDirs = validAuthDirs;

        return parsed;
      }
    } catch {
      // Fall through to initial store
    }
  }

  const initialWorkspace = process.cwd();
  const initialProject: ProjectItem = {
    id: 'proj_default',
    name: 'Projeto Principal',
    description: 'Workspace principal do Gemini CLI',
    associatedDirs: [initialWorkspace],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const store: AppDataStore = {
    projects: [initialProject],
    authorizedDirs: [initialWorkspace],
    activeProjectId: initialProject.id,
    sessions: [],
  };

  saveStore(store);
  return store;
}

function saveStore(store: AppDataStore) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save store:', err);
  }
}

// Authorized Directories API
export function getAuthorizedDirs(): AuthorizedDir[] {
  const store = loadStore();
  const list: AuthorizedDir[] = [];

  for (const dirPath of store.authorizedDirs) {
    const resolved = resolveLocalPath(dirPath);
    const exists = fs.existsSync(resolved);
    let isWritable = false;
    if (exists) {
      try {
        fs.accessSync(resolved, fs.constants.W_OK);
        isWritable = true;
      } catch {
        isWritable = false;
      }
    }
    list.push({
      path: resolved,
      exists,
      isWritable,
      addedAt: new Date().toISOString(),
    });
  }

  return list;
}

export function addAuthorizedDir(dirPath: string): { success: boolean; message: string; dirs: AuthorizedDir[] } {
  const resolved = resolveLocalPath(dirPath);
  if (!fs.existsSync(resolved)) {
    // Check if parent directory exists and offer to create or report
    return { success: false, message: `Diretório '${resolved}' não existe no filesystem.`, dirs: getAuthorizedDirs() };
  }

  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return { success: false, message: `O caminho especificado '${resolved}' não é um diretório.`, dirs: getAuthorizedDirs() };
    }
  } catch (err: any) {
    return { success: false, message: `Erro ao acessar diretório: ${err.message}`, dirs: getAuthorizedDirs() };
  }

  const store = loadStore();
  if (!store.authorizedDirs.some((d) => resolveLocalPath(d) === resolved)) {
    store.authorizedDirs.push(resolved);
    saveStore(store);
    sysLog.info('SYSTEM', `Novo diretório local autorizado: ${resolved}`);
  }

  return { success: true, message: `Diretório '${resolved}' autorizado com sucesso.`, dirs: getAuthorizedDirs() };
}

export function removeAuthorizedDir(dirPath: string): { success: boolean; dirs: AuthorizedDir[] } {
  const store = loadStore();
  const resolved = resolveLocalPath(dirPath);
  store.authorizedDirs = store.authorizedDirs.filter((d) => resolveLocalPath(d) !== resolved);
  saveStore(store);
  return { success: true, dirs: getAuthorizedDirs() };
}

export function isPathAuthorized(targetPath: string): boolean {
  const store = loadStore();
  const resolved = resolveLocalPath(targetPath);
  return store.authorizedDirs.some((authDir) => {
    const resolvedAuth = resolveLocalPath(authDir);
    return resolved === resolvedAuth || resolved.startsWith(resolvedAuth + path.sep);
  });
}

// Projects API
export function getProjects(): ProjectItem[] {
  const store = loadStore();
  return store.projects;
}

export function createProject(name: string, description: string, associatedDirs?: string[]): ProjectItem {
  const store = loadStore();
  const id = `proj_${Date.now()}`;
  
  const rawDirs = associatedDirs && associatedDirs.length > 0 ? associatedDirs : [process.cwd()];
  const resolvedDirs: string[] = [];

  for (const raw of rawDirs) {
    const res = resolveLocalPath(raw);
    if (!resolvedDirs.includes(res)) {
      resolvedDirs.push(res);
      // Auto-authorize if exists
      if (fs.existsSync(res) && !store.authorizedDirs.some((d) => resolveLocalPath(d) === res)) {
        store.authorizedDirs.push(res);
      }
    }
  }

  const project: ProjectItem = {
    id,
    name: name.trim() || 'Novo Projeto',
    description: description.trim() || '',
    associatedDirs: resolvedDirs.length > 0 ? resolvedDirs : [process.cwd()],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.projects.push(project);
  store.activeProjectId = id;
  saveStore(store);

  sysLog.info('PROJECT', `Projeto '${project.name}' criado com ${project.associatedDirs.length} diretório(s) associado(s)`, {
    id: project.id,
    dirs: project.associatedDirs,
  });

  return project;
}

export function updateProject(id: string, updates: Partial<ProjectItem>): ProjectItem | null {
  const store = loadStore();
  const idx = store.projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  let resolvedDirs = store.projects[idx].associatedDirs;
  if (updates.associatedDirs) {
    resolvedDirs = updates.associatedDirs.map((d) => resolveLocalPath(d));
    // Auto authorize any newly specified existing directories
    for (const d of resolvedDirs) {
      if (fs.existsSync(d) && !store.authorizedDirs.some((auth) => resolveLocalPath(auth) === d)) {
        store.authorizedDirs.push(d);
      }
    }
  }

  store.projects[idx] = {
    ...store.projects[idx],
    ...updates,
    associatedDirs: resolvedDirs,
    updatedAt: new Date().toISOString(),
  };

  saveStore(store);
  sysLog.info('PROJECT', `Projeto '${store.projects[idx].name}' atualizado`, { id, dirs: resolvedDirs });
  return store.projects[idx];
}

export function deleteProject(id: string): boolean {
  const store = loadStore();
  store.projects = store.projects.filter((p) => p.id !== id);
  store.sessions = store.sessions.filter((s) => s.projectId !== id);
  if (store.activeProjectId === id) {
    store.activeProjectId = store.projects[0]?.id;
  }
  saveStore(store);
  return true;
}

// Sessions & History API
export function getSessions(projectId?: string): SessionItem[] {
  const store = loadStore();
  if (projectId) {
    return store.sessions.filter((s) => s.projectId === projectId);
  }
  return store.sessions;
}

export function getSessionById(id: string): SessionItem | null {
  const store = loadStore();
  return store.sessions.find((s) => s.id === id) || null;
}

export function saveSession(session: SessionItem): SessionItem {
  const store = loadStore();
  const idx = store.sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    store.sessions[idx] = {
      ...session,
      updatedAt: new Date().toISOString(),
      messageCount: session.messages.length,
    };
  } else {
    store.sessions.unshift({
      ...session,
      createdAt: session.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: session.messages.length,
    });
  }
  saveStore(store);
  return session;
}

export function deleteSession(id: string): boolean {
  const store = loadStore();
  store.sessions = store.sessions.filter((s) => s.id !== id);
  saveStore(store);
  return true;
}

// Files and Diffs API
export function inspectFilesAndDiffs(dirPath?: string): FilesAndDiffsResult {
  const store = loadStore();
  
  // Resolve target directory requested by user or fall back to default
  const defaultDir = store.projects[0]?.associatedDirs[0] || store.authorizedDirs[0] || process.cwd();
  const targetDir = dirPath && dirPath.trim() ? resolveLocalPath(dirPath) : resolveLocalPath(defaultDir);

  const parentDir = path.dirname(targetDir) !== targetDir ? path.dirname(targetDir) : null;

  if (!fs.existsSync(targetDir)) {
    return {
      currentDir: targetDir,
      parentDir,
      exists: false,
      isGitRepo: false,
      gitStatus: `Diretório não existe no filesystem: ${targetDir}`,
      files: [],
      entries: [],
      diffs: [],
      authorizedDirs: store.authorizedDirs,
      error: `O caminho '${targetDir}' não foi encontrado no sistema de arquivos local.`,
    };
  }

  // If exists and not authorized yet, auto-authorize so Gemini CLI and user have permission
  if (!store.authorizedDirs.some((d) => resolveLocalPath(d) === targetDir)) {
    store.authorizedDirs.push(targetDir);
    saveStore(store);
  }

  const files: string[] = [];
  const entries: FileEntryItem[] = [];

  try {
    const dirEntries = fs.readdirSync(targetDir, { withFileTypes: true });
    // Sort directories first, then alphabetically
    const sorted = [...dirEntries].sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const e of sorted) {
      if (!e.name.startsWith('.git') && !e.name.startsWith('node_modules')) {
        const fullChildPath = path.join(targetDir, e.name);
        let size: number | undefined;
        let modifiedAt: string | undefined;

        try {
          const stat = fs.statSync(fullChildPath);
          size = stat.size;
          modifiedAt = stat.mtime.toISOString();
        } catch {}

        const isDir = e.isDirectory();
        files.push(e.name + (isDir ? '/' : ''));
        entries.push({
          name: e.name,
          path: fullChildPath,
          isDirectory: isDir,
          size,
          modifiedAt,
        });
      }
    }
  } catch (err: any) {
    console.error('Error reading directory:', err);
  }

  // Check Git diffs and status in target directory
  const diffs: FileDiffItem[] = [];
  let isGitRepo = false;
  let branch: string | undefined;
  let gitStatus = 'Diretório local comum (sem versionamento Git).';

  try {
    // Check if git work tree
    const isGit = execSync('git rev-parse --is-inside-work-tree', {
      cwd: targetDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 3000,
    }).trim();

    if (isGit === 'true') {
      isGitRepo = true;
      try {
        branch = execSync('git branch --show-current', {
          cwd: targetDir,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 2000,
        }).trim();
      } catch {}

      const statusOutput = execSync('git status --porcelain', {
        cwd: targetDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 4000,
      });

      if (statusOutput.trim()) {
        gitStatus = `Git (${branch || 'ativo'}): Alterações detectadas`;
        const lines = statusOutput.trim().split('\n');

        for (const line of lines) {
          const flag = line.substring(0, 2).trim();
          const filePath = line.substring(3).trim();

          let status: 'modified' | 'added' | 'deleted' | 'untracked' = 'modified';
          if (flag.includes('A') || flag === '??') status = 'added';
          else if (flag.includes('D')) status = 'deleted';

          let diff = '';
          try {
            diff = execSync(`git diff HEAD -- "${filePath}"`, {
              cwd: targetDir,
              encoding: 'utf8',
              stdio: ['pipe', 'pipe', 'pipe'],
              timeout: 2500,
            });
          } catch {
            diff = `Arquivo não versionado ou novo: ${filePath}`;
          }

          diffs.push({
            path: filePath,
            status,
            diff: diff || `Alteração em: ${filePath} (${flag})`,
          });
        }
      } else {
        gitStatus = `Git (${branch || 'ativo'}): Working tree limpa (sem alterações).`;
      }
    }
  } catch {
    // Not a git repository, fallback gitStatus
    gitStatus = 'Diretório local (sem repositório Git).';
  }

  return {
    currentDir: targetDir,
    parentDir,
    exists: true,
    isGitRepo,
    branch,
    gitStatus,
    files,
    entries,
    diffs,
    authorizedDirs: store.authorizedDirs,
  };
}
