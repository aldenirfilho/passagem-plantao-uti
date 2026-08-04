#!/bin/zsh
set -e

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "Node.js não encontrado" message "Instale o Node.js 20 ou mais recente para iniciar o Passagem UTI." as critical'
  exit 1
fi

PASSAGEM_NODE_MAJOR=$(node -p 'Number(process.versions.node.split(".")[0])')
if [[ "$PASSAGEM_NODE_MAJOR" -lt 20 ]]; then
  osascript -e 'display alert "Node.js precisa ser atualizado" message "O Passagem UTI requer Node.js 20 ou mais recente." as critical'
  exit 1
fi

PASSAGEM_PORT="${PORT:-4173}"
if ! [[ "$PASSAGEM_PORT" =~ '^[0-9]+$' ]] || [[ "$PASSAGEM_PORT" -lt 1 ]] || [[ "$PASSAGEM_PORT" -gt 65535 ]]; then
  osascript -e 'display alert "Porta local inválida" message "Use PORT entre 1 e 65535 ou remova a variável para usar 4173." as critical'
  exit 1
fi

node server.mjs &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM

for attempt in {1..30}; do
  if curl -fsS "http://127.0.0.1:${PASSAGEM_PORT}/api/health" >/dev/null 2>&1; then
    open "http://127.0.0.1:${PASSAGEM_PORT}"
    wait "$SERVER_PID"
    exit $?
  fi
  sleep 0.2
done

echo "O aplicativo não iniciou em http://127.0.0.1:${PASSAGEM_PORT}"
exit 1
