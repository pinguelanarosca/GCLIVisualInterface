#!/usr/bin/env bash
set -e

echo "=================================================================="
echo "   DESINSTALADOR OFICIAL - GCLI VISUAL INTERFACE (GEMINI GUI)     "
echo "=================================================================="

if [ "$EUID" -ne 0 ]; then
    echo "ERRO: O desinstalador precisa de privilégios de administrador para remover componentes do sistema."
    echo "Por favor, execute: sudo ./uninstall.sh"
    exit 1
fi

REMOVED_PATHS=()

remove_target() {
    local target="$1"
    if [ -e "$target" ] || [ -L "$target" ]; then
        rm -rf "$target"
        REMOVED_PATHS+=("$target")
        echo "   [REMOVIDO] $target"
    fi
}

echo "[1/4] Removendo binários, executáveis e atalhos do sistema..."
remove_target "/opt/gemini-gui"
remove_target "/usr/local/bin/gemini-gui"
remove_target "/usr/bin/gemini-gui"
remove_target "/usr/share/applications/gemini-gui.desktop"
update-desktop-database 2>/dev/null || true

echo "[2/4] Removendo políticas de segurança de sistema criadas pela aplicação..."
remove_target "/etc/gemini-cli/policies/deny-google-search.toml"
rmdir /etc/gemini-cli/policies 2>/dev/null || true
rmdir /etc/gemini-cli 2>/dev/null || true

echo "[3/4] Removendo dados, configurações, histórico, logs e agentes da aplicação..."
TARGET_USER_HOME="${HOME:-/root}"
USER_HOMES=("$TARGET_USER_HOME")

if [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
    SUDO_HOME=$(eval echo "~$SUDO_USER" 2>/dev/null || true)
    if [ -n "$SUDO_HOME" ]; then
        USER_HOMES+=("$SUDO_HOME")
    fi
fi

# Remover em todos os diretórios HOME relevantes
for UHOME in "${USER_HOMES[@]}"; do
    if [ -d "$UHOME/.gemini" ]; then
        remove_target "$UHOME/.gemini/history"
        remove_target "$UHOME/.gemini/tmp"
        remove_target "$UHOME/.gemini/agents"
        remove_target "$UHOME/.gemini/projects.json"
        remove_target "$UHOME/.gemini/projects.json.lock"
        remove_target "$UHOME/.gemini/policies/deny-google-search.toml"
        remove_target "$UHOME/.gemini/settings.json"
        rmdir "$UHOME/.gemini/policies" 2>/dev/null || true
        rmdir "$UHOME/.gemini" 2>/dev/null || true
    fi
done

# Remover armazenamento da workspace
remove_target ".gemini-gui-storage.json"
remove_target ".gemini"
remove_target "dist-ubuntu"

echo "[4/4] Removendo logs temporários..."
remove_target "cli-debug.log"
for f in /tmp/gemini-gui-*.log /tmp/gemini-client-error-*.json; do
    if [ -f "$f" ]; then
        remove_target "$f"
    fi
done

echo "=================================================================="
echo "   DESINSTALAÇÃO COMPLETA CONCLUÍDA COM SUCESSO!                 "
echo "   Total de caminhos removidos: ${#REMOVED_PATHS[@]}"
echo "   O sistema foi retornado ao estado limpo sem resíduos da app."
echo "=================================================================="
