# Passagem UTI — Notas da Versão V5

> **RASCUNHO — NÃO É PARECER JURÍDICO.** Este documento descreve um marco de produto e documentação. Não representa homologação clínica, jurídica, de privacidade, segurança ou liberação para dados reais.

## 1. Identificação da entrega

| Campo | Valor |
|---|---|
| Nome da entrega | Passagem UTI v5 — RC local-first e fundação institucional |
| Versão/tag | `5.0.0-rc.1` · tag ainda não criada |
| Commit | branch de revisão `agent/uti-handoff-v2` · hash registrado na publicação |
| Data | 03/08/2026 |
| Responsável | ________________________________ |
| Ambiente | ☒ Local ☒ Protótipo sintético ☐ Homologação ☐ Produção |
| Estado | ☐ Em preparação ☒ Candidata ☐ Publicada ☐ Retirada |
| Gate de dados reais | **NÃO AUTORIZADO** até aprovação formal |

## 2. Resumo executivo

V5 consolida a visão do Passagem UTI como cápsula viva de continuidade assistencial e cria uma base documental para evolução segura. Esta entrega **não afirma que a plataforma online está pronta**.

### ATUAL — LOCAL

A baseline disponível no repositório oferece, conforme o README e o código existente:

- 10 leitos e 10 tópicos estruturados por leito;
- entrada por texto/arquivo e geração assistida por GPT via servidor local;
- persistência local em IndexedDB;
- anexos locais, checklist e linha do tempo;
- Radar UTI, read-back, comandos, temas claro/escuro/Turbo e notificações locais;
- plantonista vigente, transferência e encerramento com histórico/auditoria no dispositivo;
- papéis Plantonista, Coordenador e Diarista e modos UTI oficial/ad hoc, todos locais;
- atividades manuais por leito e painel de oportunidades assistenciais sem ranking ou velocidade;
- exportação de leito ou plantão em TXT, Markdown e impressão/Salvar em PDF;
- WhatsApp com confirmação explícita, sem escolha de contato ou envio automático;
- Cápsula UTI `.capsula-uti.json` validada, importável por mesclagem ou substituição, sem anexos, credenciais ou código;
- chave de API mantida no servidor local, fora do frontend.

### FUTURO — ONLINE V5

Os documentos propõem identidade, organizações, unidades, multi-tenancy, RBAC, sincronização, auditoria, armazenamento em nuvem, dois modos de plantão e governança ampliada. Essas capacidades continuam **futuras** até existirem código, testes, infraestrutura e gates aprovados.

## 3. O que esta entrega acrescenta

### Produto e arquitetura

- visão de produto, personas e requisitos da V5;
- arquitetura online proposta e limites de confiança;
- especificação da cápsula viva, versionamento e read-back;
- roadmap e checklist de lançamento.

### Segurança clínica, privacidade e governança

- safety case clínico e threat model;
- diretrizes LGPD e governança de sincronização;
- modelo de RIPD, aviso de privacidade e termos de uso;
- protocolo de piloto sintético;
- dicionário de métricas não punitivas;
- registro de decisões e mapa do repositório.

### Negócio

- hipóteses de monetização e posicionamento para validação;
- separação entre produto local demonstrável e serviço online proposto.

## 4. O que não está implementado ou liberado

Até que código e evidências digam o contrário, considerar **não disponível**:

- login institucional, OIDC/OAuth2 e MFA;
- organizações, unidades e isolamento multi-tenant;
- RBAC no backend e break-glass auditado;
- sincronização entre dispositivos e resolução de conflitos;
- trilha de auditoria central/imutável;
- armazenamento de anexos em nuvem e retenção institucional;
- portal de direitos do titular;
- integrações com prontuário, SSO, agenda ou mensageria;
- métricas online de produção;
- implantação assistencial com pacientes reais.

Não usar mockup, documento ou interface estática como prova de controle implementado.

