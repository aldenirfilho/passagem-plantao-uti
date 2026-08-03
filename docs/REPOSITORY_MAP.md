# Passagem UTI — Mapa do Repositório

> **RASCUNHO — NÃO É PARECER JURÍDICO.** Este mapa orienta navegação e armazenamento seguro. Ele não homologa o repositório para dados clínicos nem substitui política institucional.

## 1. Identificação

| Campo | Valor |
|---|---|
| Repositório | `passagem-plantao-uti-v5` |
| Responsável técnico | ________________________________ |
| Responsável clínico | ________________________________ |
| Responsável de segurança/privacidade | ________________________________ |
| Versão do mapa | ________________________________ |
| Commit de referência | ________________________________ |
| Última revisão | ____/____/________ |
| Próxima revisão | ____/____/________ |

## 2. Regra de armazenamento

O repositório é para **código, configuração sem segredo, documentação não clínica e dados sintéticos**.

É proibido armazenar no GitHub, Notion, Google Drive ou iCloud:

- nome, iniciais, prontuário ou qualquer identificador de paciente real;
- passagem, evolução, prescrição, diagnóstico, exame, imagem ou áudio clínico real;
- captura de tela de prontuário ou dispositivo assistencial;
- arquivo/exportação de produção, backup ou dump;
- prompt/output contendo conteúdo real;
- log sensível ou identificador reidentificável;
- chave de API, token, senha, cookie de sessão, certificado privado ou credencial.

Essas ferramentas podem guardar apenas documentos não clínicos, fixtures totalmente sintéticas e métricas agregadas aprovadas. Segredos ficam em gerenciador homologado; o repositório contém somente nomes de variáveis e exemplos falsos.

Se houver dúvida sobre um arquivo, **não faça commit**. Contate: ________________________________

## 3. Fronteira de produto

| Estado | Fonte da verdade |
|---|---|
| **ATUAL — LOCAL** | Código e README do repositório. A baseline é local, usa navegador/IndexedDB e servidor local; não possui identidade institucional, multi-tenancy, sync, RBAC ou auditoria central comprovados. |
| **FUTURO — ONLINE V5** | Documentos em `docs/` são propostas e requisitos. Uma capacidade só muda para implementada quando estiver no código, coberta por testes e aprovada no gate. |

## 4. Visão estrutural

Confirme os nomes no commit indicado; diretórios podem evoluir.

```text
passagem-plantao-uti-v5/
├── README.md                  # instalação, execução e visão da baseline local
├── package.json               # scripts e dependências do projeto
├── [arquivos da aplicação]    # frontend/backend local conforme o build
├── assets/                    # ícones, logotipo e recursos visuais não clínicos
├── docs/                      # especificações e modelos de governança
├── scripts/                   # automações de desenvolvimento, quando existentes
├── tests/                     # testes e fixtures exclusivamente sintéticas
└── output/                    # artefatos gerados não sensíveis, quando existente
```

Itens entre colchetes ou diretórios ausentes são descritivos; não presumir que existem sem verificar o repositório.

## 5. Onde cada artefato deve ficar

| Artefato | Local recomendado | Pode versionar? | Regra |
|---|---|---:|---|
| Código-fonte | Raiz/subdiretório de código | Sim | Sem segredo ou dado clínico |
| Logotipo/ícone | `assets/` | Sim | Sem material de paciente/terceiro não licenciado |
| Documentação de produto | `docs/` | Sim | Somente não clínica |
| Fixture sintética | `tests/fixtures/` se criada | Sim | 100% fictícia e revisada |
| Resultado de piloto sintético | `output/pilot/` se criado | Sim, após revisão | Agregado, sem identidade real |
| Configuração de exemplo | `.env.example` se criado | Sim | Apenas nomes/valores falsos |
| Chave/token/senha | Secret manager/configuração local ignorada | **Não** | Nunca em commit, docs ou frontend |
| Dado clínico real | Sistema assistencial homologado | **Não** | Nunca neste repositório |
| Evidência de produção | Cofre/sistema institucional aprovado | **Não** | Referenciar por ID não sensível |
| Métrica agregada | Repositório ou BI aprovado | Condicional | Tamanho mínimo de grupo + revisão |

## 6. Índice de documentos

### Visão, produto e negócio

| Documento | Finalidade | Estado |
|---|---|---|
| [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) | Problema, proposta de valor e fronteiras | Proposta |
| [PRD_V5.md](PRD_V5.md) | Personas, jornadas e requisitos V5 | Proposta |
| [BUSINESS_MONETIZATION.md](BUSINESS_MONETIZATION.md) | Hipóteses de negócio e monetização | Proposta |
| [ROADMAP.md](ROADMAP.md) | Fases e dependências | Proposta |
| [RELEASE_NOTES_V5.md](RELEASE_NOTES_V5.md) | Conteúdo e limites da entrega V5 | Rascunho |
| [BRAND_GUIDE.md](BRAND_GUIDE.md) | Marca, paleta e regras de linguagem | Implementado |

### Arquitetura e domínio

| Documento | Finalidade | Estado |
|---|---|---|
| [ARCHITECTURE_ONLINE.md](ARCHITECTURE_ONLINE.md) | Arquitetura futura online | Proposta, não implementada |
| [CAPSULA_UTI_SPEC.md](CAPSULA_UTI_SPEC.md) | Modelo da cápsula viva e versionamento | Especificação |
| [DATA_GOVERNANCE_SYNC.md](DATA_GOVERNANCE_SYNC.md) | Governança de dados e sincronização | Proposta |
| [SYNC_MANIFEST.yaml](SYNC_MANIFEST.yaml) | Manifesto técnico de sincronização | Proposta |
| [CONTINUITY_COCKPIT.md](CONTINUITY_COCKPIT.md) | Modelo local de responsabilidade, atividades e oportunidades | Implementado localmente |

