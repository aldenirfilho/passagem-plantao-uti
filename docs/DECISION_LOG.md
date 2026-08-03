# Passagem UTI — Registro de Decisões

> **RASCUNHO — NÃO É PARECER JURÍDICO.** Este registro organiza decisões de produto e governança. Aprovações jurídicas, clínicas, de privacidade e segurança precisam ser emitidas pelas funções competentes.

## 1. Como usar

1. Crie um ID sequencial `DEC-###`.
2. Registre contexto, opções, decisão, consequência, dono e evidência.
3. Não inclua dado clínico, credencial, segredo ou captura sensível.
4. Vincule somente artefatos não clínicos ou referências de sistemas homologados.
5. Quando a premissa mudar, não apague: marque como substituída e abra nova decisão.

**Dono do registro:** ________________________________  
**Versão:** ________________________________  
**Última revisão:** ____/____/________  
**Cadência:** ________________________________

## 2. Estados

| Estado | Significado |
|---|---|
| Proposta | Aguardando análise ou aprovação |
| Aceita | Aprovada pelos responsáveis indicados |
| Aceita com condicionantes | Válida apenas se condições forem atendidas |
| Em teste | Avaliada em piloto sintético |
| Rejeitada | Não será seguida; motivo preservado |
| Substituída | Nova decisão ocupa seu lugar |
| Suspensa | Interrompida por risco ou mudança de contexto |

## 3. Fronteira de produto

| Estado | Definição oficial deste registro |
|---|---|
| **ATUAL — LOCAL** | Aplicação local comprovada no repositório: 10 leitos, geração dos dez tópicos, persistência IndexedDB, arquivos/checklist/timeline/Radar/read-back/comandos/temas/notificações locais e chave protegida por servidor local. |
| **FUTURO — ONLINE V5** | Arquitetura proposta com identidade, multi-tenancy, RBAC, sincronização, auditoria e nuvem. Somente passa a “implementado” quando código, teste e gate comprovarem. |

## 4. Decisões iniciais

Estas entradas são propostas sem assinatura. Preencher aprovações antes de tratá-las como política definitiva.

| ID | Data | Decisão | Estado | Dono | Evidência/gate |
|---|---|---|---|---|---|
| DEC-001 | ____/____/______ | Manter a baseline local como referência funcional; não chamar documentação online de produto entregue. | Proposta | __________ | README + [RELEASE_NOTES_V5.md](RELEASE_NOTES_V5.md) |
| DEC-002 | ____/____/______ | Tratar identidade, multi-tenancy, RBAC, sync, auditoria e nuvem como escopo futuro sujeito a implementação e gates. | Proposta | __________ | [ARCHITECTURE_ONLINE.md](ARCHITECTURE_ONLINE.md) |
| DEC-003 | ____/____/______ | Proibir conteúdo clínico e segredos em GitHub, Notion, Google Drive e iCloud. | Proposta | __________ | [DATA_GOVERNANCE_SYNC.md](DATA_GOVERNANCE_SYNC.md) |
| DEC-004 | ____/____/______ | Suportar dois modos futuros: UTI oficial e plantão ad hoc, com controles e retenções próprios. | Proposta | __________ | [PRD_V5.md](PRD_V5.md) |
| DEC-005 | ____/____/______ | Adotar papéis clínicos coordenador, diarista e plantonista; privilégios técnicos separados e mínimos. | Proposta | __________ | PRD + matriz RBAC futura |
| DEC-006 | ____/____/______ | Tratar a cápsula como objeto vivo, versionado; mudança material invalida read-back. | Proposta | __________ | [CAPSULA_UTI_SPEC.md](CAPSULA_UTI_SPEC.md) |
| DEC-007 | ____/____/______ | Usar métricas agregadas e não punitivas, sem ranking individual ou decisão trabalhista automatizada. | Proposta | __________ | [METRICS_DICTIONARY.md](METRICS_DICTIONARY.md) |
| DEC-008 | ____/____/______ | Iniciar validação somente com dados sintéticos; dados reais exigem gate separado. | Proposta | __________ | [PILOT_PROTOCOL.md](PILOT_PROTOCOL.md) |
| DEC-009 | ____/____/______ | Manter segredos apenas no servidor/secret manager; nunca no cliente ou repositório. | Proposta | __________ | [SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md) |
| DEC-010 | ____/____/______ | IA apenas auxilia; revisão humana e fallback manual são obrigatórios. | Proposta | __________ | [CLINICAL_SAFETY_CASE.md](CLINICAL_SAFETY_CASE.md) |
| DEC-011 | ____/____/______ | Notificações não são canal de emergência e não exibem conteúdo clínico em tela bloqueada por padrão. | Proposta | __________ | Testes sintéticos + política |
| DEC-012 | ____/____/______ | Não liberar dados reais sem gates jurídico, DPO, segurança, clínico e operacional assinados. | Proposta | __________ | [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) |

