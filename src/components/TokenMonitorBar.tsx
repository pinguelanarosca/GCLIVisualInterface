import React, { useState } from 'react';
import {
  Zap,
  Activity,
  BarChart3,
  Flame,
  Clock,
  Layers,
  Sparkles,
  X,
  TrendingUp,
  Cpu,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { ChatMessage, AgentConfig, ProjectItem, AuthorizedDir, SkillConfig, McpConfig } from '../types.js';
import { calculateSessionTokens, calculateContextBreakdown, formatTokenCount } from '../utils/tokenUtils.js';

interface TokenMonitorBarProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  agent?: AgentConfig | null;
  activeProject?: ProjectItem | null;
  authorizedDirs?: AuthorizedDir[];
  skills?: SkillConfig[];
  mcpServers?: McpConfig[];
  metrics: {
    rpm: number; // Requests per minute
    tpm: number; // Tokens per minute
    rpd: number; // Requests per day
  };
  onOpenContextSettings: () => void;
}

export const TokenMonitorBar: React.FC<TokenMonitorBarProps> = ({
  messages,
  isStreaming,
  agent,
  activeProject,
  authorizedDirs,
  skills,
  mcpServers,
  metrics,
  onOpenContextSettings,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Active chat session token count
  const sessionTokens = calculateSessionTokens(messages);
  const contextBreakdown = calculateContextBreakdown(
    messages,
    agent,
    activeProject,
    authorizedDirs,
    skills,
    mcpServers
  );

  return (
    <div className="relative flex items-center gap-2">
      {/* Interactive Token Monitor Widget */}
      <div
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        title="Clique para ver o Monitor de Tokens & Contexto em Tempo Real"
        className="flex items-center gap-3 bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 dark:from-amber-500/20 dark:via-blue-500/20 dark:to-indigo-500/20 hover:from-amber-500/15 hover:to-indigo-500/15 border border-amber-500/40 dark:border-amber-500/50 px-3.5 py-1.5 rounded-xl cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg group"
      >
        {/* Active Chat Token Counter */}
        <div className="flex items-center gap-1.5">
          <Zap className={`w-4 h-4 text-amber-500 ${isStreaming ? 'animate-bounce' : ''}`} />
          <span className="text-sm font-extrabold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {formatTokenCount(sessionTokens.totalTokens)}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold hidden sm:inline uppercase tracking-wider">
            tokens
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-0.5" />

        {/* Live Metrics: TPM, RPM, RPD */}
        <div className="flex items-center gap-2.5 text-[11px] font-mono">
          <span
            title="Tokens por Minuto (TPM) em tempo real no chat ativo"
            className="flex items-center text-blue-600 dark:text-blue-400 font-bold"
          >
            <TrendingUp className="w-3 h-3 mr-0.5" />
            {formatTokenCount(metrics.tpm)}/m
          </span>

          <span
            title="Requisições por Minuto (RPM)"
            className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold"
          >
            <Activity className="w-3 h-3 mr-0.5" />
            {metrics.rpm} RPM
          </span>

          <span
            title="Requisições por Dia (RPD)"
            className="hidden md:flex items-center text-purple-600 dark:text-purple-400 font-bold"
          >
            <Flame className="w-3 h-3 mr-0.5" />
            {metrics.rpd} RPD
          </span>
        </div>

        {isStreaming && (
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping ml-0.5" />
        )}
      </div>

      {/* Popover Dashboard Details */}
      {isPopoverOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsPopoverOpen(false)}
          />
          <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 z-50 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 text-zinc-800 dark:text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Monitor de Tokens do Chat Ativo
                  </h4>
                  <p className="text-[10px] text-zinc-500">
                    Estatísticas e limites da API em tempo real
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPopoverOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Token Breakdown Cards */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                  Entrada (Input)
                </span>
                <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                  {sessionTokens.inputTokens.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  Prompts e histórico
                </span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                  Saída (Output)
                </span>
                <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {sessionTokens.outputTokens.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  Respostas do modelo
                </span>
              </div>
            </div>

            {/* Context Utilization Bar */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 mb-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  Uso da Janela de Contexto
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {contextBreakdown.utilizationPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    contextBreakdown.utilizationPercent > 80
                      ? 'bg-rose-500'
                      : contextBreakdown.utilizationPercent > 50
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}
                  style={{ width: `${Math.max(2, contextBreakdown.utilizationPercent)}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>{formatTokenCount(contextBreakdown.totalActiveTokens)} tokens ativos</span>
                <span>Máx: {formatTokenCount(contextBreakdown.maxContextWindow)}</span>
              </div>
            </div>

            {/* Live Rate Limits Gauges */}
            <div className="space-y-1.5 mb-3 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/40 text-xs">
              <span className="text-[10px] uppercase font-mono text-zinc-400 font-bold block mb-1">
                Gaxetas de Taxa (Rate Limits do Chat)
              </span>

              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                  Tokens / Minuto (TPM):
                </span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                  {metrics.tpm.toLocaleString('pt-BR')} / 1M TPM
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  Requisições / Minuto (RPM):
                </span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                  {metrics.rpm} / 1.000 RPM
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-purple-500" />
                  Requisições / Dia (RPD):
                </span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                  {metrics.rpd} / 10.000 RPD
                </span>
              </div>
            </div>

            {/* Footer Action */}
            <button
              onClick={() => {
                setIsPopoverOpen(false);
                onOpenContextSettings();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Configurar Compressão de Contexto</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
