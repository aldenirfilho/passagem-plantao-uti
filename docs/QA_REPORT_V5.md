# Relatório de QA — Passagem UTI v5 RC1

**Build:** `5.0.0-rc.1`  
**Data:** 03/08/2026  
**Escopo:** candidato técnico local-first, somente dados sintéticos  
**Gate clínico:** não liberado para pacientes reais ou produção

## Resultado executivo

O núcleo local foi exercitado por testes automatizados e por um fluxo real no Chromium. Não foram encontrados erros de JavaScript, overflow horizontal, injeção de HTML na impressão ou violações automatizadas de acessibilidade nos estados avaliados. Isso não equivale a validação clínica, segurança de produção, conformidade jurídica ou homologação institucional.

## Evidências automatizadas

| Porta | Evidência | Resultado |
|---|---|---:|
| Sintaxe | `node --check app.js` e `node --check server.mjs` | aprovado |
| Suíte Node | `npm test` | 63/63 aprovados |
| Cápsula UTI | schema, round-trip, isolamento por leito, limite de 4 MiB, merge/replace, reconciliação de contexto e conteúdo hostil | aprovado |
| Continuidade | assumir, transferir, encerrar, autoria centralizada, atividades, oportunidades e dois identificadores | aprovado |
| Saídas | paridade de TXT, Markdown, WhatsApp, PDF e Cápsula para alertas/lacunas da IA | aprovado |
| PDF/impressão | leito/plantão, dois leitos, 10 linhas, pendências, atividades, read-back e limpeza | aprovado |
| Anexos | contrato compartilhado no frontend/servidor, limites por arquivo/lote, base64 canônico, MIME/extensão, assinaturas, estrutura OOXML/ODT e casos adversariais; SVG/HTML/executáveis bloqueados | aprovado |
| Servidor | origem loopback fixa, limites, erros sanitizados, allowlist e health check | aprovado |
| Dependências de QA | `npm audit --audit-level=high` | 0 vulnerabilidades conhecidas |

## Fluxo real no navegador

Foi executado pelo runner versionado `scripts/qa-browser.mjs` um cenário sintético com perfil de coordenadora, modo de UTI declarado localmente, dois leitos fictícios e resposta de IA simulada. O endpoint `/api/render` foi interceptado; nenhuma chamada real à OpenAI foi feita. O fluxo comprovou:

- plantonista vigente, papel, modo e horário informativo;
- geração e renderização de 10/10 linhas;
- três atividades manuais registradas;
- sugestão aceita como pendência ativa;
- tarefa de coordenação com autoria e auditoria local;
- painel de oportunidades L1–L10 sem ranking;
- central de transferência com TXT, Markdown, impressão/PDF, WhatsApp e Cápsula UTI;
- aviso explícito antes de abrir WhatsApp, sem envio automático;
- preparação da impressão do plantão com dois artigos/leitos e limpeza após `afterprint`;
- zero imagens/elementos injetados pelo conteúdo clínico no DOM de impressão;
- zero erros de console e remoção dos artefatos temporários.

A suíte Node e sondas independentes de navegador cobrem separadamente o bloqueio de novos eventos/atividades sem plantonista vigente, a autoria importada marcada como “Importado · não verificado” e a permanência de “ORIGEM IA” após o aceite. Esses três cenários não são atribuídos ao runner E2E principal.

## Acessibilidade e responsividade

O axe-core retornou zero violações em seis estados automatizados:

- tema escuro;
- diálogo de oportunidades;
- diálogo de transferência;
- viewport móvel de 390 × 844;
- tutorial desktop;
- tutorial móvel.

Também foram confirmados foco/semântica no tutorial, ausência de overflow horizontal em 1440 px e 390 px e imagens 4/4 carregadas. Auditoria automatizada não substitui teste com usuários, tecnologias assistivas e teclado em diferentes navegadores.

Reprodução: `npm install`, `npm test` e `npm run test:e2e`, conforme [QA_REPRODUCIBILITY.md](QA_REPRODUCIBILITY.md).

## Tutorial e PDF

- tutorial HTML: 16 seções, links internos válidos, imagens WebP carregadas;
- HTML validator: zero erros e zero avisos na revisão do tutorial;
- PDF final: A4, 17 páginas, marcado, sem JavaScript;
- inspeção: 17/17 páginas renderizadas e revisadas;
- correções realizadas após a primeira inspeção: remoção do link de salto repetido e prevenção de títulos órfãos;
- segunda inspeção: sem página vazia, sobreposição, corte material ou imagem deformada.

## Capturas verificadas

Todos os nomes, IDs, CRM, hospital e dados exibidos são sintéticos:

- `docs/assets/screenshots/app-v5-light.webp`;
- `docs/assets/screenshots/app-v5-dark.webp`;
- `docs/assets/screenshots/app-v5-opportunities.webp`;
- `docs/assets/screenshots/app-v5-transfer.webp`;
- `docs/assets/screenshots/app-v5-mobile.webp`.

## Portas ainda obrigatórias

- rotação da chave que circulou no ZIP;
- revisão independente de segurança e privacidade;
- Relatório de Impacto à Proteção de Dados Pessoais (RIPD), base legal, contratos e retenção;
- validação clínica formal e estudo de fatores humanos;
- autenticação, autorização, isolamento por instituição, auditoria central e resposta a incidentes para a versão online;
- homologação institucional e plano de rollback antes de dados reais.

A inspeção de anexos nesta RC é defesa em profundidade no aplicativo, não antivírus, sandbox de documentos nem análise completa de conteúdo ativo. Arquivos clínicos reais continuam proibidos neste candidato sintético.

## Veredito

**Apto para demonstração e piloto técnico exclusivamente sintético. Não apto para uso assistencial real, produção ou sincronização multiusuário.**

Os quatro bloqueadores funcionais da primeira auditoria (isolamento da Cápsula de leito, importação de identidade/contexto, paridade de alertas/lacunas e autoria divergente) foram corrigidos e cobertos por testes negativos. Permanecem gates institucionais e arquiteturais; este veredito não os reclassifica.