### Segurança, clínica e privacidade

| Documento | Finalidade | Estado |
|---|---|---|
| [CLINICAL_SAFETY_CASE.md](CLINICAL_SAFETY_CASE.md) | Perigos, controles e evidências clínicas | Proposta para validação |
| [SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md) | Ameaças, limites de confiança e controles | Proposta para validação |
| [LGPD_PRIVACY.md](LGPD_PRIVACY.md) | Diretrizes LGPD e papéis | Proposta para validação |
| [RIPD_TEMPLATE.md](RIPD_TEMPLATE.md) | Modelo preenchível de avaliação de impacto | Rascunho jurídico-operacional |
| [PRIVACY_NOTICE_DRAFT.md](PRIVACY_NOTICE_DRAFT.md) | Modelo de aviso ao titular | Rascunho jurídico |
| [TERMS_OF_USE_DRAFT.md](TERMS_OF_USE_DRAFT.md) | Modelo de termos do serviço | Rascunho jurídico |

### Piloto, métricas e lançamento

| Documento | Finalidade | Estado |
|---|---|---|
| [PILOT_PROTOCOL.md](PILOT_PROTOCOL.md) | Piloto inicial exclusivamente sintético | Rascunho operacional |
| [METRICS_DICTIONARY.md](METRICS_DICTIONARY.md) | Definições e uso não punitivo de métricas | Rascunho de governança |
| [DECISION_LOG.md](DECISION_LOG.md) | Decisões, condicionantes e evidências | Registro vivo |
| [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) | Gates antes de liberação | Proposta |
| [REPOSITORY_MAP.md](REPOSITORY_MAP.md) | Navegação e regras de armazenamento | Este documento |
| [QA_REPORT_V5.md](QA_REPORT_V5.md) | Evidências automatizadas, navegador, acessibilidade e PDF | RC1 validada com dados sintéticos |
| [QA_REPRODUCIBILITY.md](QA_REPRODUCIBILITY.md) | Runner E2E sintético, dependências pinadas e comandos de reprodução | Implementado |
| [TUTORIAL_QA.md](TUTORIAL_QA.md) | QA específico do tutorial ilustrado | Validado |
| [VISUAL_INVENTORY.md](VISUAL_INVENTORY.md) | Conceitos e capturas verificadas | Atualizado |
| [IMAGEGEN_PROMPTS.md](IMAGEGEN_PROMPTS.md) | Prompts exatos dos conceitos visuais | Registro reprodutível |
| [01_SCALTS_FINAL.md](01_SCALTS_FINAL.md) | Fechamento Turbo TEMI e inventário da RC1 | Atualizado no fechamento |

## 7. Fluxo de contribuição

1. Verifique a fronteira atual/local versus futuro/online.
2. Crie branch/alteração com escopo pequeno e sem dado real.
3. Use apenas fixtures sintéticas aprovadas.
4. Execute testes e varredura de segredos.
5. Registre decisão material em [DECISION_LOG.md](DECISION_LOG.md).
6. Solicite revisão técnica e, conforme o impacto, clínica, segurança, DPO e jurídica.
7. Atualize release notes e este mapa quando a estrutura mudar.
8. Não marque capacidade futura como pronta sem código e evidência.

**Revisores obrigatórios por tipo:**

| Mudança | Revisão mínima |
|---|---|
| UI/texto não clínico | Produto + engenharia |
| Prompt/schema de cápsula | Produto + clínica + engenharia |
| Autenticação/permissão/sync | Engenharia + segurança + privacidade |
| Retenção/telemetria/IA | DPO/jurídico + segurança + clínica |
| Gate de produção | Todas as áreas designadas |

## 8. Checklist antes do commit

- ☐ Nenhum dado clínico ou identificador real.
- ☐ Nenhuma chave, token, senha ou certificado privado.
- ☐ Fixtures são 100% sintéticas e não adaptadas de caso real.
- ☐ Logs e screenshots foram minimizados.
- ☐ A descrição não confunde local atual com online futuro.
- ☐ Métricas são agregadas e não punitivas.
- ☐ Links relativos funcionam.
- ☐ Testes relevantes passaram.

**Revisor:** __________________  
**Data:** ____/____/________

## 9. Resposta a vazamento acidental no repositório

1. Pare o compartilhamento e informe imediatamente [CANAL DE SEGURANÇA].
2. Não apenas apague o arquivo ou faça commit corretivo; conteúdo pode persistir no histórico e clones.
3. Revogue/rotacione qualquer segredo exposto.
4. Preserve evidências mínimas e siga o runbook institucional de incidente.
5. Avalie remoção segura do histórico com responsáveis pelo repositório.
6. Registre o incidente fora do repositório, no sistema homologado.
7. Verifique obrigações vigentes com controlador, DPO e jurídico.

**Canal de segurança:** ________________________________  
**Canal do DPO:** ________________________________

## 10. Governança do mapa

Atualizar este documento quando:

- um diretório relevante for criado, renomeado ou removido;
- uma função mudar de proposta para implementada;
- surgir nova classe de dado ou integração;
- política de retenção, teste ou release mudar;
- auditoria identificar armazenamento indevido.

**Aprovação técnica:** ________________________________  
**Aprovação segurança/privacidade:** ________________________________  
**Aprovação clínica:** ________________________________
