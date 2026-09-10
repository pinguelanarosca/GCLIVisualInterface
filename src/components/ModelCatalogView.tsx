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
} from 'lucide-react';
import { MODELS_CATALOG } from '../constants/modelsCatalog.js';
import { AgentConfig } from '../types.js';

interface ModelCatalogViewProps {
  agents: AgentConfig[];
  onResetDefaultAgentsConfig: () => Promise<void>;
  isResetting?: boolean;
}

export const ModelCatalogView: React.FC<ModelCatalogViewProps> = ({
  agents,
  onResetDefaultAgentsConfig,
  isResetting = false,
}) => {
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');
  const [resetSuccess, setResetSuccess] = useState(false);

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
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                Configuração Padrão dos 6 Agentes Especializados
              </h4>
            </div>
            <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-1">
              Mapeamento inicial otimizado por cotas (RPM / TPM / RPD) e especialidade técnica:
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Aplicando...' : 'Aplicar Configuração Padrão'}</span>
          </button>
        </div>

        {resetSuccess && (
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Configuração padrão aplicada com sucesso aos 6 agentes (.gemini/agents/*.md)!</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {[
            { role: 'Principal / Orchestrator', model: 'gemini-3.5-flash-lite', quota: 'RPM 1/1521 | RPD 1/500' },
            { role: 'Investigator', model: 'gemini-3.7-flash', quota: 'RPM 0/50 | RPD 0/20' },
            { role: 'Architect', model: 'gemini-3.6-flash', quota: 'RPM 0/50 | RPD 0/20' },
            { role: 'Auditor', model: 'gemini-3.8-flash', quota: 'RPM 0/50 | RPD 0/20' },
            { role: 'Tester', model: 'gemini-3-flash', quota: 'RPM 0/50 | RPD 0/20' },
            { role: 'Worker', model: 'gemini-3.1-flash-lite', quota: 'RPM 0/150 | RPD 0/500' },
          ].map((item) => {
            const currentAgent = agents.find(
              (a) => a.name.toLowerCase() === item.role.split(' ')[0].toLowerCase() || a.id.toLowerCase() === item.role.split(' ')[0].toLowerCase()
            );
            const activeModel = currentAgent?.model || item.model;
            return (
              <div
                key={item.role}
                className="p-2.5 rounded-lg bg-white dark:bg-zinc-800/80 border border-blue-100 dark:border-zinc-700 text-xs shadow-2xs"
              >
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  <span>{item.role}</span>
                </div>
                <div className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {activeModel}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.quota}</div>
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
