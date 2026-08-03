# Passagem UTI v5 — índice para Apple Notes e iCloud

**Classificação:** documentação de produto sem dados clínicos  
**Aviso:** este arquivo não contém nem deve receber chave, cápsula real, exame, nome de paciente ou prontuário.

## Nota principal sugerida

**Título:** 🚀 Passagem UTI v5 — Central do Produto

**Conteúdo:**

- Missão: reduzir perda de contexto na continuidade do plantão de UTI.
- Baseline atual: aplicativo local-first, dez leitos, dez linhas, checklist, read-back, exportações e Cápsula UTI.
- Estado: candidato técnico a piloto somente com dados sintéticos.
- Online multiusuário: arquitetura futura; não disponível na versão local.
- Fonte canônica do código: repositório GitHub \`aldenirfilho/passagem-plantao-uti\`.
- Fonte canônica dos documentos: pasta \`docs/\` do mesmo repositório.
- Próxima decisão: concluir checklist de lançamento e aprovar piloto institucional.

## Estrutura de pastas sugerida no iCloud

\`\`\`text
Passagem UTI — Produto (SEM DADOS CLÍNICOS)/
├── 00 — Índice e decisões
├── 01 — Produto e UX
├── 02 — Arquitetura e engenharia
├── 03 — Segurança clínica, LGPD e segurança
├── 04 — Piloto e monetização
├── 05 — Marca e imagens sintéticas
└── 06 — Releases sanitizados
\`\`\`

## O que pode ser copiado

- README, PRD, roadmap, arquitetura, decisões e release notes.
- Imagens conceituais e capturas com dados sintéticos.
- Pacote sanitizado do aplicativo, sem \`.env\`.
- Links para GitHub, Notion e Drive.

## O que nunca deve ser copiado

- \`.env\`, chave OpenAI, tokens e certificados.
- Cápsula UTI ou exportação de caso real.
- PDF, imagem, exame ou texto clínico identificável.
- Logs, screenshots ou vídeos com dados de pacientes/profissionais reais.

## Atualização manual segura

1. Confira \`docs/SYNC_MANIFEST.yaml\`.
2. Atualize primeiro o GitHub, que é a fonte canônica de engenharia.
3. Copie para Notes/iCloud somente o índice e o pacote sanitizado da release.
4. Registre versão, data e commit; não sobrescreva releases antigas sem histórico.
5. Se houver dúvida sobre classificação, não sincronize até revisão de privacidade.

O conector Apple Notes/iCloud não estava disponível no ambiente que montou esta release. Por isso, este arquivo é um roteiro de importação manual e não uma confirmação de sincronização.