## 5. Cinco frentes funcionais propostas para plantonistas

| Frente | Benefício esperado | Estado nesta entrega |
|---|---|---|
| Oportunidades do plantão | Destacar lacunas, tarefas e revisões por leito | Implementado localmente; não é alarme clínico |
| Read-back versionado | Confirmar entendimento e invalidar aceite após mudança | Implementado localmente; sync futuro |
| Cápsula UTI portátil | Transportar snapshot estruturado, validado e sem anexos | Implementado localmente; cápsula viva online futura |
| Notificações discretas | Avisar fatos registrados sem pretender monitorar paciente | Implementado localmente; entrega online futura |
| Continuidade e fallback manual | Registrar responsabilidade e manter edição sem IA | Implementado localmente; coordenação remota futura |

O estado exato deve ser confirmado no build indicado nesta nota.

## 6. Dados, privacidade e segredos

- O piloto V5 inicial aceita somente dados sintéticos.
- É proibido guardar conteúdo clínico, dado identificável, exame real, captura de prontuário, exportação de produção ou log sensível no GitHub, Notion, Google Drive ou iCloud.
- Chaves de API, tokens e senhas não entram no repositório, documentação, prompt ou frontend.
- Segredos ficam no servidor local protegido ou, no futuro online, em secret manager homologado.
- Métricas são agregadas e não punitivas, sem ranking individual e sem decisão trabalhista automatizada.

## 7. Compatibilidade e migração

| Item | Definição |
|---|---|
| Origem suportada | ________________________________ |
| Navegadores/sistemas | Node.js 20+; Chromium coberto por QA automatizada; macOS previsto pelo iniciador; Safari ainda requer validação manual |
| Migração de dados locais | **Não definida**; não exportar dado real para teste |
| Mudança de schema | Cápsula `passagem-uti-capsule` v1; importação estrutural validada e sem confiança em identidade externa |
| Backup antes da atualização | ________________________________ |
| Rollback | reinstalar o pacote anterior sem importar dado real; estratégia institucional ainda não definida |

Nenhuma migração automática de dado clínico local para nuvem está autorizada por esta nota.

## 8. Verificação da release

| Verificação | Evidência | Resultado |
|---|---|---|
| Instalação de dependências de QA | `npm install` + lockfile pinado | ☒ Passou ☐ Falhou ☐ N/A |
| 10 leitos e persistência local | suíte Node + cenário Chromium sintético | ☒ Passou ☐ Falhou ☐ N/A |
| Geração/revisão dos 10 tópicos | resposta sintética interceptada, 10/10 | ☒ Passou ☐ Falhou ☐ N/A |
| Checklist, timeline e read-back | testes automatizados + navegador | ☒ Passou ☐ Falhou ☐ N/A |
| Modo claro/escuro/Turbo | unidade + navegador; Turbo sem chamada externa | ☒ Passou ☐ Falhou ☐ N/A |
| Notificações sem conteúdo clínico | inspeção automatizada/fixtures sintéticas | ☒ Passou ☐ Falhou ☐ N/A |
| Falha da IA com fallback manual | caminho disponível; ensaio humano multiplataforma pendente | ☐ Passou ☐ Falhou ☒ N/A |
| Varredura de segredos | build sanitizado + padrões multi-provedor | ☒ Passou ☐ Falhou ☐ N/A |
| Links e documentação | 33 arquivos, zero alvo local ausente | ☒ Passou ☐ Falhou ☐ N/A |
| TXT, Markdown, WhatsApp e Cápsula UTI | 63 testes + navegador | ☒ Passou ☐ Falhou ☐ N/A |
| Impressão de leito e plantão/Salvar em PDF | navegador + inspeção do PDF | ☒ Passou ☐ Falhou ☐ N/A |
| Acessibilidade claro/escuro/dialogs | axe em 6 estados; teclado/leitor humano ainda pendente | ☒ Passou ☐ Falhou ☐ N/A |

