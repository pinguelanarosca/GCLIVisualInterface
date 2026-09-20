import fs from 'node:fs';
import path from 'node:path';
import { PolicyConfig } from '../src/types.js';

export function getPoliciesDirectory(targetDir?: string): string {
  const base = targetDir || process.cwd();
  return path.join(base, '.gemini', 'policies');
}

export function loadPolicies(targetDir?: string): PolicyConfig[] {
  const policiesDir = getPoliciesDirectory(targetDir);
  if (!fs.existsSync(policiesDir)) {
    fs.mkdirSync(policiesDir, { recursive: true });
    return [];
  }

  try {
    const files = fs.readdirSync(policiesDir).filter((f) => f.endsWith('.toml'));
    const list: PolicyConfig[] = [];

    for (const file of files) {
      const filePath = path.join(policiesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      list.push({
        filename: file,
        content: content,
      });
    }

    return list;
  } catch (err) {
    console.error('Erro ao carregar políticas:', err);
    return [];
  }
}

export function syncPoliciesToSettings(targetDir?: string): void {
  try {
    const base = targetDir || process.cwd();
    const policiesDir = path.join(base, '.gemini', 'policies');
    if (!fs.existsSync(policiesDir)) {
      fs.mkdirSync(policiesDir, { recursive: true });
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

    const files = fs.readdirSync(policiesDir).filter((f) => f.endsWith('.toml'));
    const policyFiles = files.map((f) => path.join(policiesDir, f));
    const allPaths = [policiesDir, ...policyFiles];

    settings.policyPaths = Array.from(new Set([...(settings.policyPaths || []), ...allPaths]));
    settings.adminPolicyPaths = Array.from(new Set([...(settings.adminPolicyPaths || []), ...allPaths]));

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

    if (path.resolve(base) !== path.resolve(process.cwd())) {
      const rootSettings = path.join(process.cwd(), '.gemini', 'settings.json');
      fs.writeFileSync(rootSettings, JSON.stringify(settings, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Erro ao sincronizar políticas no settings.json:', err);
  }
}

export function savePolicy(filename: string, content: string, targetDir?: string): boolean {
  try {
    const policiesDir = getPoliciesDirectory(targetDir);
    if (!fs.existsSync(policiesDir)) {
      fs.mkdirSync(policiesDir, { recursive: true });
    }

    // Ensure extension is .toml
    let finalFilename = filename;
    if (!finalFilename.endsWith('.toml')) {
      finalFilename += '.toml';
    }

    const filePath = path.join(policiesDir, finalFilename);
    fs.writeFileSync(filePath, content, 'utf8');
    syncPoliciesToSettings(targetDir);
    return true;
  } catch (err) {
    console.error('Erro ao salvar política:', err);
    return false;
  }
}

export function deletePolicy(filename: string, targetDir?: string): boolean {
  try {
    const policiesDir = getPoliciesDirectory(targetDir);
    const filePath = path.join(policiesDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      syncPoliciesToSettings(targetDir);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Erro ao deletar política:', err);
    return false;
  }
}

export function renamePolicy(oldFilename: string, newFilename: string, targetDir?: string): boolean {
  try {
    const policiesDir = getPoliciesDirectory(targetDir);
    const oldPath = path.join(policiesDir, oldFilename);
    
    let finalNewFilename = newFilename;
    if (!finalNewFilename.endsWith('.toml')) {
      finalNewFilename += '.toml';
    }
    
    const newPath = path.join(policiesDir, finalNewFilename);

    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      syncPoliciesToSettings(targetDir);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Erro ao renomear política:', err);
    return false;
  }
}
