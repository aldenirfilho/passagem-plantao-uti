#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "${script_dir}/.." && pwd)"
release_path="${1:-${project_dir}/../PASSAGEM_UTI_v5_RC_SEGURO.zip}"
stage_dir="$(mktemp -d)"
stage_app="${stage_dir}/passagem-plantao-uti-v5"

cleanup() {
  rm -rf "${stage_dir}"
}
trap cleanup EXIT

mkdir -p "${stage_app}"

required_files=(
  ".env.example"
  ".gitignore"
  "README.md"
  "app.js"
  "attachment-contract.mjs"
  "index.html"
  "package-lock.json"
  "package.json"
  "server.mjs"
  "start-mac.command"
  "styles.css"
  "tutorial.css"
  "tutorial.html"
)

for relative_path in "${required_files[@]}"; do
  if [[ ! -f "${project_dir}/${relative_path}" ]]; then
    echo "Arquivo obrigatório ausente: ${relative_path}" >&2
    exit 1
  fi
  cp "${project_dir}/${relative_path}" "${stage_app}/${relative_path}"
done

for directory in assets docs scripts tests; do
  if [[ -d "${project_dir}/${directory}" ]]; then
    cp -R "${project_dir}/${directory}" "${stage_app}/${directory}"
  fi
done

if [[ -d "${project_dir}/output/pdf" ]]; then
  shopt -s nullglob
  v5_pdfs=("${project_dir}"/output/pdf/*v5*.pdf "${project_dir}"/output/pdf/*V5*.pdf)
  if ((${#v5_pdfs[@]})); then
    mkdir -p "${stage_app}/output/pdf"
    cp "${v5_pdfs[@]}" "${stage_app}/output/pdf/"
  fi
  shopt -u nullglob
fi

find "${stage_app}" -type d -name "__pycache__" -prune -exec rm -rf {} +
find "${stage_app}" -type f \( -name "*.pyc" -o -name "*.zip" -o -name "*.capsula-uti.json" -o -name ".DS_Store" \) -delete
find "${stage_app}/docs/assets/screenshots" -maxdepth 1 -type f -name "*.png" -delete 2>/dev/null || true

if find "${stage_app}" -type f \( -name ".env" -o -name ".env.local" \) | grep -q .; then
  echo "Bloqueio: arquivo de segredo encontrado no staging." >&2
  exit 1
fi

if find "${stage_app}" -type f \( -name "*.pem" -o -name "*.p12" -o -name "*.pfx" -o -name "*.key" -o -name "id_rsa" -o -name "id_ed25519" \) | grep -q .; then
  echo "Bloqueio: arquivo de credencial/certificado encontrado no staging." >&2
  exit 1
fi

secret_pattern='(sk-[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)'
if command -v rg >/dev/null 2>&1; then
  secret_match="$(rg -a -l --hidden "${secret_pattern}" "${stage_app}" | head -n 1 || true)"
else
  secret_match="$(LC_ALL=C grep -ERal "${secret_pattern}" "${stage_app}" | head -n 1 || true)"
fi
if [[ -n "${secret_match}" ]]; then
  echo "Bloqueio: padrão compatível com credencial encontrado no release." >&2
  exit 1
fi

mkdir -p "$(dirname "${release_path}")"
rm -f "${release_path}" "${release_path}.sha256"
(
  cd "${stage_dir}"
  zip -q -r "${release_path}" "passagem-plantao-uti-v5"
)
(
  cd "$(dirname "${release_path}")"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$(basename "${release_path}")" > "$(basename "${release_path}").sha256"
  else
    shasum -a 256 "$(basename "${release_path}")" > "$(basename "${release_path}").sha256"
  fi
)

echo "Release sanitizado: ${release_path}"
echo "Checksum: ${release_path}.sha256"
