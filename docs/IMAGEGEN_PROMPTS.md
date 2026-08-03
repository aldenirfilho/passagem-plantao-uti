# Prompts de geração visual — Passagem UTI v5

Registro reprodutível dos prompts usados para gerar os três conceitos visuais. As peças são conceitos com identidades fictícias; não comprovam funcionalidade implementada.

## Cockpit do plantonista

```text
Use case: ui-mockup
Asset type: 16:9 product concept image for the Passagem UTI v5 documentation
Primary request: create a polished high-fidelity desktop dashboard concept for an adult ICU on-duty physician, showing ten distinct bed batteries L1 through L10, a professional on-duty profile card, an opportunity/equity panel, unresolved tasks and a shift continuity timeline.
Scene/backdrop: premium aerospace medical operations cockpit, dark navy interface with luminous cyan, teal and restrained violet accents.
Subject: one practical clinical dashboard, not a science-fiction scene; ten clearly separate bed status cards with legible labels L1, L2, L3, L4, L5, L6, L7, L8, L9, L10.
Style/medium: realistic SaaS UI product mockup, Turbo TEMI Premium visual hierarchy, crisp modern typography, accessible contrast.
Composition/framing: widescreen 16:9, straight-on desktop view, generous margins, profile and shift state at top, ten beds central, opportunity and checklist panels on the right.
Text (verbatim): "PASSAGEM UTI", "PLANTONISTA VIGENTE", "OPORTUNIDADES DO PLANTÃO", "10 LEITOS".
Constraints: all patient names and values must be obvious fictional placeholders; show progress as continuity/completeness, never as speed or competition; no ranking, leaderboard, stopwatch, gamified trophies or punitive score.
Avoid: real hospital brands, real patient data, caduceus, ECG decoration, excessive neon, tiny unreadable text, watermark.
```

## Central do coordenador

```text
Use case: ui-mockup
Asset type: 16:9 product concept image for the Passagem UTI v5 documentation
Primary request: create a polished high-fidelity desktop coordinator command-center concept for an adult ICU, showing ten distinct bed batteries L1 through L10, shift coverage, unresolved clinical workflow opportunities, intervention notes, an audit trail, and fair workload visibility.
Scene/backdrop: premium aerospace medical operations cockpit, dark graphite and deep navy interface with luminous cyan, teal, amber and restrained violet accents.
Subject: one practical coordinator dashboard, not a science-fiction scene; ten clearly separate bed status cards with legible labels L1, L2, L3, L4, L5, L6, L7, L8, L9, L10.
Style/medium: realistic SaaS UI product mockup, Turbo TEMI Premium visual hierarchy, crisp modern typography, accessible contrast.
Composition/framing: widescreen 16:9, straight-on desktop view, coordinator identity and ICU status at top, ten beds central, opportunities and intervention/audit panels on the right.
Text (verbatim): "PASSAGEM UTI", "CENTRAL DO COORDENADOR", "OPORTUNIDADES ASSISTENCIAIS", "CONTINUIDADE DO PLANTÃO".
Constraints: all clinician and patient names and values must be obvious fictional placeholders; show workflow completeness and unattended opportunities, never speed or competition; coordinator intervention must appear as a documented note or task, not a medical prescription; no ranking, leaderboard, stopwatch, gamified trophies or punitive score.
Avoid: real hospital brands, real patient data, caduceus, ECG decoration, excessive neon, tiny unreadable text, watermark.
```

## Ecossistema da Cápsula UTI

```text
Use case: explanatory-diagram
Asset type: 16:9 visual concept for the Passagem UTI v5 documentation
Primary request: create a polished product ecosystem diagram that explains a living "Cápsula UTI" moving safely between the current on-duty clinician, the next clinician and the coordinator, with exports to WhatsApp, PDF, Markdown and TXT and a native interactive capsule import.
Scene/backdrop: premium aerospace medical operations interface on a deep navy background with cyan, teal and restrained violet highlights.
Subject: a central glowing but professional capsule-shaped data container labelled Cápsula UTI, connected by clean directional paths to three role cards and five clearly separated export format tiles.
Style/medium: high-fidelity SaaS product concept, editorial infographic, Turbo TEMI Premium visual hierarchy, crisp modern typography, accessible contrast.
Composition/framing: widescreen 16:9; central capsule; current clinician on left, next clinician on right, coordinator above; format tiles below; a subtle continuity timeline loops between shifts.
Text (verbatim): "CÁPSULA UTI", "PLANTONISTA VIGENTE", "PRÓXIMO PLANTONISTA", "COORDENADOR", "WHATSAPP", "PDF", "MARKDOWN", "TXT", "APP INTERATIVO", "CONTINUIDADE VIVA".
Constraints: use obvious fictional placeholder identities only; present the native capsule as a validated structured snapshot; indicate that external sharing requires confirmation; show local-first mode and future institutional online synchronization as visibly distinct concepts; no implication that WhatsApp is the clinical source of truth.
Avoid: real hospital brands, real patient data, caduceus, ECG decoration, tiny unreadable text, watermark, fantasy spacecraft scene.
```

## Arquivos resultantes

- `docs/assets/concepts/cockpit-plantonista-v5.png`
- `docs/assets/concepts/central-coordenador-v5.png`
- `docs/assets/concepts/capsula-uti-v5.png`
- versões WebP otimizadas para o tutorial em `assets/tutorial/`

## Guardrail de sanitização aplicado na revisão final

Os conceitos originais foram editados antes da publicação. O gate visual exigiu, conforme o papel de cada tela:

```text
Preserve o layout aeroespacial premium e o grid L1–L10, mas remova toda fotografia fotorrealista, nome próprio, iniciais humanas, idade, sexo, data real, CRM, RQE, matrícula, prontuário, telefone, e-mail e identificador plausível. Use apenas avatares abstratos, “PROFISSIONAL DEMO”, “COORDENADOR DEMO”, “CRM-UF 00000”, “RQE 00000”, “PACIENTE DEMO L1” até “PACIENTE DEMO L10”, “NÃO INFORMADO” e “DD/MM/AAAA”. Incorpore um selo grande e legível “CONCEITO FUTURO · DADOS FICTÍCIOS”. Não invente outras identidades.
```

Para a Cápsula UTI, também foi aplicado este corretivo de fronteira de produto:

```text
Apresente “CÁPSULA UTI · SNAPSHOT LOCAL · NÃO ASSINADO”; “FONTE OFICIAL: PRONTUÁRIO INSTITUCIONAL”; “MODO LOCAL-FIRST · DISPONÍVEL AGORA” com “DADOS NO DISPOSITIVO”, “IA OPCIONAL VIA SERVIDOR LOCAL”, “TRANSFERÊNCIA MANUAL” e “SEM NUVEM NESTA RC”; e “SINCRONIZAÇÃO INSTITUCIONAL · ARQUITETURA FUTURA”. WhatsApp deve dizer “ABRE APÓS CONFIRMAÇÃO · ENVIO MANUAL”. A faixa inferior deve dizer “SNAPSHOT LOCAL · CONTROLE DO USUÁRIO · NÃO ASSINADO”. Não alegue autenticação, assinatura, RBAC, criptografia, auditoria institucional ou sincronização online implementada.
```