## 5. Modelo de decisão detalhada

Copie a seção abaixo para cada decisão material.

### DEC-___ — [TÍTULO CURTO]

| Campo | Preenchimento |
|---|---|
| Estado | ☐ Proposta ☐ Aceita ☐ Condicionada ☐ Em teste ☐ Rejeitada ☐ Substituída ☐ Suspensa |
| Data | ____/____/________ |
| Proponente | ________________________________ |
| Decisor responsável | ________________________________ |
| Escopo | ☐ Atual local ☐ Futuro online ☐ Ambos |
| Ambiente | ☐ Sintético ☐ Homologação ☐ Produção |
| Revisão prevista | ____/____/________ |
| Substitui/é substituída por | ________________________________ |

**Contexto e problema**  
____________________________________________________________________

**Restrições e premissas**  
____________________________________________________________________

**Opções consideradas**

| Opção | Benefícios | Riscos/custos | Motivo de aceitar/rejeitar |
|---|---|---|---|
| A — __________ | __________ | __________ | __________ |
| B — __________ | __________ | __________ | __________ |
| C — __________ | __________ | __________ | __________ |

**Decisão**  
____________________________________________________________________

**Condicionantes**  
____________________________________________________________________

**Consequências positivas**  
____________________________________________________________________

**Trade-offs e riscos residuais**  
____________________________________________________________________

**Plano de reversão/contingência**  
____________________________________________________________________

**Evidência necessária para manter a decisão**  
____________________________________________________________________

**Métrica não punitiva de acompanhamento**  
____________________________________________________________________

**Observação sobre privacidade e segurança**  
Não anexar conteúdo clínico ou segredo. Se a evidência existir em ambiente homologado, registrar apenas ID/referência autorizada: __________________.

### Aprovação

| Função | Nome | Parecer/decisão | Data |
|---|---|---|---|
| Responsável clínico | __________ | __________ | ___/___/_____ |
| Produto/tecnologia | __________ | __________ | ___/___/_____ |
| Segurança | __________ | __________ | ___/___/_____ |
| Privacidade/DPO | __________ | __________ | ___/___/_____ |
| Jurídico, quando aplicável | __________ | __________ | ___/___/_____ |

## 6. Regras de evidência e armazenamento

- GitHub guarda código, decisões, documentação não clínica e fixtures sintéticas.
- Notion, Google Drive e iCloud não são repositórios clínicos do projeto.
- É proibido inserir nesses serviços prontuário, passagem real, nome de paciente, exame, imagem clínica, exportação de produção, log sensível ou segredo.
- Atas podem registrar decisões e responsáveis, mas não conteúdo assistencial.
- Segredos ficam em gerenciador homologado; a evidência registra apenas o nome lógico e o status da rotação.
- Métricas compartilhadas devem ser agregadas, não punitivas e respeitar tamanho mínimo de grupo.

## 7. Revisão periódica

Perguntas da revisão:

- A decisão continua coerente com o código implementado?
- Alguma função futura foi equivocadamente descrita como disponível?
- Surgiu risco clínico, jurídico, de privacidade ou segurança?
- O piloto continua 100% sintético?
- A métrica associada virou ranking ou incentivo perverso?
- Há evidência suficiente para manter, alterar ou suspender?

**Próxima reunião:** ____/____/________  
**Responsável pela pauta:** ________________________________

