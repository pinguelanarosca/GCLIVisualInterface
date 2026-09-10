import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ProjectItem, AuthorizedDir, SessionItem, FileDiffItem } from '../src/types.js';

const STORAGE_FILE = path.join(process.cwd(), '.gemini-gui-storage.json');

interface AppDataStore {
  projects: ProjectItem[];
  authorizedDirs: string[];
  activeProjectId?: string;
  sessions: SessionItem[];
}

function loadStore(): AppDataStore {
  if (fs.existsSync(STORAGE_FILE)) {
    try {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
      return JSON.parse(raw);
    } catch {
      // Continue to default
    }
  }

  const initialWorkspace = process.cwd();
  const initialProject: ProjectItem = {
    id: 'proj_default',
    name: 'Projeto Padrão',
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
    const exists = fs.existsSync(dirPath);
    let isWritable = false;
    if (exists) {
      try {
        fs.accessSync(dirPath, fs.constants.W_OK);
        isWritable = true;
      } catch {
        isWritable = false;
      }
    }
    list.push({
      path: dirPath,
      exists,
      isWritable,
      addedAt: new Date().toISOString(),
    });
  }

  return list;
}

export function addAuthorizedDir(dirPath: string): { success: boolean; message: string; dirs: AuthorizedDir[] } {
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved)) {
    return { success: false, message: `Diretório '${resolved}' não existe no filesystem.`, dirs: getAuthorizedDirs() };
  }

  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    return { success: false, message: `O caminho especificado '${resolved}' não é um diretório.`, dirs: getAuthorizedDirs() };
  }

  const store = loadStore();
  if (!store.authorizedDirs.includes(resolved)) {
    store.authorizedDirs.push(resolved);
    saveStore(store);
  }

  return { success: true, message: `Diretório '${resolved}' adicionado com sucesso.`, dirs: getAuthorizedDirs() };
}

export function removeAuthorizedDir(dirPath: string): { success: boolean; dirs: AuthorizedDir[] } {
  const store = loadStore();
  store.authorizedDirs = store.authorizedDirs.filter((d) => path.resolve(d) !== path.resolve(dirPath));
  saveStore(store);
  return { success: true, dirs: getAuthorizedDirs() };
}

export function isPathAuthorized(targetPath: string): boolean {
  const store = loadStore();
  const resolved = path.resolve(targetPath);
  return store.authorizedDirs.some((authDir) => {
    const resolvedAuth = path.resolve(authDir);
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
  const validDirs = (associatedDirs || [process.cwd()]).filter((d) => fs.existsSync(d));

  const project: ProjectItem = {
    id,
    name,
    description,
    associatedDirs: validDirs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.projects.push(project);
  store.activeProjectId = id;
  saveStore(store);
  return project;
}

export function updateProject(id: string, updates: Partial<ProjectItem>): ProjectItem | null {
  const store = loadStore();
  const idx = store.projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  store.projects[idx] = {
    ...store.projects[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
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
export function inspectFilesAndDiffs(dirPath?: string): { files: string[]; diffs: FileDiffItem[]; gitStatus: string } {
  const store = loadStore();
  const targetDir = dirPath && isPathAuthorized(dirPath) ? dirPath : store.authorizedDirs[0] || process.cwd();

  if (!fs.existsSync(targetDir)) {
    return { files: [], diffs: [], gitStatus: 'Diretório não existe' };
  }

  const files: string[] = [];
  try {
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.name.startsWith('.git') && !e.name.startsWith('node_modules')) {
        files.push(e.name + (e.isDirectory() ? '/' : ''));
      }
    }
  } catch {
    // Continue
  }

  // Check Git diffs in target directory
  const diffs: FileDiffItem[] = [];
  let gitStatus = 'Não é um repositório Git ou sem alterações ativas.';

  try {
    const statusOutput = execSync('git status --porcelain', {
      cwd: targetDir,
      encoding: 'utf8',
      timeout: 3000,
    });

    if (statusOutput.trim()) {
      gitStatus = 'Repositório Git com alterações detectadas.';
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
            timeout: 2000,
          });
        } catch {
          // If untracked, diff against empty
          diff = `Arquivo não versionado: ${filePath}`;
        }

        diffs.push({
          path: filePath,
          status,
          diff: diff || `Alteração em: ${filePath} (${flag})`,
        });
      }
    } else {
      gitStatus = 'Repositório Git limpo (working tree clean).';
    }
  } catch (err: any) {
    gitStatus = `Git: ${err.message?.split('\n')[0] || 'indisponível'}`;
  }

  return { files, diffs, gitStatus };
}
