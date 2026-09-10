import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Terminal,
  FileCode,
  Sparkles,
  Bot,
  AlertTriangle,
  Loader2,
  Sliders,
} from 'lucide-react';
import { ChatMessage, ToolCallStep, CommandConfig, AgentConfig } from '../types.js';
import { DEFAULT_AGENTS } from '../constants/defaultAgents.js';

interface ChatViewProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (text: string) => void;
  onCancelExecution: () => void;
  commands: CommandConfig[];
  agents: AgentConfig[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  onPlayTts: (text: string, messageId: string) => void;
  currentlyNarratingId: string | null;
  onStopTts: () => void;
  onTranscribeAudio: (audioBlob: Blob) => Promise<string>;
  approvalMode: 'default' | 'auto_edit' | 'yolo' | 'plan';
  cliStatus?: import('../types.js').CliStatus | null;
  onOpenSettings?: (tab?: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onCancelExecution,
  commands,
  agents,
  selectedAgentId,
  onSelectAgent,
  onPlayTts,
  currentlyNarratingId,
  onStopTts,
  onTranscribeAudio,
  approvalMode,
  cliStatus,
  onOpenSettings,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [expandedToolCalls, setExpandedToolCalls] = useState<Record<string, boolean>>({});
  const [showCommandsPopup, setShowCommandsPopup] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Audio Recording State for STT
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  // Handle command autocomplete filtering
  const matchingCommands = commands.filter((c) =>
    inputText.startsWith('/') && c.name.toLowerCase().startsWith(inputText.split(' ')[0].toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (val.startsWith('/') && !val.includes(' ')) {
      setShowCommandsPopup(true);
      setSelectedCommandIndex(0);
    } else {
      setShowCommandsPopup(false);
    }
  };

  const selectCommand = (cmd: CommandConfig) => {
    setInputText(cmd.name + ' ');
    setShowCommandsPopup(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandsPopup && matchingCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev + 1) % matchingCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev - 1 + matchingCommands.length) % matchingCommands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectCommand(matchingCommands[selectedCommandIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowCommandsPopup(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setShowCommandsPopup(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const toggleToolCall = (id: string) => {
    setExpandedToolCalls((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Microphone recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        setIsTranscribing(true);
        try {
          const transcribedText = await onTranscribeAudio(audioBlob);
          if (transcribedText) {
            setInputText((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
          }
        } catch (err) {
          console.error('Transcription error:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      alert(`Permissão de microfone não concedida ou dispositivo inacessível: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const currentAgent =
    (agents && agents.length > 0 ? (agents.find((a) => a.id === selectedAgentId) || agents[0]) : null) ||
    DEFAULT_AGENTS[0];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/40 relative">
      {/* Missing or Invalid API Key Alert Banner */}
      {cliStatus && (!cliStatus.authConfigured || cliStatus.apiValid === false) && (
        <div className="mx-4 md:mx-8 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200 shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {!cliStatus.authConfigured ? (
                <>
                  <strong>GEMINI_API_KEY não detectada:</strong> Defina a variável de ambiente <code>GEMINI_API_KEY</code> para que o Gemini CLI execute as requisições.
                </>
              ) : (
                <>
                  <strong>Alerta de API:</strong> A chave no ambiente apresentou erro na validação com o Google Gemini. {cliStatus.apiError ? `(${cliStatus.apiError})` : ''}
                </>
              )}
            </span>
          </div>
          {onOpenSettings && (
            <button
              onClick={() => onOpenSettings('cli')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition whitespace-nowrap cursor-pointer shadow-xs"
            >
              Ver Status da API
            </button>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-12">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/10 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
              <Bot className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Gemini CLI {cliStatus?.version || '0.59.0'} Workspace
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
              Interface local operando diretamente o processo real do Gemini CLI. Digite uma instrução, utilize um
              comando operacional ou acione o ditado por voz.
            </p>

            {/* Quick Operational Shortcuts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-8 w-full">
              {commands.slice(0, 6).map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => selectCommand(cmd)}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition text-left group shadow-xs"
                >
                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                    {cmd.name}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                    {cmd.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isNarrating = currentlyNarratingId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-4xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`flex-1 rounded-2xl p-4 transition ${
                    isUser
                      ? 'bg-blue-600 text-white max-w-2xl ml-auto rounded-tr-none shadow-sm'
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-tl-none shadow-xs text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  {/* Assistant Header Info */}
                  {!isUser && (
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {msg.agentName || currentAgent?.displayName || 'Principal / Orchestrator'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200/60 dark:border-zinc-700/60">
                          {msg.model || currentAgent?.model || 'gemini-3.5-flash-lite'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* TTS Audio Narration Action */}
                        <button
                          onClick={() => {
                            if (isNarrating) {
                              onStopTts();
                            } else {
                              onPlayTts(msg.content, msg.id);
                            }
                          }}
                          title={isNarrating ? 'Pausar narração' : 'Ouvir resposta (TTS)'}
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition ${
                            isNarrating
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                              : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {isNarrating ? <Pause className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span>{isNarrating ? 'Pausar' : 'Ouvir'}</span>
                        </button>

                        {/* Copy text */}
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          title="Copiar texto"
                          className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                        >
                          {copiedMessageId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tool Invocations Accordion */}
                  {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {msg.toolCalls.map((tc) => {
                        const isExpanded = expandedToolCalls[tc.id];
                        return (
                          <div
                            key={tc.id}
                            className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 overflow-hidden text-xs"
                          >
                            <button
                              onClick={() => toggleToolCall(tc.id)}
                              className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition"
                            >
                              <div className="flex items-center gap-2">
                                <Terminal className="w-3.5 h-3.5 text-blue-500" />
                                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                                  {tc.toolName}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                                    tc.status === 'completed'
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                      : tc.status === 'running'
                                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 animate-pulse'
                                      : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                                  }`}
                                >
                                  {tc.status}
                                </span>
                              </div>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>

                            {isExpanded && (
                              <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800 font-mono text-[11px] bg-zinc-900 text-zinc-100 space-y-2 overflow-x-auto">
                                <div>
                                  <span className="text-zinc-400 block mb-1">Parâmetros:</span>
                                  <pre className="p-2 rounded bg-black/40 text-emerald-400">
                                    {JSON.stringify(tc.parameters, null, 2)}
                                  </pre>
                                </div>
                                {tc.result && (
                                  <div>
                                    <span className="text-zinc-400 block mb-1">Resultado:</span>
                                    <pre className="p-2 rounded bg-black/40 text-zinc-300 max-h-48 overflow-y-auto">
                                      {tc.result}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Main Message Content */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Timestamp */}
                  <div
                    className={`text-[10px] mt-2 font-mono ${
                      isUser ? 'text-blue-100 text-right' : 'text-zinc-400 text-left'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Cancel Button when running */}
      {isStreaming && (
        <div className="absolute top-4 right-6 z-10">
          <button
            onClick={onCancelExecution}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md transition animate-pulse"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Interromper CLI</span>
          </button>
        </div>
      )}

      {/* Input Bar Area */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-3 md:p-4 shrink-0 relative">
        {/* Commands Autocomplete Popup */}
        {showCommandsPopup && matchingCommands.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 md:left-8 md:right-8 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto z-30">
            <div className="px-3 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
              Comandos Operacionais Disponíveis
            </div>
            {matchingCommands.map((cmd, idx) => (
              <button
                key={cmd.name}
                onClick={() => selectCommand(cmd)}
                className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition ${
                  idx === selectedCommandIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                    : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{cmd.name}</span>
                  <span className="text-zinc-500 text-[11px] truncate">{cmd.description}</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">Tab/Enter</span>
              </button>
            ))}
          </div>
        )}

        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* Active Context Banner */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
            <div className="flex items-center gap-2">
              <span>Agente:</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{currentAgent?.displayName || 'Principal / Orchestrator'}</span>
              <span className="text-zinc-400">({currentAgent?.model || 'gemini-3.5-flash-lite'})</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Aprovação:</span>
              <span className="font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {approvalMode}
              </span>
            </div>
          </div>

          {/* Input Box */}
          <div className="flex items-end gap-2 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl p-2 border border-zinc-200 dark:border-zinc-700/60 focus-within:border-blue-500/80 focus-within:ring-2 focus-within:ring-blue-500/20 transition">
            {/* Microphone Button (STT) */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              title={isRecording ? 'Parar gravação e transcrever' : 'Ditado por voz (gemini-3.5-transcribe)'}
              className={`p-2.5 rounded-xl transition shrink-0 ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse shadow-sm'
                  : isTranscribing
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {isRecording ? (
                <Square className="w-4 h-4 fill-current" />
              ) : isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Recording Feedback Banner */}
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span>Gravando áudio ({recordingSeconds}s)... Fale claramente em português.</span>
                </div>
                <span className="text-[11px] text-zinc-500">Clique no botão para finalizar</span>
              </div>
            ) : isTranscribing ? (
              <div className="flex-1 flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Transcrevendo fala via modelo gemini-3.5-transcribe...</span>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Instrua o Gemini CLI... (digite '/' para comandos como /debug, /git:commit)"
                rows={1}
                className="flex-1 bg-transparent border-0 outline-none resize-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 px-2 py-1 max-h-44"
              />
            )}

            {/* Send / Stop Button */}
            {isStreaming ? (
              <button
                onClick={onCancelExecution}
                title="Interromper execução"
                className="p-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition shrink-0 shadow-sm"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isRecording || isTranscribing}
                title="Enviar para Gemini CLI (Enter)"
                className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
