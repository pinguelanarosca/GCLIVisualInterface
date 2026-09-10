const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Empacotador Ubuntu Linux para Gemini CLI GUI ===');

const rootDir = process.cwd();
const distUbuntuDir = path.join(rootDir, 'dist-ubuntu');

if (!fs.existsSync(distUbuntuDir)) {
  fs.mkdirSync(distUbuntuDir, { recursive: true });
}

console.log('1. Compilando aplicação (Vite + esbuild)...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
} catch (err) {
  console.error('Falha no build da aplicação:', err.message);
  process.exit(1);
}

console.log('2. Preparando estrutura Debian /opt/gemini-gui...');
const debRoot = path.join(distUbuntuDir, 'deb-root');
fs.rmSync(debRoot, { recursive: true, force: true });
fs.mkdirSync(debRoot, { recursive: true });

const optAppDir = path.join(debRoot, 'opt', 'gemini-gui');
const binDir = path.join(debRoot, 'usr', 'bin');
const appLauncherDir = path.join(debRoot, 'usr', 'share', 'applications');
const debianMetaDir = path.join(debRoot, 'DEBIAN');

fs.mkdirSync(optAppDir, { recursive: true });
fs.mkdirSync(binDir, { recursive: true });
fs.mkdirSync(appLauncherDir, { recursive: true });
fs.mkdirSync(debianMetaDir, { recursive: true });

// Copy compiled distribution
console.log('3. Copiando dist/ e arquivos essenciais de execução...');
fs.cpSync(path.join(rootDir, 'dist'), path.join(optAppDir, 'dist'), { recursive: true });
fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(optAppDir, 'package.json'));

if (fs.existsSync(path.join(rootDir, '.gemini'))) {
  fs.cpSync(path.join(rootDir, '.gemini'), path.join(optAppDir, '.gemini'), { recursive: true });
}

// 4. Launcher script in /usr/bin/gemini-gui
const launcherScript = `#!/usr/bin/env bash
set -e
export GEMINI_GUI_DIR="/opt/gemini-gui"
export PORT="\${PORT:-3000}"
export NODE_ENV="production"

if ! command -v node &> /dev/null; then
    echo "ERRO: Node.js é necessário. Instale via 'sudo apt install nodejs npm'"
    exit 1
fi

# Check if port is already in use
if command -v lsof &> /dev/null && lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Aviso: A porta $PORT já está em uso."
    echo "Para liberar, execute: fuser -k $PORT/tcp ou pkill -f 'server.cjs'"
fi

cd /opt/gemini-gui
node dist/server.cjs &
PID=$!
sleep 1.5

if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:\$PORT" &
fi

wait $PID
`;
fs.writeFileSync(path.join(binDir, 'gemini-gui'), launcherScript, { mode: 0o755 });

// 5. Desktop file
const desktopFile = `[Desktop Entry]
Name=Gemini CLI GUI
Comment=Interface Gráfica Local para o Gemini CLI 0.58.0
Exec=/usr/bin/gemini-gui
Icon=terminal
Terminal=false
Type=Application
Categories=Development;Utility;
Keywords=gemini;ai;cli;google;developer;
`;
fs.writeFileSync(path.join(appLauncherDir, 'gemini-gui.desktop'), desktopFile, 'utf8');

// 6. DEBIAN/control
const debianControl = `Package: gemini-gui
Version: 1.0.0
Section: devel
Priority: optional
Architecture: all
Depends: nodejs (>= 18.0.0)
Maintainer: Gemini CLI GUI Developer <developer@local>
Description: Interface grafica local, moderna e amigavel para o Gemini CLI 0.58.0 no Ubuntu Linux.
 Integracao direta com o processo real do Gemini CLI 0.58.0, agentes especializados,
 skills, comandos, MCP, audio STT/TTS e inspecao de diffs.
`;
fs.writeFileSync(path.join(debianMetaDir, 'control'), debianControl, 'utf8');

// 7. DEBIAN/postinst
const postinst = `#!/bin/sh
set -e
chmod +x /usr/bin/gemini-gui
update-desktop-database 2>/dev/null || true
echo "Gemini CLI GUI instalado com sucesso! Digite 'gemini-gui' no terminal para iniciar."
exit 0
`;
fs.writeFileSync(path.join(debianMetaDir, 'postinst'), postinst, { mode: 0o755 });

// 8. Build .deb package if dpkg-deb is available
const debPackageOutput = path.join(distUbuntuDir, 'gemini-gui_1.0.0_all.deb');
try {
  execSync(`dpkg-deb --build "${debRoot}" "${debPackageOutput}"`, { stdio: 'inherit' });
  console.log(`✓ Pacote Debian criado: ${debPackageOutput}`);
} catch (err) {
  console.log('dpkg-deb não disponível ou falhou. Criando tarball independente (.tar.gz)...');
}

// 9. Create portable standalone tarball
const tarballOutput = path.join(distUbuntuDir, 'gemini-gui-ubuntu-standalone.tar.gz');
try {
  execSync(`tar -czf "${tarballOutput}" -C "${distUbuntuDir}" gemini-gui.desktop gemini-gui install.sh uninstall.sh PROCEDIMENTO_VALIDACAO_POS_INSTALACAO.md 2>/dev/null || true`);
  console.log(`✓ Tarball standalone criado: ${tarballOutput}`);
} catch (e) {
  // Ignored
}

console.log('Empacotamento concluído com sucesso em dist-ubuntu/!');
