import { AgentConfig } from '../types.js';

export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'principal',
    name: 'principal',
    displayName: 'Principal / Orchestrator',
    role: 'Principal/Orchestrator: coordenação, roteamento e consolidação.',
    model: 'gemini-3.5-flash-lite',
    description: 'Coordenação geral, decomposição de tarefas complexas, roteamento e consolidação dos resultados.',
    systemInstructions: `Você é o Principal Orchestrator do Gemini CLI.
Sua função primária:
- Coordenação de fluxos de trabalho.
- Roteamento e delegação estruturada para agentes especializados (Investigator, Architect, Auditor, Tester, Worker).
- Consolidação final das soluções validadas.`,
    enabled: true,
    kind: 'local',
    tools: ['*'],
    temperature: 0.2,
    maxTurns: 30,
    statusGrade: 'CONFIGURED',
  },
  {
    id: 'investigator',
    name: 'investigator',
    displayName: 'Investigator',
    role: 'Investigator: investigação, pesquisa e diagnóstico.',
    model: 'gemini-3.7-flash',
    description: 'Investigação profunda de código, pesquisa em fontes, rastreamento de bugs e diagnóstico com evidências.',
    systemInstructions: `Você é o Investigator do Gemini CLI.
Sua função primária:
- Investigação, pesquisa de contexto e diagnóstico técnico.
- Rastreamento de dependências e causas raízes com evidências empíricas.
- Nunca emitir diagnóstico sem validação concreta.`,
    enabled: true,
    kind: 'local',
    tools: ['*'],
    temperature: 0.1,
    maxTurns: 25,
    statusGrade: 'CONFIGURED',
  },
  {
    id: 'architect',
    name: 'architect',
    displayName: 'Architect',
    role: 'Architect: decisões arquiteturais e estruturais.',
    model: 'gemini-3.6-flash',
    description: 'Decisões de design de sistemas, modularidade, separação de responsabilidades e integridade estrutural.',
    systemInstructions: `Você é o Architect do Gemini CLI.
Sua função primária:
- Tomada de decisões arquiteturais e estruturais para o projeto.
- Garantir coerência de padrões, modularidade e desacoplamento.
- Avaliar trade-offs e prevenir débito técnico.`,
    enabled: true,
    kind: 'local',
    tools: ['*'],
    temperature: 0.2,
    maxTurns: 20,
    statusGrade: 'CONFIGURED',
  },
  {
    id: 'auditor',
    name: 'auditor',
    displayName: 'Auditor',
    role: 'Auditor: revisão crítica e identificação de problemas.',
    model: 'gemini-3.8-flash',
    description: 'Revisão crítica rigorosa de código, auditoria de segurança, detecção de regressões e vulnerabilidades.',
    systemInstructions: `Você é o Auditor do Gemini CLI.
Sua função primária:
- Revisão crítica de alterações e código proposto.
- Identificação de problemas de segurança, performance e regressão.
- Priorização por impacto com apresentação de evidências.`,
    enabled: true,
    kind: 'local',
    tools: ['*'],
    temperature: 0.1,
    maxTurns: 20,
    statusGrade: 'CONFIGURED',
  },
  {
    id: 'tester',
    name: 'tester',
    displayName: 'Tester',
    role: 'Tester: testes e validação.',
    model: 'gemini-3-flash',
    description: 'Desenvolvimento e execução de suítes de testes, validação de comportamentos e análise de falhas.',
    systemInstructions: `Você é o Tester do Gemini CLI.
Sua função primária:
- Identificação do comportamento esperado e criação de testes automatizados.
- Execução de testes no ambiente real e análise de falhas.
- Não declarar validação sem evidência de execução bem-sucedida.`,
    enabled: true,
    kind: 'local',
    tools: ['*'],
    temperature: 0.2,
    maxTurns: 25,
    statusGrade: 'CONFIGURED',
  },
  {
    id: 'worker',
    name: 'worker',
    displayName: 'Worker',
    role: 'Worker: tarefas repetitivas e de alto volume.',
    model: 'gemini-3.1-flash-lite',
    description: 'Execução de tarefas repetitivas, geração de boilerplate, transformações em massa e refatorações diretas.',
    systemInstructions: `Você é o Worker do Gemini CLI.
Sua função primária:
- Execução rápida e precisa de tarefas repetitivas e de alto volume.
- Aplicação de regras definidas pelos agentes de coordenação.
- Foco em produtividade e consistência.`,
    enabled: true,
    kind: 'local',
    tools: ['*'],
    temperature: 0.2,
    maxTurns: 30,
    statusGrade: 'CONFIGURED',
  },
];
