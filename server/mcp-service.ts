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
        command: server.command,
        args: server.args || [],
        httpUrl: server.httpUrl,
        url: server.url,
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
      const serverConfig: any = {
        env: s.env || {},
      };

      if (s.command) serverConfig.command = s.command;
      if (s.args && s.args.length > 0) serverConfig.args = s.args;
      if (s.httpUrl) serverConfig.httpUrl = s.httpUrl;
      if (s.url) serverConfig.url = s.url;

      mcpServers[s.name] = serverConfig;
    }
  }

  settings.mcpServers = mcpServers;
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
}

export async function testMcpServer(mcp: McpConfig): Promise<{ success: boolean; message: string }> {
  // Case 1: URL / httpUrl (Remote SSE or HTTP MCP)
  if (mcp.httpUrl || mcp.url) {
    const targetUrl = mcp.httpUrl || mcp.url;
    try {
      // Basic heartbeat test
      const res = await fetch(targetUrl!, { method: 'GET' });
      if (res.ok || res.status === 405 || res.status === 404) {
        // Some MCP servers might return 405 Method Not Allowed or 404 for GET,
        // but if the server is there, it's a good sign.
        return {
          success: true,
          message: `Servidor MCP remoto detectado em ${targetUrl} (Status: ${res.status}).`,
        };
      }
      return {
        success: false,
        message: `Servidor MCP remoto retornou status de erro em ${targetUrl}: ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha ao conectar no servidor MCP remoto em ${targetUrl}: ${err.message}`,
      };
    }
  }

  // Case 2: Standard Command (Stdio MCP)
  if (!mcp.command) {
    return { success: false, message: 'Nenhum comando ou URL configurado para este MCP.' };
  }

  return new Promise((resolve) => {
    try {
      // Test running the binary / command with a timeout
      const child = spawn(mcp.command!, [...(mcp.args || []), '--help'], {
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
          message: `Processo MCP iniciou corretamente.\n\nSaída:\n${output}\n${errorOutput}`.trim(),
        });
      }, 5000);

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          message: `Falha ao executar ${mcp.command}: ${err.message}\n\nErro:\n${errorOutput}`.trim(),
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 || output.length > 0) {
          resolve({
            success: true,
            message: `Servidor MCP respondeu com êxito (código ${code}).\n\nSaída:\n${output}\n${errorOutput}`.trim(),
          });
        } else {
          resolve({
            success: false,
            message: `Servidor MCP encerrou com código de saída ${code}.\n\nErro:\n${errorOutput}`,
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
