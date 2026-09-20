import React, { useState } from 'react';
import {
  Cpu,
  Mic,
  Bot,
  Boxes,
  Database,
  Binary,
  Sparkles,
  Info,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { MODELS_CATALOG } from '../constants/modelsCatalog.js';
import { AgentConfig } from '../types.js';

interface ModelCatalogViewProps {
  agents: AgentConfig[];
  onResetDefaultAgentsConfig: () => Promise<void>;
  onSaveAgent?: (agent: AgentConfig) => Promise<void>;
  isResetting?: boolean;
}

export const ModelCatalogView: React.FC<ModelCatalogViewProps> = ({
  agents,
  onResetDefaultAgentsConfig,
  onSaveAgent,
  isResetting = false,
}) => {
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [savedAgentId, setSavedAgentId] = useState<string | null>(null);

  const defaultAgentPairs = [
    {
      role: 'Principal / Orchestrator',
      id: 'principal',
      primaryModel: 'gemini-3.5-flash-lite',
      quota: 'RPM 1/1521 | RPD 1/500',
      defaultBackupId: 'worker',
      backupRationale: 'Worker possui 150 RPM / 500 RPD para manter a coordenação contínua.',
    },
    {
      role: 'Investigator',
      id: 'investigator',
      primaryModel: 'gemini-3.7-flash',
      quota: 'RPM 0/50 | RPD 0/20',
      defaultBackupId: 'architect',
      backupRationale: 'Architect (3.6 Flash) tem alta capacidade de análise estrutural.',
    },
    {
      role: 'Architect',
      id: 'architect',
      primaryModel: 'gemini-3.6-flash',
      quota: 'RPM 0/50 | RPD 0/20',
      defaultBackupId: 'investigator',
      backupRationale: 'Investigator (3.7 Flash) assume decisões e diagnóstico arquitetural.',
    },
    {
      role: 'Auditor',
      id: 'auditor',
      primaryModel: 'gemini-3.8-flash',
      quota: 'RPM 0/50 | RPD 0/20',
      defaultBackupId: 'architect',
      backupRationale: 'Architect (3.6 Flash) assegura revisão crítica caso a cota do 3.8 atinja o limite.',
    },
    {
      role: 'Tester',
      id: 'tester',
      primaryModel: 'gemini-3-flash',
      quota: 'RPM 0/50 | RPD 0/20',
      defaultBackupId: 'worker',
      backupRationale: 'Worker (3.1 Flash-Lite) executa suítes e validações sem consumir cotas restritas.',
    },
    {
      role: 'Worker',
      id: 'worker',
      primaryModel: 'gemini-3.1-flash-lite',
      quota: 'RPM 0/150 | RPD 0/500',
      defaultBackupId: 'principal',
      backupRationale: 'Principal (3.5 Flash-Lite) reabsorve lotes de trabalho se o Worker sobrecarregar.',
    },
  ];

  const handleBackupChange = async (agentId: string, newBackupId: string) => {
    const targetAgent = agents.find((a) => a.id.toLowerCase() === agentId.toLowerCase());
    if (targetAgent && onSaveAgent) {
      await onSaveAgent({
        ...targetAgent,
        backupAgentId: newBackupId,
      });
      setSavedAgentId(agentId);
      setTimeout(() => setSavedAgentId(null), 2500);
    }
  };

  const sections = [
    {
      group: 'text',
      title: '1. Modelos de Texto Geral (Txt Out)',
      icon: Cpu,
      desc: 'Ordem de prioridade recomendada para geração, auditoria, raciocínio e tarefas textuais.',
      priorityNote:
        'Prioridade prática para uso geral de texto: Gemini 3.8 Flash → 3.7 → 3.6 → 3.5 → 3 → 3.1 Flash Lite → 2.5 Flash → 2.5 Flash Lite → 3.5 Flash Lite.',
    },
    {
      group: 'audio',
      title: '2. Voz, transcrição, tradução e áudio em tempo real',
      icon: Mic,
      desc: 'Modelos especializados em Speech-to-Text (STT), Text-to-Speech (TTS) e áudio bidirecional.',
      subdivisions: [
        { label: 'Transcrição (fala → texto)', chain: 'Gemini 3.5 Transcribe Live → Gemini 3.5 Transcribe' },
        { label: 'Tradução de voz em tempo real', chain: 'Gemini 3.5 Live Translate' },
        { label: 'Conversação de áudio em tempo real', chain: 'Gemini 3 Flash Live → Gemini 2.5 Flash Native Audio Dialog' },
        { label: 'Síntese de voz (texto → fala)', chain: 'Gemini 3.1 Flash TTS → Gemini 2.5 Flash TTS' },
      ],
    },
    {
      group: 'agents',
      title: '3. Agentes e automação',
      icon: Bot,
      desc: 'Antigravity é o único modelo/serviço explicitamente destinado a automação e workflows de agentes autônomos.',
    },
    {
      group: 'robotics',
      title: '4. Robótica',
      icon: Boxes,
      desc: 'Modelo especializado para embodied AI, não comparável diretamente aos modelos Flash para chat.',
    },
    {
      group: 'embeddings',
      title: '5. Embeddings / busca semântica / representação vetorial',
      icon: Database,
      desc: 'Modelos de representação vetorial densa para indexação de código e busca semântica.',
      priorityNote: 'Ordem de preferência: Embedding 2 → Embedding 1',
    },
    {
      group: 'gemma',
      title: '6. Modelos abertos / gerais da família Gemma',
      icon: Binary,
      desc: 'Pesos abertos para inferência local ou descentralizada de alto desempenho.',
    },
  ];

  const handleReset = async () => {
    await onResetDefaultAgentsConfig();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Initial Standard Configuration */}
      <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-b from-blue-50/70 to-blue-50/20 dark:from-blue-950/30 dark:to-blue-950/10 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                Configuração Padrão dos 6 Agentes com Agente Reserva Automático
              </h4>
            </div>
            <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-1 max-w-2xl leading-relaxed">
              Cada um dos 6 agentes especializados possui um <strong>Agente Reserva</strong> associado. Caso a API retorne erros de <strong>servidor sobrecarregado (500/503)</strong> ou <strong>cotas atingidas (429)</strong>, o agente reserva é acionado automaticamente em tempo de execução sem interrupção.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition shrink-0 cursor-pointer shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Restaurando...' : 'Aplicar Configuração Padrão'}</span>
          </button>
        </div>

        {resetSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Configuração padrão e agentes reservas redefinidos com sucesso para todos os 6 agentes (.gemini/agents/*.md)!</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {defaultAgentPairs.map((item) => {
            const currentAgent = agents.find(
              (a) => a.id.toLowerCase() === item.id.toLowerCase() || a.name.toLowerCase() === item.id.toLowerCase()
            );
            const activeBackupId = currentAgent?.backupAgentId || item.defaultBackupId;
            const backupAgent = agents.find(
              (a) => a.id.toLowerCase() === activeBackupId.toLowerCase() || a.name.toLowerCase() === activeBackupId.toLowerCase()
            );

            return (
              <div
                key={item.role}
                className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-3 relative group"
              >
                {savedAgentId === item.id && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Salvo</span>
                  </div>
                )}

                {/* Agente Titular */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{item.role}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {item.id}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">Modelo Titular:</span>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-[10px]">
                      {currentAgent?.model || item.primaryModel}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5 text-right">{item.quota}</div>
                </div>

                {/* Bloco do Agente Reserva */}
                <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Agente Reserva</span>
                    </div>
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-200/60 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                      Auto-Fallback
                    </span>
                  </div>

                  <div className="mt-1">
                    <select
                      className="w-full bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800/80 rounded-md py-1 px-1.5 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                      value={activeBackupId}
                      onChange={(e) => handleBackupChange(item.id, e.target.value)}
                    >
                      {agents
                        .filter((ag) => ag.id.toLowerCase() !== item.id.toLowerCase())
                        .map((ag) => (
                          <option key={ag.id} value={ag.id}>
                            {ag.displayName || ag.name} ({ag.model})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-amber-900/70 dark:text-amber-300/70 pt-0.5">
                    <span>Cota Reserva:</span>
                    <span className="font-mono font-medium">
                      {backupAgent?.model.includes('lite') ? 'RPM 150-1521 | RPD 500' : 'RPM 50 | RPD 20'}
                    </span>
                  </div>

                  <div className="text-[9px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 pt-0.5 leading-tight">
                    <Zap className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                    <span>Acionado se erro 429 (Cota) ou 500/503 (Sobrecarga)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveCategoryTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
            activeCategoryTab === 'all'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Todas as Categorias ({MODELS_CATALOG.length})
        </button>
        {sections.map((sec) => (
          <button
            key={sec.group}
            onClick={() => setActiveCategoryTab(sec.group)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              activeCategoryTab === sec.group
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {sec.title.split(' ')[0]} {sec.title.split(' ')[1]}
          </button>
        ))}
      </div>

      {/* Sections Table View */}
      {sections
        .filter((sec) => activeCategoryTab === 'all' || activeCategoryTab === sec.group)
        .map((sec) => {
          const sectionModels = MODELS_CATALOG.filter((m) => m.group === sec.group);
          const Icon = sec.icon;
          return (
            <div
              key={sec.group}
              className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xs"
            >
              <div className="p-3.5 sm:p-4 bg-zinc-50/80 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <h5 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                      {sec.title}
                    </h5>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{sec.desc}</p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0">
                  {sectionModels.length} modelos
                </span>
              </div>

              {/* Special priority note if present */}
              {sec.priorityNote && (
                <div className="bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/50 px-4 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{sec.priorityNote}</span>
                </div>
              )}

              {/* Subdivisions if present */}
              {sec.subdivisions && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-200/50 dark:border-emerald-900/50 p-3 text-xs space-y-1">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200 block mb-1">
                    Subdivisão por função de áudio:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sec.subdivisions.map((sub, idx) => (
                      <div key={idx} className="bg-white/80 dark:bg-zinc-800/80 p-2 rounded-lg border border-emerald-200/40 dark:border-emerald-800/40">
                        <span className="font-medium text-emerald-800 dark:text-emerald-300">{sub.label}: </span>
                        <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">{sub.chain}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-100/50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                      <th className="py-2.5 px-3 text-center w-14">Ordem</th>
                      <th className="py-2.5 px-3">Modelo</th>
                      <th className="py-2.5 px-3 text-center w-24">RPM</th>
                      <th className="py-2.5 px-3 text-center w-20">TPM</th>
                      <th className="py-2.5 px-3 text-center w-24">RPD</th>
                      <th className="py-2.5 px-3 text-center w-24">Categoria</th>
                      <th className="py-2.5 px-3">Finalidade / Características</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {sectionModels.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-zinc-500 dark:text-zinc-400">
                          {item.order}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {item.name}
                            </span>
                            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                              {item.id}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            {item.rpm}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            {item.tpm}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            {item.rpd}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              item.category === 'Txt Out'
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                : item.category === 'API Live'
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                : item.category === 'Multimod'
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                : item.category === 'Agents'
                                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col">
                            {item.recommendedRole && (
                              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Padrão para: {item.recommendedRole}
                              </span>
                            )}
                            {item.subFunction && (
                              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                {item.subFunction}
                              </span>
                            )}
                            <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                              {item.description}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
    </div>
  );
};
