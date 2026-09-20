import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PolicyConfig } from '../src/types.js';

export function getUserPoliciesDirectory(): string {
  return path.join(os.homedir(), '.gemini', 'policies');
}

export function getPoliciesDirectory(targetDir?: string): string {
  const base = targetDir || process.cwd();
  return path.join(base, '.gemini', 'policies');
}

export const DEFAULT_DENY_GOOGLE_SEARCH_TOML = `# User Policy: Global Denial of Google Web Search
# Enforces Policy Engine restriction on google_web_search and routes search requests to Exa (web_search_exa)

[[rule]]
name = "Deny Google Web Search"
toolName = "google_web_search"
decision = "deny"
priority = 1000
denyMessage = "google_web_search está desativado globalmente pela Política de Segurança. Utilize a ferramenta web_search_exa do MCP Exa."
modes = ["default", "autoEdit", "yolo", "plan"]
`;

export function ensureDefaultUserPolicies(): void {
  const userDir = getUserPoliciesDirectory();
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const defaultUserPolicyPath = path.join(userDir, 'deny-google-search.toml');
  if (!fs.existsSync(defaultUserPolicyPath)) {
    fs.writeFileSync(defaultUserPolicyPath, DEFAULT_DENY_GOOGLE_SEARCH_TOML, 'utf8');
  }

  // Sincronizar também no workspace para redundância
  const workspaceDir = getPoliciesDirectory();
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }
  const defaultWsPolicyPath = path.join(workspaceDir, 'deny-google-search.toml');
  if (!fs.existsSync(defaultWsPolicyPath)) {
    fs.writeFileSync(defaultWsPolicyPath, DEFAULT_DENY_GOOGLE_SEARCH_TOML, 'utf8');
  }
}

export function loadPolicies(targetDir?: string): PolicyConfig[] {
  ensureDefaultUserPolicies();

  const userDir = getUserPoliciesDirectory();
  const wsDir = getPoliciesDirectory(targetDir);

  const policyDirs = Array.from(new Set([userDir, wsDir]));
  const loadedMap = new Map<string, PolicyConfig>();

  for (const pDir of policyDirs) {
    if (!fs.existsSync(pDir)) {
      try {
        fs.mkdirSync(pDir, { recursive: true });
      } catch {}
      continue;
    }

    try {
      const files = fs.readdirSync(pDir).filter((f) => f.endsWith('.toml'));
      for (const file of files) {
        if (!loadedMap.has(file)) {
          const filePath = path.join(pDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          loadedMap.set(file, {
            filename: file,
            content,
          });
        }
      }
    } catch (err) {
      console.error(`Erro ao carregar políticas do diretório ${pDir}:`, err);
    }
  }

  return Array.from(loadedMap.values());
}

export function syncPoliciesToSettings(targetDir?: string): void {
  try {
    ensureDefaultUserPolicies();

    const base = targetDir || process.cwd();
    const userDir = getUserPoliciesDirectory();
    const wsDir = path.join(base, '.gemini', 'policies');

    if (!fs.existsSync(wsDir)) {
      fs.mkdirSync(wsDir, { recursive: true });
    }

    const settingsPath = path.join(base, '.gemini', 'settings.json');
    let settings: any = {};
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch {
        settings = {};
      }
    }

    const systemDir = '/etc/gemini-cli/policies';
    const allDirs = Array.from(new Set([systemDir, userDir, wsDir]));
    const allPaths: string[] = [];

    for (const d of allDirs) {
      if (fs.existsSync(d)) {
        allPaths.push(d);
      }
    }

    settings.policyPaths = allPaths;
    settings.adminPolicyPaths = allPaths;

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

    // Sincronizar também no ~/.gemini/settings.json
    const globalSettingsPath = path.join(os.homedir(), '.gemini', 'settings.json');
    let globalSettings: any = {};
    if (fs.existsSync(globalSettingsPath)) {
      try {
        globalSettings = JSON.parse(fs.readFileSync(globalSettingsPath, 'utf8'));
      } catch {
        globalSettings = {};
      }
    }
    globalSettings.policyPaths = allPaths;
    globalSettings.adminPolicyPaths = allPaths;
    fs.writeFileSync(globalSettingsPath, JSON.stringify(globalSettings, null, 2), 'utf8');

  } catch (err) {
    console.error('Erro ao sincronizar políticas no settings.json:', err);
  }
}

export function savePolicy(filename: string, content: string, targetDir?: string): boolean {
  try {
    let finalFilename = filename;
    if (!finalFilename.endsWith('.toml')) {
      finalFilename += '.toml';
    }

    const userDir = getUserPoliciesDirectory();
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    fs.writeFileSync(path.join(userDir, finalFilename), content, 'utf8');

    const wsDir = getPoliciesDirectory(targetDir);
    if (!fs.existsSync(wsDir)) {
      fs.mkdirSync(wsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(wsDir, finalFilename), content, 'utf8');

    syncPoliciesToSettings(targetDir);
    return true;
  } catch (err) {
    console.error('Erro ao salvar política:', err);
    return false;
  }
}

export function deletePolicy(filename: string, targetDir?: string): boolean {
  try {
    const userDir = getUserPoliciesDirectory();
    const userPath = path.join(userDir, filename);
    if (fs.existsSync(userPath)) {
      fs.unlinkSync(userPath);
    }

    const wsDir = getPoliciesDirectory(targetDir);
    const wsPath = path.join(wsDir, filename);
    if (fs.existsSync(wsPath)) {
      fs.unlinkSync(wsPath);
    }

    syncPoliciesToSettings(targetDir);
    return true;
  } catch (err) {
    console.error('Erro ao deletar política:', err);
    return false;
  }
}

export function renamePolicy(oldFilename: string, newFilename: string, targetDir?: string): boolean {
  try {
    let finalNewFilename = newFilename;
    if (!finalNewFilename.endsWith('.toml')) {
      finalNewFilename += '.toml';
    }

    const userDir = getUserPoliciesDirectory();
    const oldUserPath = path.join(userDir, oldFilename);
    const newUserPath = path.join(userDir, finalNewFilename);
    if (fs.existsSync(oldUserPath)) {
      fs.renameSync(oldUserPath, newUserPath);
    }

    const wsDir = getPoliciesDirectory(targetDir);
    const oldWsPath = path.join(wsDir, oldFilename);
    const newWsPath = path.join(wsDir, finalNewFilename);
    if (fs.existsSync(oldWsPath)) {
      fs.renameSync(oldWsPath, newWsPath);
    }

    syncPoliciesToSettings(targetDir);
    return true;
  } catch (err) {
    console.error('Erro ao renomear política:', err);
    return false;
  }
}

