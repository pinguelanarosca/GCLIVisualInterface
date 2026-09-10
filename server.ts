import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { detectCliStatus, executeGeminiCli, cancelActiveExecution, setCustomCliPath } from './server/gemini-cli-service.js';
import { ensureAgentsSeeded, loadAgents, saveAgentToFile, deleteAgent } from './server/agents-service.js';
import { ensureSkillsSeeded, loadSkills, saveSkillToFile, deleteSkill } from './server/skills-service.js';
import { ensureCommandsSeeded, loadCommands, saveCommandToFile, deleteCommand } from './server/commands-service.js';
import { loadMcpSettings, saveMcpSettings, testMcpServer } from './server/mcp-service.js';
import {
  getAuthorizedDirs,
  addAuthorizedDir,
  removeAuthorizedDir,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getSessions,
  saveSession,
  deleteSession,
  inspectFilesAndDiffs,
} from './server/projects-and-dirs-service.js';
import { checkAudioModelsAvailability, transcribeAudio, synthesizeSpeech } from './server/audio-service.js';
import { getSystemValidationMatrix, buildPackagingArtifacts } from './server/packaging-service.js';

const PORT = 3000;

async function startServer() {
  const app = express();

  // Generous limit for audio base64 uploads
  app.use(express.json({ limit: '25mb' }));

  // Seed default agents, skills, commands, MCP
  ensureAgentsSeeded();
  ensureSkillsSeeded();
  ensureCommandsSeeded();
  loadMcpSettings();

  // --- API ROUTES ---

  // 1. Status & CLI Information
  app.get('/api/status', async (req, res) => {
    const status = await detectCliStatus();
    res.json(status);
  });

  app.post('/api/cli/config', (req, res) => {
    const { cliPath } = req.body;
    if (typeof cliPath === 'string') {
      setCustomCliPath(cliPath);
    }
    res.json({ success: true });
  });

  // 2. Real Execution via Server-Sent Events (SSE)
  app.post('/api/cli/execute', (req, res) => {
    const { prompt, model, approvalMode, authorizedDirs, sessionId, workDir } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório.' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const sendSse = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendSse('start', { timestamp: new Date().toISOString() });

    const execution = executeGeminiCli({
      prompt,
      model,
      approvalMode,
      authorizedDirs,
      sessionId,
      workDir,
      onEvent: (evt) => {
        sendSse(evt.type, evt.data);
      },
      onDone: (exitCode, signal) => {
        sendSse('done', { exitCode, signal });
        res.end();
      },
      onError: (err) => {
        sendSse('error', { message: err.message });
        res.end();
      },
    });

    req.on('close', () => {
      execution.cancel();
    });
  });

  app.post('/api/cli/cancel', (req, res) => {
    const cancelled = cancelActiveExecution();
    res.json({ success: cancelled });
  });

  // 3. Agents
  app.get('/api/agents', (req, res) => {
    const agents = loadAgents();
    res.json(agents);
  });

  app.post('/api/agents', (req, res) => {
    const agent = req.body;
    if (!agent || !agent.name) {
      return res.status(400).json({ error: 'Dados do agente inválidos.' });
    }
    saveAgentToFile(agent);
    res.json({ success: true, agents: loadAgents() });
  });

  app.delete('/api/agents/:name', (req, res) => {
    const { name } = req.params;
    const ok = deleteAgent(name);
    res.json({ success: ok, agents: loadAgents() });
  });

  // 4. Skills
  app.get('/api/skills', (req, res) => {
    const skills = loadSkills();
    res.json(skills);
  });

  app.post('/api/skills', (req, res) => {
    const skill = req.body;
    if (!skill || !skill.name) {
      return res.status(400).json({ error: 'Dados da skill inválidos.' });
    }
    saveSkillToFile(skill);
    res.json({ success: true, skills: loadSkills() });
  });

  app.delete('/api/skills/:name', (req, res) => {
    const { name } = req.params;
    const ok = deleteSkill(name);
    res.json({ success: ok, skills: loadSkills() });
  });

  // 5. Commands
  app.get('/api/commands', (req, res) => {
    const commands = loadCommands();
    res.json(commands);
  });

  app.post('/api/commands', (req, res) => {
    const cmd = req.body;
    if (!cmd || !cmd.name) {
      return res.status(400).json({ error: 'Dados do comando inválidos.' });
    }
    saveCommandToFile(cmd);
    res.json({ success: true, commands: loadCommands() });
  });

  app.delete('/api/commands/:name', (req, res) => {
    const { name } = req.params;
    const ok = deleteCommand(name);
    res.json({ success: ok, commands: loadCommands() });
  });

  // 6. MCP
  app.get('/api/mcp', (req, res) => {
    const servers = loadMcpSettings();
    res.json(servers);
  });

  app.post('/api/mcp', (req, res) => {
    const servers = req.body;
    if (!Array.isArray(servers)) {
      return res.status(400).json({ error: 'Lista esperada de servidores MCP.' });
    }
    saveMcpSettings(servers);
    res.json({ success: true, servers: loadMcpSettings() });
  });

  app.post('/api/mcp/test', async (req, res) => {
    const mcp = req.body;
    if (!mcp || !mcp.command) {
      return res.status(400).json({ success: false, message: 'Configuração MCP inválida.' });
    }
    const result = await testMcpServer(mcp);
    res.json(result);
  });

  // 7. Authorized Directories
  app.get('/api/directories', (req, res) => {
    res.json(getAuthorizedDirs());
  });

  app.post('/api/directories', (req, res) => {
    const { path: dirPath } = req.body;
    if (!dirPath) {
      return res.status(400).json({ error: 'Caminho do diretório é obrigatório.' });
    }
    const result = addAuthorizedDir(dirPath);
    res.json(result);
  });

  app.delete('/api/directories', (req, res) => {
    const { path: dirPath } = req.body;
    if (!dirPath) {
      return res.status(400).json({ error: 'Caminho do diretório é obrigatório.' });
    }
    const result = removeAuthorizedDir(dirPath);
    res.json(result);
  });

  // 8. Projects
  app.get('/api/projects', (req, res) => {
    res.json(getProjects());
  });

  app.post('/api/projects', (req, res) => {
    const { name, description, associatedDirs } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nome do projeto é obrigatório.' });
    }
    const project = createProject(name, description || '', associatedDirs);
    res.json(project);
  });

  app.put('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    const updated = updateProject(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Projeto não encontrado.' });
    res.json(updated);
  });

  app.delete('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    deleteProject(id);
    res.json({ success: true });
  });

  // 9. Sessions & History
  app.get('/api/sessions', (req, res) => {
    const { projectId } = req.query;
    res.json(getSessions(projectId as string));
  });

  app.post('/api/sessions', (req, res) => {
    const session = req.body;
    if (!session || !session.id) {
      return res.status(400).json({ error: 'Sessão inválida.' });
    }
    const saved = saveSession(session);
    res.json(saved);
  });

  app.delete('/api/sessions/:id', (req, res) => {
    const { id } = req.params;
    deleteSession(id);
    res.json({ success: true });
  });

  // 10. Files and Real Diffs
  app.get('/api/files', (req, res) => {
    const { dir } = req.query;
    const result = inspectFilesAndDiffs(dir as string);
    res.json(result);
  });

  // 11. Audio Interface Layer (STT & TTS)
  app.get('/api/audio/status', async (req, res) => {
    const status = await checkAudioModelsAvailability();
    res.json(status);
  });

  app.post('/api/audio/stt', async (req, res) => {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Dados de áudio não fornecidos.' });
    }
    const result = await transcribeAudio(audioBase64, mimeType);
    res.json(result);
  });

  app.post('/api/audio/tts', async (req, res) => {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Texto para narração é obrigatório.' });
    }
    const result = await synthesizeSpeech(text, voice);
    res.json(result);
  });

  // 12. Packaging & Status Distinction Matrix
  app.get('/api/packaging/matrix', (req, res) => {
    res.json(getSystemValidationMatrix());
  });

  app.post('/api/packaging/build', (req, res) => {
    const result = buildPackagingArtifacts();
    res.json(result);
  });

  // --- Vite middleware / static files ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gemini CLI GUI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
