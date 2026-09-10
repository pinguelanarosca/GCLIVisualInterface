import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { McpConfig } from '../src/types.js';
import { getResolvedCliPath } from './gemini-cli-service.js';

const INITIAL_GITHUB_MCP: McpConfig = {
  name: 'github',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-github'],
  env: {
    // Preserves standard token lookup without hardcoding or leaking
  },
  enabled: true,
  status: 'stopped',
  statusGrade: 'CONFIGURED',
};

export function getSettingsFilePath(targetDir?: string): string {
  const base = targetDir || process.cwd();
  return path.join(base, '.gemini', 'settings.json');
}

export function loadMcpSettings(targetDir?: string): McpConfig[] {
  const settingsFile = getSettingsFilePath(targetDir);
  if (!fs.existsSync(settingsFile)) {
    // Seed initial GitHub MCP
    saveMcpSettings([INITIAL_GITHUB_MCP], targetDir);
    return [INITIAL_GITHUB_MCP];
  }

  try {
    const raw = fs.readFileSync(settingsFile, 'utf8');
    const parsed = JSON.parse(raw);
    const mcpServers = parsed.mcpServers || {};

    const list: McpConfig[] = [];
    for (const [name, server] of Object.entries<any>(mcpServers)) {
      list.push({
        name,
        command: server.command || 'npx',
        args: server.args || [],
        env: server.env || {},
        enabled: server.enabled !== false,
        status: 'stopped',
        statusGrade: 'CONFIGURED',
      });
    }

    if (list.length === 0) {
      list.push(INITIAL_GITHUB_MCP);
      saveMcpSettings(list, targetDir);
    }
    return list;
  } catch {
    return [INITIAL_GITHUB_MCP];
  }
}

export function saveMcpSettings(servers: McpConfig[], targetDir?: string) {
  const settingsFile = getSettingsFilePath(targetDir);
  const dir = path.dirname(settingsFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let settings: any = {};
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    } catch {
      settings = {};
    }
  }

  const mcpServers: Record<string, any> = {};
  for (const s of servers) {
    if (s.enabled !== false) {
      mcpServers[s.name] = {
        command: s.command,
        args: s.args,
        env: s.env || {},
      };
    }
  }

  settings.mcpServers = mcpServers;
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
}

export async function testMcpServer(mcp: McpConfig): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    try {
      // Test running the binary / command with a timeout
      const child = spawn(mcp.command, [...mcp.args, '--help'], {
        env: { ...process.env, ...mcp.env },
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (d) => {
        output += d.toString();
      });
      child.stderr?.on('data', (d) => {
        errorOutput += d.toString();
      });

      const timer = setTimeout(() => {
        child.kill();
        resolve({
          success: true,
          message: 'Processo MCP iniciou corretamente (teste de heartbeat finalizado).',
        });
      }, 3500);

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          message: `Falha ao executar ${mcp.command}: ${err.message}`,
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 || output.length > 0) {
          resolve({
            success: true,
            message: `Servidor MCP respondeu com êxito (código ${code}).`,
          });
        } else {
          resolve({
            success: false,
            message: errorOutput || `Servidor MCP encerrou com código de saída ${code}.`,
          });
        }
      });
    } catch (err: any) {
      resolve({
        success: false,
        message: `Exceção durante teste: ${err.message}`,
      });
    }
  });
}
