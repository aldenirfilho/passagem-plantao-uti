# Passagem UTI - Governança de Dados e Sincronização

**Status:** política-alvo para arquitetura online futura  
**Baseline local:** não possui sincronização entre dispositivos

## 1. Regra fundamental

Sincronizar não significa copiar tudo para todos os serviços. Cada objeto tem uma fonte canônica, classificação, finalidade, destino permitido, retenção e responsável.

## 2. Zonas de dados

| Zona | Conteúdo | Exemplos | Destinos permitidos |
|---|---|---|---|
| Z0 Público | Sem segredo ou dado pessoal | README, tutorial, branding | GitHub público/interno aprovado |
| Z1 Interno | Estratégia sem PHI | PRD, roadmap, decisões | GitHub privado, Notion corporativo aprovado |
| Z2 Identidade/operacional | Usuários e metadados minimizados | papel, tenant, timestamps | Backend autenticado e sistemas contratados |
| Z3 Clínico restrito | Dados de saúde/identificadores | cápsula, evento, tarefa, anexo | Banco/object storage clínico aprovado |
| Z4 Segredos | Chaves e tokens | API key, credencial DB, KMS | Secret manager exclusivamente |

## 3. Proibições absolutas

Nunca sincronizar Z3 ou Z4 com:

- GitHub, issues, PRs, Actions artifacts, snippets ou releases.
- Notion ou wiki genérica.
- Google Drive pessoal/compartilhado não contratado para finalidade clínica.
- iCloud Drive, Notes, Fotos ou backup pessoal.
- E-mail, WhatsApp, analytics ou suporte não aprovado.

Notion, Drive/iCloud e GitHub não são “backup clínico”. Remover depois não elimina histórico, cópias ou exposição.

## 4. Fontes canônicas futuras

| Objeto | Fonte canônica | Réplicas permitidas |
|---|---|---|
| Organização/unidade/membros | Identity/Admin service | Cache curto e auditado |
| Cápsula viva | Capsule service/database | Read model por tenant |
| Anexo clínico | Object storage clínico | Thumbnail protegido |
| Segredo | Secret manager | Memória efêmera do workload |
| Auditoria | Audit store append-only | SIEM minimizado |
| Métrica agregada | Metrics service | Dashboard autorizado |
| Documentação | Repositório Git | Notion interno sem PHI, se aprovado |

## 5. Cápsula viva

### Identidade

- `capsule_id`: identidade longitudinal.
- `version_id`: snapshot imutável publicado.
- `tenant_id`, `workspace_id`, `unit_id` e contexto de leito.
- Identificador do paciente minimizado conforme instituição.

### Conteúdo

- Dez tópicos.
- Timeline.
- Pendências.
- Anexos referenciados.
- Sinalizações da IA.
- Read-back.
- Proveniência e autores.

### Ciclo de vida

```text
draft -> reviewed -> published -> received
                    |              |
                    +-> superseded <- alteração material
                                   |
                                   +-> archived/deleted conforme política
```

Regras:

- Versão publicada não é editada; nova versão substitui.
- Read-back aponta para versão exata.
- Alteração material invalida recibo.
- Encerramento não apaga auditoria automaticamente.
- Transferência de modo/workspace exige fluxo autorizado.

## 6. Modos e sincronização

### UTI oficial

- Fonte canônica institucional.
- Membros provisionados e escopo de unidade.
- Retenção aprovada pelo controlador.
- Sincronização entre dispositivos somente após autenticação.
- Integrações por API contratada, nunca por pasta compartilhada.

### Plantão ad hoc

- Workspace isolado com TTL.
- Convite autenticado e expiração.
- Sem descoberta pública.
- Encerramento exige escolher descarte ou migração autorizada.
- Migração para UTI oficial cria evento de auditoria e reconcilia identidades.

## 7. Protocolo de sincronização futuro

