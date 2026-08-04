# Inventário visual — Passagem UTI v5

| Código | Arquivo | Porta | Objetivo | Status |
|---|---|---|---|---|
| PUTI-V5-PROD-MP01-CARD-D-01 | `concepts/cockpit-plantonista-v5.png` | V2 | Comunicar dez leitos, perfil vigente e oportunidades | Sanitizada: avatar abstrato, DEMO/00000 e selo incorporado |
| PUTI-V5-PROD-MP02-CARD-D-01 | `concepts/central-coordenador-v5.png` | V2 | Comunicar visão futura de coordenação e auditoria | Sanitizada: identidades DEMO e selo incorporado |
| PUTI-V5-PROD-MP03-CARD-M-01 | `concepts/capsula-uti-v5.png` | V3 | Explicar transferência, continuidade e canais | Sanitizada: papéis DEMO, fronteira local/futuro e selo incorporado |
| PUTI-V5-BRAND-MP01-CARD-M-01 | `../../assets/logo-passagem-uti-aero.png` | V2 | Fixar bateria de dez leitos + órbita de continuidade | Validada e integrada |
| PUTI-V5-QA-SCREEN-01 | `screenshots/app-v5-light.webp` | V1 | Cockpit real no tema claro | Capturada e validada com dados sintéticos |
| PUTI-V5-QA-SCREEN-02 | `screenshots/app-v5-dark.webp` | V1 | Cockpit real no tema escuro | Capturada e validada com dados sintéticos |
| PUTI-V5-QA-SCREEN-03 | `screenshots/app-v5-opportunities.webp` | V2 | Oportunidades e intervenção local | Capturada e validada com dados sintéticos |
| PUTI-V5-QA-SCREEN-04 | `screenshots/app-v5-transfer.webp` | V2 | TXT, Markdown, PDF, WhatsApp e Cápsula | Capturada e validada com dados sintéticos |
| PUTI-V5-QA-SCREEN-05 | `screenshots/app-v5-mobile.webp` | V1 | Cabeçalho e continuidade em 390 × 844 | Capturada e validada com dados sintéticos |

## Perguntas de recuperação

1. O que os dez módulos da marca representam?
2. Qual formato mantém a estrutura interativa entre dispositivos?
3. Qual diferença existe entre snapshot local e sincronização institucional online?
4. Por que oportunidades não podem virar ranking do plantonista?

## Regra de interpretação

Imagens em `concepts/` mostram direção de produto, usam somente placeholders DEMO e carregam selo visual incorporado. Capturas em `screenshots/` mostram a implementação real testada. Uma imagem conceitual nunca serve como prova de funcionalidade, segurança ou conformidade. Os prompts e guardrails estão em [IMAGEGEN_PROMPTS.md](IMAGEGEN_PROMPTS.md).

## Fechamento visual

Cinco capturas reais foram adicionadas depois da estabilização do núcleo. Conceitos e capturas continuam separados para que direção de produto não seja confundida com evidência de implementação.
