# Gemini CLI GUI & Workspace

Interface gráfica e ambiente de trabalho profissional para o **Gemini CLI (v0.58.0+)**, projetada para desenvolvedores e equipes que utilizam inteligência artificial diretamente em projetos locais.

---

## 🚀 Funcionalidades Principais

- **Execução Real do Gemini CLI**: Interage diretamente com o processo CLI via terminal local e backend Node/Express (`server.ts`).
- **Sistema Multi-Agente Integrado**:
  - **Principal / Orchestrator** (`gemini-3.5-flash-lite`): Coordenação de fluxos e consolidação de respostas.
  - **Investigator** (`gemini-3.7-flash`): Análise de bugs, rastreamento de causas e diagnóstico empírico.
  - **Architect** (`gemini-3.6-flash`): Decisões arquiteturais, modularidade e padrões de projeto.
  - **Auditor** (`gemini-3.8-flash`): Auditoria rigorosa de segurança, performance e regressões.
  - **Tester** (`gemini-3-flash`): Criação de suítes de testes e validação empírica.
  - **Worker** (`gemini-3.1-flash-lite`): Tarefas repetitivas, transformações em lote e boilerplate.
- **Git & Diff Viewer**: Visualizador unificado de alterações de código e histórico de arquivos modificados com destaque de sintaxe.
- **Ditado por Voz com Reconhecimento Local**: Web Speech API com modo hands-free e feedback em tempo real.
- **Gestão de Projetos e Diretórios Autorizados**: Alternância rápida de contexto e restrição de diretórios de execução.
- **Suporte a MCP (Model Context Protocol)** e **Skills Customizadas**.
- **Empacotador para Ubuntu Linux**: Geração de pacotes `.deb` e tarball standalone para desktop.

---

## 🛠️ Como Executar

### Pré-requisitos
- Node.js 18+ ou 20+
- Gemini CLI instalado localmente (`gemini --version`) ou chave `GEMINI_API_KEY`

### Instalação e Desenvolvimento
```bash
# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```
Acesse a aplicação em: `http://localhost:3000`

### Build para Produção
```bash
npm run build
npm start
```

### Empacotar para Ubuntu Linux (.deb)
```bash
npm run build:ubuntu
```
Os arquivos gerados serão salvos em `dist-ubuntu/`:
- `gemini-gui_1.0.0_all.deb`
- `gemini-gui-ubuntu-standalone.tar.gz`

---

## 📂 Estrutura do Projeto

```
.
├── server/                 # Serviços de backend (CLI executor, agentes, git diff, MCP)
├── src/                    # Frontend React + Tailwind CSS
│   ├── components/         # Componentes de interface (Chat, Diffs, Header, Modais)
│   ├── constants/          # Constantes e definições de agentes padrão
│   └── types.ts            # Tipagens globais da aplicação
├── scripts/                # Scripts utilitários de empacotamento Debian/Ubuntu
├── server.ts               # Servidor Express com integração Vite
└── package.json            # Dependências e scripts do projeto
```

---

## 📄 Licença
Distribuído sob a licença MIT.
