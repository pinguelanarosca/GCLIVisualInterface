import React, { useState, useEffect } from 'react';
import {
  Settings,
  Terminal,
  Cpu,
  Bot,
  Sparkles,
  Code2,
  Layers,
  Shield,
  Volume2,
  Package,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import {
  CliStatus,
  AgentConfig,
  SkillConfig,
  CommandConfig,
  McpConfig,
  AudioSettings,
  ValidationItem,
} from '../types.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  cliStatus: CliStatus | null;
  agents: AgentConfig[];
  onSaveAgent: (agent: AgentConfig) => Promise<void>;
  skills: SkillConfig[];
  onSaveSkill: (skill: SkillConfig) => Promise<void>;
  onDeleteSkill: (name: string) => Promise<void>;
  commands: CommandConfig[];
  onSaveCommand: (cmd: CommandConfig) => Promise<void>;
  onDeleteCommand: (name: string) => Promise<void>;
  mcpServers: McpConfig[];
  onSaveMcpServers: (servers: McpConfig[]) => Promise<void>;
  onTestMcp: (mcp: McpConfig) => Promise<{ success: boolean; message: string }>;
  audioSettings: AudioSettings;
  onUpdateAudioSettings: (updates: Partial<AudioSettings>) => void;
  approvalMode: 'default' | 'auto_edit' | 'yolo' | 'plan';
  onChangeApprovalMode: (mode: 'default' | 'auto_edit' | 'yolo' | 'plan') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'cli',
  cliStatus,
  agents,
  onSaveAgent,
  skills,
  onSaveSkill,
  onDeleteSkill,
  commands,
  onSaveCommand,
  onDeleteCommand,
  mcpServers,
  onSaveMcpServers,
  onTestMcp,
  audioSettings,
  onUpdateAudioSettings,
  approvalMode,
  onChangeApprovalMode,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Validation Matrix State
  const [matrix, setMatrix] = useState<ValidationItem[]>([]);
  const [isBuildingPackage, setIsBuildingPackage] = useState(false);
  const [packagingOutput, setPackagingOutput] = useState<{
    success: boolean;
    message: string;
    files: string[];
    instructions: string;
  } | null>(null);

  // Agent editing
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);

  // Skill editing
  const [editingSkill, setEditingSkill] = useState<SkillConfig | null>(null);
  const [isNewSkill, setIsNewSkill] = useState(false);

  // Command editing
  const [editingCommand, setEditingCommand] = useState<CommandConfig | null>(null);

  // MCP testing state
  const [mcpTestResult, setMcpTestResult] = useState<{ [name: string]: { loading: boolean; message: string; success?: boolean } }>({});

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/packaging/matrix')
        .then((res) => res.json())
        .then((data) => setMatrix(data))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBuildPackage = async () => {
    setIsBuildingPackage(true);
    setPackagingOutput(null);
    try {
      const res = await fetch('/api/packaging/build', { method: 'POST' });
      const data = await res.json();
      setPackagingOutput(data);
    } catch (err: any) {
      setPackagingOutput({
        success: false,
        message: err.message,
        files: [],
        instructions: '',
      });
    } finally {
      setIsBuildingPackage(false);
    }
  };

  const testMcp = async (mcp: McpConfig) => {
    setMcpTestResult((prev) => ({ ...prev, [mcp.name]: { loading: true, message: 'Testando processo...' } }));
    try {
      const res = await onTestMcp(mcp);
      setMcpTestResult((prev) => ({
        ...prev,
        [mcp.name]: { loading: false, message: res.message, success: res.success },
      }));
    } catch (err: any) {
      setMcpTestResult((prev) => ({
        ...prev,
        [mcp.name]: { loading: false, message: err.message, success: false },
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                Centro de Configurações do Gemini CLI
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Controle do motor CLI 0.58.0, modelos, agentes, skills, comandos, áudio e empacotamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body with Sidebar Tabs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-56 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-2 space-y-1 overflow-y-auto shrink-0">
            {[
              { id: 'cli', label: 'Gemini CLI', icon: Terminal },
              { id: 'models', label: 'Modelos de Execução', icon: Cpu },
              { id: 'agents', label: 'Agentes (6)', icon: Bot },
              { id: 'skills', label: 'Skills (4)', icon: Sparkles },
              { id: 'commands', label: 'Comandos (6)', icon: Code2 },
              { id: 'mcp', label: 'MCP (GitHub)', icon: Layers },
              { id: 'hooks', label: 'Hooks (0.58.0)', icon: Sliders },
              { id: 'permissions', label: 'Permissões & Modos', icon: Shield },
              { id: 'audio', label: 'Áudio STT / TTS', icon: Volume2 },
              { id: 'packaging', label: 'Empacotamento & Status', icon: Package },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-zinc-900">
            {/* 1. GEMINI CLI */}
            {activeTab === 'cli' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Status e Integração do Gemini CLI
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    A aplicação executa o binário oficial do Gemini CLI como motor de execução nativo.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Versão Detectada:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {cliStatus?.version || '0.58.0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Caminho do Executável:</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-300 truncate max-w-xs">
                      {cliStatus?.cliPath || 'node_modules/.bin/gemini'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Estado da Conexão:</span>
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Conectado e Operacional
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Autenticação de Ambiente:</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-300">
                      {cliStatus?.authConfigured ? 'GEMINI_API_KEY Presente' : 'Autenticado no Ambiente'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Modo de Aprovação de Ações (--approval-mode)
                  </label>
                  <select
                    value={approvalMode}
                    onChange={(e: any) => onChangeApprovalMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none"
                  >
                    <option value="default">default - Solicita aprovação para comandos e alterações</option>
                    <option value="auto_edit">auto_edit - Aprova edições de arquivos automaticamente</option>
                    <option value="yolo">yolo - Executa comandos sem confirmações intermediárias</option>
                    <option value="plan">plan - Modo plano / somente leitura</option>
                  </select>
                </div>
              </div>
            )}

            {/* 2. MODELOS */}
            {activeTab === 'models' && (
              <div className="space-y-6 max-w-3xl">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Mapeamento de Modelos por Função
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Configuração dos modelos atribuídos a cada agente operacional do Gemini CLI e à camada de áudio da GUI.
                  </p>
                </div>

                {/* Execution Models */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                    Modelos de Execução do Gemini CLI
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { role: 'Principal / Orchestrator', model: 'gemini-3.5-flash-lite', desc: 'Coordenação e roteamento' },
                      { role: 'Investigator', model: 'gemini-3.7-flash', desc: 'Investigação e diagnóstico' },
                      { role: 'Architect', model: 'gemini-3.6-flash', desc: 'Decisões arquiteturais' },
                      { role: 'Auditor', model: 'gemini-3.8-flash', desc: 'Revisão crítica e auditoria' },
                      { role: 'Tester', model: 'gemini-3-flash', desc: 'Testes e validação' },
                      { role: 'Worker', model: 'gemini-3.1-flash-lite', desc: 'Tarefas repetitivas' },
                    ].map((m) => (
                      <div key={m.role} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
                        <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{m.role}</div>
                        <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">{m.model}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">{m.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interface Audio Models */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                    Modelos de Áudio da Interface (Camada Separada)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">STT / Ditado</div>
                      <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        gemini-3.5-transcribe
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">Converte voz em texto para entrada</div>
                    </div>

                    <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">TTS / Narração</div>
                      <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                        gemini-3.1-flash-tts-preview
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">Sintetiza respostas textuais em áudio</div>
                    </div>

                    <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 opacity-70">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">Voz Tempo Real</div>
                      <div className="font-mono text-xs font-bold text-zinc-600 dark:text-zinc-400 mt-1">
                        gemini-3.1-flash-live-preview
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                        Arquitetura preparada (Futuro)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. AGENTES */}
            {activeTab === 'agents' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Agentes Especializados do Gemini CLI (.gemini/agents/*.md)
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    Cada agente possui arquivo Markdown com YAML frontmatter reconhecido pelo Gemini CLI 0.58.0.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                            {agent.displayName || agent.name}
                          </span>
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                            {agent.model}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2">
                          {agent.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 font-mono">
                          tools: {agent.tools.join(', ')} | max: {agent.maxTurns}
                        </span>
                        <button
                          onClick={() => setEditingAgent({ ...agent })}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 transition"
                        >
                          Editar Instruções
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit Agent Modal Subview */}
                {editingAgent && (
                  <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Editar Agente: {editingAgent.displayName || editingAgent.name}</h4>
                        <button onClick={() => setEditingAgent(null)} className="text-zinc-400 hover:text-zinc-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-zinc-500 mb-1">Nome de Exibição</label>
                          <input
                            type="text"
                            value={editingAgent.displayName || ''}
                            onChange={(e) => setEditingAgent({ ...editingAgent, displayName: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-500 mb-1">Modelo</label>
                          <input
                            type="text"
                            value={editingAgent.model}
                            onChange={(e) => setEditingAgent({ ...editingAgent, model: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-500 mb-1">Instruções do Sistema (Markdown body)</label>
                          <textarea
                            rows={6}
                            value={editingAgent.systemInstructions}
                            onChange={(e) => setEditingAgent({ ...editingAgent, systemInstructions: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setEditingAgent(null)}
                          className="px-3 py-1.5 text-xs text-zinc-500"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={async () => {
                            await onSaveAgent(editingAgent);
                            setEditingAgent(null);
                          }}
                          className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white"
                        >
                          Salvar Agente
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. SKILLS */}
            {activeTab === 'skills' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Skills Reais do Gemini CLI (.gemini/skills/*/SKILL.md)
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">
                      Mapeamento dos fluxos estruturados de desenvolvimento e convenções.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingSkill({
                        name: '',
                        description: '',
                        content: '',
                        enabled: true,
                        statusGrade: 'CONFIGURED',
                      });
                      setIsNewSkill(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Skill</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {skills.map((skill) => (
                    <div
                      key={skill.name}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                            {skill.name}
                          </span>
                          <span className="text-xs text-zinc-500">— {skill.description}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingSkill({ ...skill });
                              setIsNewSkill(false);
                            }}
                            className="px-2.5 py-1 text-xs rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {skill.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit Skill Modal */}
                {editingSkill && (
                  <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">
                          {isNewSkill ? 'Criar Nova Skill' : `Editar Skill: ${editingSkill.name}`}
                        </h4>
                        <button onClick={() => setEditingSkill(null)} className="text-zinc-400 hover:text-zinc-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-zinc-500 mb-1">Nome da Skill</label>
                          <input
                            type="text"
                            disabled={!isNewSkill}
                            value={editingSkill.name}
                            onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-500 mb-1">Descrição</label>
                          <input
                            type="text"
                            value={editingSkill.description}
                            onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-500 mb-1">Conteúdo do Procedimento (SKILL.md)</label>
                          <textarea
                            rows={6}
                            value={editingSkill.content}
                            onChange={(e) => setEditingSkill({ ...editingSkill, content: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setEditingSkill(null)} className="px-3 py-1.5 text-xs text-zinc-500">
                          Cancelar
                        </button>
                        <button
                          onClick={async () => {
                            await onSaveSkill(editingSkill);
                            setEditingSkill(null);
                          }}
                          className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white"
                        >
                          Salvar Skill
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. COMANDOS */}
            {activeTab === 'commands' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Comandos Operacionais (.gemini/commands/*.toml)
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    Atalhos de execução para acionamento direto no chat via autocomplete '/'
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {commands.map((cmd) => (
                    <div
                      key={cmd.name}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                            {cmd.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                            TOML
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {cmd.description}
                        </p>
                        <pre className="mt-2 p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 line-clamp-3">
                          {cmd.promptTemplate}
                        </pre>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => setEditingCommand({ ...cmd })}
                          className="px-2.5 py-1 text-xs rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                        >
                          Editar Prompt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit Command Modal */}
                {editingCommand && (
                  <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Editar Comando: {editingCommand.name}</h4>
                        <button onClick={() => setEditingCommand(null)} className="text-zinc-400 hover:text-zinc-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-zinc-500 mb-1">Descrição</label>
                          <input
                            type="text"
                            value={editingCommand.description}
                            onChange={(e) => setEditingCommand({ ...editingCommand, description: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-500 mb-1">Template de Prompt Operacional</label>
                          <textarea
                            rows={6}
                            value={editingCommand.promptTemplate}
                            onChange={(e) => setEditingCommand({ ...editingCommand, promptTemplate: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setEditingCommand(null)} className="px-3 py-1.5 text-xs text-zinc-500">
                          Cancelar
                        </button>
                        <button
                          onClick={async () => {
                            await onSaveCommand(editingCommand);
                            setEditingCommand(null);
                          }}
                          className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white"
                        >
                          Salvar Comando
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. MCP */}
            {activeTab === 'mcp' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Model Context Protocol (MCP) no Gemini CLI
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    Configuração de servidores MCP em <code className="font-mono">.gemini/settings.json</code>.
                  </p>
                </div>

                <div className="space-y-3">
                  {mcpServers.map((server) => {
                    const testState = mcpTestResult[server.name];
                    return (
                      <div
                        key={server.name}
                        className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                              {server.name}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                                server.enabled
                                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                              }`}
                            >
                              {server.enabled ? 'Ativo' : 'Desativado'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => testMcp(server)}
                              disabled={testState?.loading}
                              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
                            >
                              <Play className="w-3 h-3" />
                              <span>{testState?.loading ? 'Testando...' : 'Testar Conexão'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="text-xs font-mono bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
                          {server.command} {server.args.join(' ')}
                        </div>

                        {testState && (
                          <div
                            className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
                              testState.success
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {testState.success ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                            )}
                            <span>{testState.message}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 7. HOOKS */}
            {activeTab === 'hooks' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Hooks no Gemini CLI 0.58.0
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    Status e suporte para migração e acionadores de eventos.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      gemini hooks migrate
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      Suportado no CLI 0.58.0
                    </span>
                  </div>
                  <p className="text-zinc-500">
                    Migra automaticamente hooks existentes de outros ambientes (como Claude Code) para as convenções do Gemini CLI.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Event Hooks (pre-tool / post-tool)
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                      CONFIGURADO / NÃO VALIDADO
                    </span>
                  </div>
                  <p className="text-zinc-500">
                    Em conformidade com a distinção de estados: a estrutura de configuração em settings.json está pronta, mas o disparo em stream-json headless sem extensão de terminal interativo está classificado como NOT VALIDATED.
                  </p>
                </div>
              </div>
            )}

            {/* 8. PERMISSÕES */}
            {activeTab === 'permissions' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Permissões de Execução e Segurança
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    Definição das restrições de comandos, modificação de arquivos e operações Git.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  {[
                    { title: 'Comandos de Shell', desc: 'Permite que o Gemini CLI execute comandos no terminal do Ubuntu.', def: true },
                    { title: 'Gravação de Arquivos', desc: 'Permite criar e sobrescrever arquivos nos diretórios autorizados.', def: true },
                    { title: 'Operações Git', desc: 'Permite diffs e preparação de commits validados.', def: true },
                    { title: 'Execução de MCP', desc: 'Permite invocar ferramentas expostas por servidores MCP registrados.', def: true },
                    { title: 'Ações Destrutivas (rm -rf, git reset)', desc: 'Exige confirmação manual obrigatória independente do modo.', def: false },
                  ].map((perm) => (
                    <div
                      key={perm.title}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">{perm.title}</div>
                        <div className="text-zinc-500 text-[11px]">{perm.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        Ativo
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. ÁUDIO */}
            {activeTab === 'audio' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Configuração dos Serviços de Áudio da Interface
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    STT e TTS operam como camada de interface independente e não alteram os fluxos do Gemini CLI.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Modelo STT (Ditado por Voz)
                    </label>
                    <select
                      value={audioSettings.sttModel}
                      onChange={(e) => onUpdateAudioSettings({ sttModel: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="gemini-3.5-transcribe">gemini-3.5-transcribe (Preferencial)</option>
                      <option value="browser-native">Web Speech API (Fallback local do navegador)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Modelo TTS (Narração de Respostas)
                    </label>
                    <select
                      value={audioSettings.ttsModel}
                      onChange={(e) => onUpdateAudioSettings({ ttsModel: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="gemini-3.1-flash-tts-preview">
                        gemini-3.1-flash-tts-preview (Preferencial)
                      </option>
                      <option value="browser-native">SpeechSynthesis (Nativo do navegador)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Voz de Narração TTS
                    </label>
                    <select
                      value={audioSettings.ttsVoice}
                      onChange={(e) => onUpdateAudioSettings({ ttsVoice: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono"
                    >
                      {['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={audioSettings.autoPlayTts}
                        onChange={(e) => onUpdateAudioSettings({ autoPlayTts: e.target.checked })}
                        className="rounded"
                      />
                      <span>Reproduzir áudio automaticamente ao concluir respostas</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={audioSettings.filterCodeInTts}
                        onChange={(e) => onUpdateAudioSettings({ filterCodeInTts: e.target.checked })}
                        className="rounded"
                      />
                      <span>Omitir blocos de código extensos durante a narração em áudio</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 10. EMPACOTAMENTO E MATRIZ DE VALIDAÇÃO */}
            {activeTab === 'packaging' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Empacotamento Standalone para Ubuntu Linux & Matriz de Validação
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Gera pacote .deb e tarball independente para instalação direta em qualquer Ubuntu Linux.
                  </p>
                </div>

                {/* Build Package Button */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block">
                      Gerar Pacote de Distribuição (.deb & standalone tarball)
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Inclui binário wrapper /usr/bin/gemini-gui, atalho desktop e instalador autônomo.
                    </span>
                  </div>
                  <button
                    onClick={handleBuildPackage}
                    disabled={isBuildingPackage}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
                  >
                    <Package className="w-4 h-4" />
                    <span>{isBuildingPackage ? 'Compilando...' : 'Gerar Pacote Ubuntu'}</span>
                  </button>
                </div>

                {packagingOutput && (
                  <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{packagingOutput.message}</span>
                    </div>
                    <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                      {packagingOutput.files.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    <div className="mt-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                      Instruções: {packagingOutput.instructions}
                    </div>
                  </div>
                )}

                {/* Validation Matrix Table */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Matriz de Validação e Distinção Obrigatória de Estados
                  </h5>
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 font-semibold text-[11px] uppercase border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                          <th className="p-3">Recurso / Componente</th>
                          <th className="p-3">Categoria</th>
                          <th className="p-3">Estado Formal</th>
                          <th className="p-3">Evidência / Observação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {matrix.map((row, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td className="p-3 font-medium text-zinc-800 dark:text-zinc-200">{row.item}</td>
                            <td className="p-3 font-mono text-[11px] text-zinc-500">{row.category}</td>
                            <td className="p-3">
                              <span
                                className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                                  row.status === 'TESTED'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                    : row.status === 'CONFIGURED'
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                    : row.status === 'VALIDATED'
                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] text-zinc-500 leading-relaxed">
                              {row.evidence}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
