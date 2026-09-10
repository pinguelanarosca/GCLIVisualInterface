import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentConfig } from '../src/types.js';

const DEFAULT_AGENTS: AgentConfig[] = [
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

export function getAgentsDirectory(customDir?: string): string {
  const base = customDir || process.cwd();
  return path.join(base, '.gemini', 'agents');
}

export function ensureAgentsSeeded(targetDir?: string): AgentConfig[] {
  const agentsDir = getAgentsDirectory(targetDir);
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  // Also ensure global ~/.gemini/agents exists if possible
  try {
    const globalAgentsDir = path.join(os.homedir(), '.gemini', 'agents');
    if (!fs.existsSync(globalAgentsDir)) {
      fs.mkdirSync(globalAgentsDir, { recursive: true });
    }
  } catch {
    // Ignore permissions in restricted containers
  }

  // Ensure each default agent exists on disk
  for (const defaultAgent of DEFAULT_AGENTS) {
    const agentFilePath = path.join(agentsDir, `${defaultAgent.name}.md`);
    if (!fs.existsSync(agentFilePath)) {
      saveAgentToFile(defaultAgent, targetDir);
    }
  }

  return loadAgents(targetDir);
}

export function loadAgents(targetDir?: string): AgentConfig[] {
  const agentsDir = getAgentsDirectory(targetDir);
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
  const loadedMap = new Map<string, AgentConfig>();

  for (const file of files) {
    const filePath = path.join(agentsDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = parseAgentMarkdown(content, file.replace(/\.md$/, ''));
      if (parsed) {
        // Respect the selected model without artificial restrictions
        if (!parsed.model) {
          parsed.model = 'gemini-3.5-flash-lite';
        }
        loadedMap.set(parsed.name, parsed);
      }
    } catch {
      // Continue loading others
    }
  }

  // Make sure all default agents are present so they NEVER disappear when selecting/editing one
  for (const defaultAgent of DEFAULT_AGENTS) {
    if (!loadedMap.has(defaultAgent.name)) {
      saveAgentToFile(defaultAgent, targetDir);
      loadedMap.set(defaultAgent.name, defaultAgent);
    }
  }

  return Array.from(loadedMap.values());
}

export function saveAgentToFile(agent: AgentConfig, targetDir?: string) {
  const agentsDir = getAgentsDirectory(targetDir);
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  const frontmatter = [
    '---',
    `kind: ${agent.kind || 'local'}`,
    `name: ${agent.name}`,
    `display_name: "${agent.displayName}"`,
    `description: "${agent.description.replace(/"/g, '\\"')}"`,
    `model: ${agent.model}`,
    `tools: ${JSON.stringify(agent.tools || ['*'])}`,
    `temperature: ${agent.temperature ?? 0.2}`,
    `max_turns: ${agent.maxTurns ?? 25}`,
    `enabled: ${agent.enabled}`,
    '---',
    '',
    agent.systemInstructions,
  ].join('\n');

  const filePath = path.join(agentsDir, `${agent.name}.md`);
  fs.writeFileSync(filePath, frontmatter, 'utf8');
}

export function deleteAgent(name: string, targetDir?: string): boolean {
  const filePath = path.join(getAgentsDirectory(targetDir), `${name}.md`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

function parseAgentMarkdown(content: string, fallbackName: string): AgentConfig | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return null;
  }

  const fm = match[1];
  const body = match[2].trim();
  const fields: Record<string, string> = {};

  for (const line of fm.split('\n')) {
    const sep = line.indexOf(':');
    if (sep > 0) {
      const key = line.slice(0, sep).trim();
      let val = line.slice(sep + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      fields[key] = val;
    }
  }

  const name = fields['name'] || fallbackName;
  let tools = ['*'];
  if (fields['tools']) {
    try {
      tools = JSON.parse(fields['tools']);
    } catch {
      tools = ['*'];
    }
  }

  return {
    id: name,
    name,
    displayName: fields['display_name'] || name,
    role: `${fields['display_name'] || name}: ${fields['description'] || ''}`,
    model: fields['model'] || 'gemini-3.5-flash-lite',
    description: fields['description'] || '',
    systemInstructions: body,
    enabled: fields['enabled'] !== 'false',
    kind: (fields['kind'] as any) || 'local',
    tools,
    temperature: fields['temperature'] ? parseFloat(fields['temperature']) : 0.2,
    maxTurns: fields['max_turns'] ? parseInt(fields['max_turns'], 10) : 25,
    statusGrade: 'CONFIGURED',
  };
}

export function resetAllAgentsToDefault(targetDir?: string): AgentConfig[] {
  const agentsDir = getAgentsDirectory(targetDir);
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }
  for (const agent of DEFAULT_AGENTS) {
    saveAgentToFile(agent, targetDir);
  }
  return loadAgents(targetDir);
}