1. Cliente autentica e recebe escopo.
2. Busca delta por cursor/version token.
3. Envia comandos com idempotency key e versão esperada.
4. Backend autoriza e valida tenant/contexto.
5. Evento é persistido e auditoria é gravada.
6. Read models são atualizados.
7. Cliente recebe delta confirmado.
8. Conflito material bloqueia merge e pede decisão humana.

Regras técnicas:

- Sem last-write-wins em texto clínico, tarefas ou read-back.
- Relógio do servidor é a referência.
- Offline não autoriza publicação silenciosa.
- Eventos são ordenados por sequência do workspace, não apenas timestamp do cliente.
- Deleções usam tombstone até completar retenção e propagação.

## 8. Classificação automática e DLP

- Upload recebe classificação Z3 por padrão.
- Texto em campo clínico é Z3 mesmo sem nome.
- Secret scanner bloqueia Z4 em commit/log.
- DLP alerta exportação/egress incomum.
- Classificação pode ser elevada automaticamente, nunca reduzida sem revisão.

## 9. Indicadores de oportunidade e equidade

Fonte: eventos minimizados e agregados, nunca acesso irrestrito ao texto clínico.

Requisitos:

- Dicionário de métrica versionado.
- População/denominador explícitos.
- Mínimo de grupo antes de exibir corte.
- Revisão de viés e risco de reidentificação.
- Sem nomes, ranking ou score individual.
- Uso permitido: suporte, treinamento, infraestrutura e melhoria de fluxo.
- Uso proibido: punição, remuneração automática, escala ou desligamento.

## 10. Exportação

- Negada por padrão para Z3.
- Permissão explícita e step-up auth.
- Escopo mínimo e formato definido pelo controlador.
- Auditoria de usuário, finalidade, volume e destino.
- Expiração/watermark quando aplicável.
- Exportação não deve criar sincronização informal com Drive/iCloud.

## 11. Retenção

Matriz deve ser preenchida antes do piloto:

| Tipo | Owner | Prazo | Base/finalidade | Descarte | Evidência |
|---|---|---|---|---|---|
| Cápsula | Controlador | A definir | Continuidade | Delete/archive | Job + audit |
| Ad hoc | Criador/controlador | Curto por padrão | Plantão temporário | Auto-delete | Receipt |
| Anexo | Controlador | A definir | Suporte à passagem | Delete object/version | Receipt |
| Audit | Segurança/controlador | A definir | Accountability | Expiração controlada | Report |
| Backup | SRE | A definir | Recuperação | Rotation/erase | Restore log |

## 12. Qualidade e reconciliação

- IDs únicos e constraints.
- Duplicidade de paciente/leito gera bloqueio de revisão.
- Jobs de integridade para referência de anexos e versões.
- Relatórios de conflito sem conteúdo clínico em canais comuns.
- Correção cria evento, não reescreve histórico.

## 13. Acesso de suporte

- Sem acesso clínico padrão.
- Preferir diagnóstico com metadados e reprodução sintética.
- JIT temporário somente com autorização e justificativa.
- Sessão gravada/auditada conforme política.
- Não copiar payload para ticket, GitHub, Notion ou mensageria.

## 14. Governança

Conselho mínimo:

- Produto.
- Segurança clínica.
- Segurança da informação.
- Privacidade/encarregado.
- Instituição/controlador.
- Representante de usuários.

Decisões obrigatórias:

- Nova finalidade.
- Novo subprocessador/país.
- Integração clínica.
- Mudança de retenção.
- Novo indicador/corte.
- Uso de dados para pesquisa/modelo.

## 15. Evidências de conformidade

- Catálogo de dados.
- RoPA.
- RIPD.
- Matriz RBAC.
- Registro de consentimento quando aplicável.
- Logs de acesso/exportação.
- Relatórios de deleção/restore.
- Revisão periódica de subprocessadores.
- Ata de aprovação de métricas.

## 16. Manifesto

O arquivo [SYNC_MANIFEST.yaml](./SYNC_MANIFEST.yaml) é a representação legível por máquina desta política. Ele não contém endpoints, chaves ou dados clínicos e não habilita sincronização sozinho.

