import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.js';
import { ChatView } from './components/ChatView.js';
import { FilesAndDiffsView } from './components/FilesAndDiffsView.js';
import { AuthorizedDirsModal } from './components/AuthorizedDirsModal.js';
import { ProjectsModal } from './components/ProjectsModal.js';
import { HistoryDrawer } from './components/HistoryDrawer.js';
import { SettingsModal } from './components/SettingsModal.js';
import {
  CliStatus,
  ProjectItem,
  AuthorizedDir,
  AgentConfig,
  SkillConfig,
  CommandConfig,
  McpConfig,
  SessionItem,
  ChatMessage,
  AudioSettings,
} from './types.js';
import { DEFAULT_AGENTS } from './constants/defaultAgents.js';

export function App() {
  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Core CLI Status
  const [cliStatus, setCliStatus] = useState<CliStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [approvalMode, setApprovalMode] = useState<'default' | 'auto_edit' | 'yolo' | 'plan'>('default');

  // Navigation views
  const [activeView, setActiveView] = useState<'chat' | 'diffs'>('chat');

  // Projects & Authorized Directories
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);
  const [authorizedDirs, setAuthorizedDirs] = useState<AuthorizedDir[]>([]);

  // Agents, Skills, Commands, MCP
  const [agents, setAgents] = useState<AgentConfig[]>(DEFAULT_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('principal');
  const [skills, setSkills] = useState<SkillConfig[]>([]);
  const [commands, setCommands] = useState<CommandConfig[]>([]);
  const [mcpServers, setMcpServers] = useState<McpConfig[]>([]);

  // Sessions & Messages
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(`sess_${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Modals state
  const [isDirsModalOpen, setIsDirsModalOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string>('cli');

  // Audio Settings & Narration State
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    sttEnabled: true,
    sttModel: 'gemini-3.5-transcribe',
    ttsEnabled: true,
    ttsModel: 'gemini-3.1-flash-tts-preview',
    ttsVoice: 'Kore',
    ttsSpeed: 1.0,
    autoPlayTts: false,
    filterCodeInTts: true,
    filterDiffsInTts: true,
    micStatus: 'ready',
    audioModelStatus: {
      sttAvailable: true,
      ttsAvailable: true,
      liveAvailable: false,
    },
  });

  const [currentlyNarratingId, setCurrentlyNarratingId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initial Data Fetching
  const refreshStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setCliStatus(data);
        if (data.approvalMode) setApprovalMode(data.approvalMode);
      }
    } catch (err) {
      console.error('Failed to get CLI status:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const loadAllData = async () => {
    await refreshStatus();

    try {
      // Projects
      const projRes = await fetch('/api/projects');
      if (projRes.ok) {
        const projs: ProjectItem[] = await projRes.json();
        setProjects(projs);
        if (projs.length > 0 && !activeProject) {
          setActiveProject(projs[0]);
        }
      }

      // Authorized Dirs
      const dirsRes = await fetch('/api/directories');
      if (dirsRes.ok) {
        const dirs: AuthorizedDir[] = await dirsRes.json();
        setAuthorizedDirs(dirs);
      }

      // Agents
      const agentsRes = await fetch('/api/agents');
      if (agentsRes.ok) {
        const ags: AgentConfig[] = await agentsRes.json();
        setAgents(ags);
      }

      // Skills
      const skillsRes = await fetch('/api/skills');
      if (skillsRes.ok) {
        const sks: SkillConfig[] = await skillsRes.json();
        setSkills(sks);
      }

      // Commands
      const cmdsRes = await fetch('/api/commands');
      if (cmdsRes.ok) {
        const cmds: CommandConfig[] = await cmdsRes.json();
        setCommands(cmds);
      }

      // MCP
      const mcpRes = await fetch('/api/mcp');
      if (mcpRes.ok) {
        const mcps: McpConfig[] = await mcpRes.json();
        setMcpServers(mcps);
      }

      // Sessions
      const sessRes = await fetch('/api/sessions');
      if (sessRes.ok) {
        const sList: SessionItem[] = await sessRes.json();
        setSessions(sList);
      }
    } catch (err) {
      console.error('Failed to load initial configurations:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Theme change
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Handle execution of real Gemini CLI via SSE
  const handleSendMessage = async (promptText: string) => {
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
    };

    const currentAgent =
      (agents && agents.length > 0 ? (agents.find((a) => a.id === selectedAgentId) || agents[0]) : null) ||
      DEFAULT_AGENTS[0];

    const assistantMsgId = `asst_${Date.now() + 1}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      model: currentAgent?.model || 'gemini-3.5-flash-lite',
      agentName: currentAgent?.displayName || 'Principal Orchestrator',
      toolCalls: [],
      isStreaming: true,
    };

    const updatedMessages = [...messages, userMsg, assistantPlaceholder];
    setMessages(updatedMessages);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/cli/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          model: currentAgent?.model,
          approvalMode,
          authorizedDirs: authorizedDirs.map((d) => d.path),
          sessionId: currentSessionId,
          workDir: activeProject?.associatedDirs[0] || process.cwd(),
        }),
      });

      if (!response.body) {
        throw new Error('Nenhum fluxo de resposta retornado.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      let assistantContent = '';
      const toolCalls: Record<string, any> = {};

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (!rawData) continue;

            try {
              const eventPayload = JSON.parse(rawData);

              // Inspect Gemini CLI JSON stream event
              if (eventPayload.type === 'message') {
                if (eventPayload.role === 'assistant' && eventPayload.content) {
                  assistantContent += eventPayload.content;
                }
              } else if (eventPayload.type === 'tool_use') {
                const callId = eventPayload.tool_call_id || `tool_${Date.now()}`;
                toolCalls[callId] = {
                  id: callId,
                  toolName: eventPayload.name || 'tool',
                  parameters: eventPayload.parameters || {},
                  status: 'running',
                  timestamp: new Date().toISOString(),
                };
              } else if (eventPayload.type === 'tool_result') {
                const callId = eventPayload.tool_call_id;
                if (callId && toolCalls[callId]) {
                  toolCalls[callId].result = eventPayload.output || '';
                  toolCalls[callId].status = eventPayload.error ? 'failed' : 'completed';
                  if (eventPayload.error) {
                    toolCalls[callId].error = eventPayload.error;
                  }
                }
              } else if (eventPayload.text) {
                // Stdout / raw text
                assistantContent += (assistantContent ? '\n' : '') + eventPayload.text;
              }

              // Update UI message state
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: assistantContent,
                        toolCalls: Object.values(toolCalls),
                        isStreaming: true,
                      }
                    : m
                )
              );
            } catch {
              // Ignore non-JSON lines
            }
          }
        }
      }

      // Finalize message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: assistantContent || 'Operação concluída pelo Gemini CLI.',
                toolCalls: Object.values(toolCalls),
                isStreaming: false,
              }
            : m
        )
      );

      // Save session
      const finalMsgList = messages.concat([
        userMsg,
        {
          ...assistantPlaceholder,
          content: assistantContent || 'Operação concluída pelo Gemini CLI.',
          toolCalls: Object.values(toolCalls),
          isStreaming: false,
        },
      ]);

      const title =
        promptText.length > 40 ? promptText.slice(0, 40) + '...' : promptText;

      const savedSession: SessionItem = {
        id: currentSessionId,
        title,
        projectId: activeProject?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: finalMsgList.length,
        messages: finalMsgList,
        statusGrade: 'CONFIGURED',
      };

      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedSession),
      });

      // Reload sessions list
      const sessRes = await fetch('/api/sessions');
      if (sessRes.ok) {
        setSessions(await sessRes.json());
      }

      // Auto-play TTS if configured
      if (audioSettings.autoPlayTts && assistantContent) {
        handlePlayTts(assistantContent, assistantMsgId);
      }
    } catch (err: any) {
      console.error('Execution error:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: `Erro durante execução do Gemini CLI: ${err.message}`,
                isStreaming: false,
                error: err.message,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCancelExecution = async () => {
    try {
      await fetch('/api/cli/cancel', { method: 'POST' });
    } catch (err) {
      console.error('Failed to cancel CLI execution:', err);
    }
  };

  // Audio STT Handler (converts voice recording to text)
  const handleTranscribeAudio = async (audioBlob: Blob): Promise<string> => {
    // If user prefers browser-native SpeechRecognition or backend is unavailable
    if (audioSettings.sttModel === 'browser-native') {
      return '';
    }

    try {
      const buffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const res = await fetch('/api/audio/stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: audioBlob.type || 'audio/webm',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.text || '';
      }
    } catch (err) {
      console.error('Transcription request failed:', err);
    }
    return '';
  };

  // Audio TTS Handler (synthesizes assistant text to audio)
  const handlePlayTts = async (text: string, messageId: string) => {
    if (currentlyNarratingId === messageId) {
      handleStopTts();
      return;
    }

    handleStopTts();
    setCurrentlyNarratingId(messageId);

    // If browser native fallback
    if (audioSettings.ttsModel === 'browser-native' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = audioSettings.ttsSpeed || 1.0;
      utterance.onend = () => setCurrentlyNarratingId(null);
      utterance.onerror = () => setCurrentlyNarratingId(null);
      window.speechSynthesis.speak(utterance);
      return;
    }

    // Call server Gemini 3.1 Flash TTS Preview
    try {
      const res = await fetch('/api/audio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: audioSettings.ttsVoice || 'Kore',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
          currentAudioRef.current = audio;
          audio.playbackRate = audioSettings.ttsSpeed || 1.0;
          audio.onended = () => setCurrentlyNarratingId(null);
          audio.onerror = () => {
            // Fallback to Web Speech API
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(text);
              window.speechSynthesis.speak(utterance);
            }
            setCurrentlyNarratingId(null);
          };
          audio.play();
          return;
        }
      }
    } catch (err) {
      console.error('TTS request failed, attempting local Web Speech API:', err);
    }

    // Fallback if network or model failed
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = audioSettings.ttsSpeed || 1.0;
      utterance.onend = () => setCurrentlyNarratingId(null);
      utterance.onerror = () => setCurrentlyNarratingId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setCurrentlyNarratingId(null);
    }
  };

  const handleStopTts = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentlyNarratingId(null);
  };

  // Projects CRUD handlers
  const handleCreateProject = async (name: string, description: string, dirs: string[]) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, associatedDirs: dirs }),
    });
    if (res.ok) {
      const newProj = await res.json();
      setProjects((prev) => [...prev, newProj]);
      setActiveProject(newProj);
    }
  };

  const handleUpdateProject = async (id: string, updates: Partial<ProjectItem>) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (activeProject?.id === id) setActiveProject(updated);
    }
  };

  const handleDeleteProject = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(projects.find((p) => p.id !== id) || null);
      }
    }
  };

  // Authorized Dirs handlers
  const handleAddDir = async (dirPath: string) => {
    const res = await fetch('/api/directories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dirPath }),
    });
    const data = await res.json();
    if (data.dirs) setAuthorizedDirs(data.dirs);
    return data;
  };

  const handleRemoveDir = async (dirPath: string) => {
    const res = await fetch('/api/directories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dirPath }),
    });
    const data = await res.json();
    if (data.dirs) setAuthorizedDirs(data.dirs);
    return data;
  };

  // Sessions handlers
  const handleSelectSession = (sess: SessionItem) => {
    setCurrentSessionId(sess.id);
    setMessages(sess.messages || []);
    if (sess.projectId) {
      const p = projects.find((x) => x.id === sess.projectId);
      if (p) setActiveProject(p);
    }
  };

  const handleNewSession = () => {
    setCurrentSessionId(`sess_${Date.now()}`);
    setMessages([]);
  };

  const handleDeleteSession = async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      handleNewSession();
    }
  };

  // Configuration saves
  const handleSaveAgent = async (agent: AgentConfig) => {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    });
    if (res.ok) {
      const data = await res.json();
      setAgents(data.agents);
    }
  };

  const handleSaveSkill = async (skill: SkillConfig) => {
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skill),
    });
    if (res.ok) {
      const data = await res.json();
      setSkills(data.skills);
    }
  };

  const handleDeleteSkill = async (name: string) => {
    const res = await fetch(`/api/skills/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      setSkills(data.skills);
    }
  };

  const handleSaveCommand = async (cmd: CommandConfig) => {
    const res = await fetch('/api/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
    });
    if (res.ok) {
      const data = await res.json();
      setCommands(data.commands);
    }
  };

  const handleDeleteCommand = async (name: string) => {
    const res = await fetch(`/api/commands/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      setCommands(data.commands);
    }
  };

  const handleSaveMcpServers = async (servers: McpConfig[]) => {
    const res = await fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(servers),
    });
    if (res.ok) {
      const data = await res.json();
      setMcpServers(data.servers);
    }
  };

  const handleTestMcp = async (mcp: McpConfig) => {
    const res = await fetch('/api/mcp/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mcp),
    });
    return await res.json();
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased font-sans">
      {/* App Header */}
      <Header
        cliStatus={cliStatus}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={setActiveProject}
        onOpenProjectsModal={() => setIsProjectsModalOpen(true)}
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={setSelectedAgentId}
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenDirsModal={() => setIsDirsModalOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={(tab) => {
          if (tab) setSettingsTab(tab);
          setIsSettingsOpen(true);
        }}
        autoPlayTts={audioSettings.autoPlayTts}
        onToggleAutoPlayTts={() =>
          setAudioSettings((prev) => ({ ...prev, autoPlayTts: !prev.autoPlayTts }))
        }
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onRefreshStatus={refreshStatus}
        isCheckingStatus={isCheckingStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {activeView === 'chat' ? (
          <ChatView
            messages={messages}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            onCancelExecution={handleCancelExecution}
            commands={commands}
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onPlayTts={handlePlayTts}
            currentlyNarratingId={currentlyNarratingId}
            onStopTts={handleStopTts}
            onTranscribeAudio={handleTranscribeAudio}
            approvalMode={approvalMode}
          />
        ) : (
          <FilesAndDiffsView
            currentDir={activeProject?.associatedDirs[0] || process.cwd()}
          />
        )}
      </main>

      {/* Authorized Directories Modal */}
      <AuthorizedDirsModal
        isOpen={isDirsModalOpen}
        onClose={() => setIsDirsModalOpen(false)}
        authorizedDirs={authorizedDirs}
        onAddDir={handleAddDir}
        onRemoveDir={handleRemoveDir}
      />

      {/* Projects Modal */}
      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={setActiveProject}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        activeSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        projects={projects}
      />

      {/* Multi-Tab Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
        cliStatus={cliStatus}
        agents={agents}
        onSaveAgent={handleSaveAgent}
        skills={skills}
        onSaveSkill={handleSaveSkill}
        onDeleteSkill={handleDeleteSkill}
        commands={commands}
        onSaveCommand={handleSaveCommand}
        onDeleteCommand={handleDeleteCommand}
        mcpServers={mcpServers}
        onSaveMcpServers={handleSaveMcpServers}
        onTestMcp={handleTestMcp}
        audioSettings={audioSettings}
        onUpdateAudioSettings={(updates) =>
          setAudioSettings((prev) => ({ ...prev, ...updates }))
        }
        approvalMode={approvalMode}
        onChangeApprovalMode={setApprovalMode}
      />
    </div>
  );
}

export default App;
