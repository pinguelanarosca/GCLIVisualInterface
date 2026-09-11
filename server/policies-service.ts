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
      return true;
    }
    return false;
  } catch (err) {
    console.error('Erro ao renomear política:', err);
    return false;
  }
}