**Executor:** Codex · QA automatizada exclusivamente sintética  
**Data:** 03/08/2026  
**Build testado:** `5.0.0-rc.1` na branch de revisão; hash no PR

## 9. Piloto e critérios de promoção

Estado do piloto: ☐ Não iniciado ☒ Sintético em curso ☐ Sintético aprovado ☐ Suspenso

Para promover esta release:

- ☒ dataset e identidades são 100% sintéticos;
- ☐ não há bloqueadores clínicos, de privacidade ou segurança;
- ☒ fallback manual permanece disponível e o read-back foi testado;
- ☒ resultados usam métricas não punitivas;
- ☐ decisão foi registrada em [DECISION_LOG.md](DECISION_LOG.md);
- ☒ limitações foram comunicadas.

Dados reais continuam bloqueados até um gate separado com RIPD, contratos, ambiente institucional, segurança, operação e aprovação clínica.

## 10. Problemas conhecidos

| ID | Limitação/risco | Impacto | Workaround | Dono/prazo |
|---|---|---|---|---|
| KN-01 | Baseline é local e depende do navegador/dispositivo | Sem colaboração institucional | Processo manual controlado | __________ |
| KN-02 | IA pode omitir ou interpretar incorretamente | Risco de síntese inadequada | Revisão humana obrigatória | __________ |
| KN-03 | Notificações locais não garantem entrega | Pendência não percebida | Canal assistencial oficial | __________ |
| KN-04 | WhatsApp é serviço externo e pode contrariar política institucional | Exposição indevida de dado pessoal/sensível | Desidentificar, obter autorização institucional e preferir canal homologado | __________ |
| KN-05 | A Cápsula atual é snapshot manual, não sincronização viva | Divergência entre dispositivos | Conferir contexto, horário, autoria e usar fonte oficial | __________ |
| KN-06 | Perfis e Cápsulas são autodeclarados, sem autenticação ou assinatura criptográfica | Autoria não comprovada | Nova assunção local obrigatória; não tratar como registro oficial | __________ |
| KN-07 | IndexedDB e arquivo da Cápsula permanecem locais e sem criptografia/TTL de aplicação | Exposição no dispositivo/arquivo | Somente dados sintéticos nesta RC; perfil dedicado e limpeza controlada | __________ |
| KN-08 | Frontend e servidor fazem a mesma validação estrutural mínima de OOXML/ODT, mas ela não é antivírus, sandbox, análise de macros/DDE/links externos, validação completa de CRC nem dissecação profunda de conteúdo ativo | Um documento estruturalmente válido ainda pode ser malicioso | Somente dados sintéticos; no produto online, AV/CDR, quarentena e política institucional | __________ |
| KN-09 | A vigência bloqueia novos eventos, atividades e coordenação, mas não é um bloqueio global de toda mutação local | Campos, anexos, checklist ou read-back podem mudar sem autoria/auditoria completa | RC exclusivamente sintética; projetar autorização e trilha por comando antes da versão online | __________ |
| KN-__ | __________________ | __________________ | __________________ | __________ |

## 11. Aprovação da publicação

| Área | Nome | Decisão | Data |
|---|---|---|---|
| Produto | __________ | ☐ Aprova ☐ Reprova | ___/___/_____ |
| Engenharia | __________ | ☐ Aprova ☐ Reprova | ___/___/_____ |
| Responsável clínico | __________ | ☐ Aprova ☐ Reprova | ___/___/_____ |
| Segurança/privacidade | __________ | ☐ Aprova ☐ Reprova | ___/___/_____ |

## 12. Documentos relacionados

- [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md)
- [PRD_V5.md](PRD_V5.md)
- [ARCHITECTURE_ONLINE.md](ARCHITECTURE_ONLINE.md)
- [PILOT_PROTOCOL.md](PILOT_PROTOCOL.md)
- [REPOSITORY_MAP.md](REPOSITORY_MAP.md)
