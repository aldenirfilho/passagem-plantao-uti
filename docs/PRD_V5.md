# Passagem UTI - PRD V5

**Status:** proposta para descoberta e implementação  
**Baseline comprovado:** aplicação local descrita no README do repositório  
**Destino:** produto online multi-tenant, sujeito a gates clínicos, legais e de segurança

## 1. Objetivo

Entregar uma plataforma de continuidade assistencial que permita a equipes autorizadas criar, atualizar e transferir cápsulas vivas de plantão em dois modos: UTI oficial e plantão ad hoc.

## 2. Separação obrigatória de escopo

| Dimensão | ATUAL - LOCAL | FUTURO - ONLINE V5 |
|---|---|---|
| Identidade | Campos locais sem login | Identidade verificada, MFA e sessão segura |
| Tenancy | Um navegador | Organização > unidade > workspace |
| Persistência | IndexedDB local | Banco e objetos criptografados por tenant |
| Compartilhamento | Cópia/exportação manual | Convites, RBAC, auditoria e expiração |
| IA | Servidor local com uma chave | Gateway de IA no backend e segredos gerenciados |
| Auditoria | Timestamps no estado local | Trilha imutável e consultável |
| Sincronização | Inexistente | Eventos versionados e conflito explícito |
| Integrações | Nenhuma institucional | Somente integrações contratadas e aprovadas |

## 3. Personas

### Coordenador

- Cria/configura UTI oficial.
- Define leitos, membros, políticas e escalas.
- Visualiza indicadores agregados de oportunidade/equidade.
- Não altera conteúdo clínico sem vínculo assistencial e justificativa.

### Diarista

- Revisa cápsula longitudinalmente.
- Concilia plano, evolução e pendências entre turnos.
- Aceita ou rejeita sugestões da IA.
- Sinaliza plano desatualizado e solicita nova revisão.

### Plantonista

- Prepara e atualiza cápsulas durante o turno.
- Registra eventos, arquivos autorizados e pendências.
- Entrega e recebe com read-back.
- Encerra ou transfere plantão ad hoc.

## 4. Jornadas prioritárias

### J1 - Iniciar UTI oficial

1. Coordenador cria organização/unidade ou recebe provisionamento.
2. Configura leitos, política de retenção e membros.
3. Convida diaristas e plantonistas com escopo mínimo.
4. Sistema registra aceite de termos e trilha de auditoria.
5. Unidade só fica ativa após gates administrativos.

### J2 - Iniciar plantão ad hoc

1. Plantonista cria workspace temporário.
2. Define finalidade, duração, participantes e expiração.
3. Receptor entra por convite autenticado e limitado.
4. Ao final, proprietário encerra; retenção e descarte seguem política explícita.

### J3 - Criar/atualizar cápsula viva

1. Usuário seleciona unidade e leito.
2. Confirma contexto/paciente antes de cada importação.
3. Adiciona texto, evento ou arquivo autorizado.
4. Renderiza dez tópicos; a versão de origem é congelada.
5. Revisa, edita e aceita somente pendências aplicáveis.
6. Publica uma nova versão da cápsula com autoria e timestamp.

### J4 - Transferir responsabilidade

1. Emissor confirma dez tópicos, riscos e pendências.
2. Receptor revisa e executa read-back.
3. Sistema registra versão recebida.
4. Alteração posterior invalida o aceite e gera notificação.

## 5. Requisitos funcionais

### Identidade e acesso

- **FR-001:** autenticação OIDC/OAuth2 com MFA para contas clínicas.
- **FR-002:** sessão com timeout, revogação e detecção de risco.
- **FR-003:** RBAC por tenant, unidade e workspace.
- **FR-004:** suporte a coordenador, diarista e plantonista.
- **FR-005:** break-glass apenas se aprovado, justificado, temporário e auditado.

### Multi-tenancy

- **FR-010:** toda entidade clínica possui `tenant_id` e `unit_id` quando aplicável.
- **FR-011:** consultas devem impor escopo no backend; filtros de interface não são segurança.
- **FR-012:** testes automatizados devem provar ausência de acesso entre tenants.

### Modos

- **FR-020:** UTI oficial com leitos configuráveis, escala e membros persistentes.
- **FR-021:** plantão ad hoc com expiração e compartilhamento limitado.
- **FR-022:** migração ad hoc > oficial somente por fluxo autorizado e auditado.

### Cápsula viva

- **FR-030:** cápsula versionada com dez tópicos, eventos, anexos, pendências e read-back.
- **FR-031:** versões publicadas são imutáveis; correções criam nova versão.
- **FR-032:** atualização concorrente deve gerar conflito explícito, nunca sobrescrita silenciosa.
- **FR-033:** cada item exibe autor, origem, data/hora e estado de revisão.
- **FR-034:** mudança material invalida read-back anterior.
- **FR-035:** transferência de leito exige reconciliação de identidade.

### IA

- **FR-040:** gateway server-side usa secret manager; chave nunca chega ao cliente.
- **FR-041:** entrada enviada deve ser minimizada e autorizada.
- **FR-042:** saída deve obedecer schema estrito e estar ligada ao `capsule_version_id`.
- **FR-043:** sinalizações da IA são rotuladas e não mudam estado clínico automaticamente.
- **FR-044:** o produto deve descartar respostas de versão, paciente ou leito divergentes.
- **FR-045:** falha da IA mantém edição manual disponível.

### Operação

- **FR-050:** Radar mostra fatos registrados e não se apresenta como monitor clínico.
- **FR-051:** notificações cobrem eventos operacionais e técnicos; não são alarmes fisiológicos.
- **FR-052:** pendência possui texto, prioridade, prazo/gatilho, responsável e estado.
- **FR-053:** Modo Turbo confirma custo/escopo, limita concorrência e permite cancelamento.

### Auditoria

- **FR-060:** registrar login, acesso, criação, leitura sensível, exportação, alteração, convite, read-back e ações administrativas.
- **FR-061:** logs não devem conter texto clínico integral, anexos, tokens ou prompts completos.
- **FR-062:** auditoria deve ser pesquisável por tenant e período, com acesso segregado.

### Indicadores

- **FR-070:** indicadores são agregados e orientados a barreiras/oportunidades.
- **FR-071:** não haverá leaderboard, ranking nominal ou score individual punitivo.
- **FR-072:** cortes por grupo exigem tamanho mínimo e revisão de risco de reidentificação.
- **FR-073:** usuários devem conhecer definição, limitação e finalidade de cada métrica.

## 6. Requisitos não funcionais

- **NFR-001 Segurança:** criptografia em trânsito e repouso; secret manager; SDLC seguro.
- **NFR-002 Disponibilidade:** meta inicial definida por piloto, com degradação para modo manual.
- **NFR-003 Performance:** p95 de operações não-IA definido e monitorado antes do piloto.
- **NFR-004 Resiliência:** idempotência, retries limitados e circuit breaker em integrações.
- **NFR-005 Acessibilidade:** teclado, contraste, leitores de tela e responsividade.
- **NFR-006 Observabilidade:** métricas técnicas e eventos de segurança sem PHI em telemetria comum.
- **NFR-007 Portabilidade:** exportações aprovadas, legíveis e controladas pelo tenant.
- **NFR-008 Exclusão:** workflows verificáveis de retenção, bloqueio e descarte.

## 7. Modelo conceitual

- `Organization/Tenant`
- `Unit`
- `Workspace` (`official_icu` ou `ad_hoc`)
- `Membership` + `RoleAssignment`
- `Shift`
- `Bed`
- `Capsule`
- `CapsuleVersion`
- `TimelineEvent`
- `Task`
- `Attachment`
- `ReadbackReceipt`
- `Notification`
- `AuditEvent`
- `MetricAggregate`

## 8. Critérios de aceitação críticos

1. Usuário de tenant A não acessa qualquer objeto do tenant B por interface, API, URL ou exportação.
2. Nenhuma chave aparece em bundle, resposta, log, repositório ou ferramenta analítica.
3. Mudança material cria nova versão e invalida read-back anterior.
4. Resposta da IA para versão/leito divergente é descartada.
5. Modo manual permanece utilizável quando IA está indisponível.
6. Exportação é autorizada, registrada e limitada ao escopo do usuário.
7. Ad hoc expira conforme política e exige decisão explícita de retenção/descarte.
8. Indicadores não expõem nomes nem suportam ranking punitivo.

## 9. Telemetria permitida

Permitida, se minimizada e aprovada:

- Latência, status code, versão do cliente, feature flag e contagem agregada.
- Contagem de conflitos, descartes, falhas e conclusão de fluxos.
- Métricas de uso agregadas com limiar de privacidade.

Proibida em telemetria comum:

- Nome, prontuário, leito associado a identidade, texto clínico, anexo, prompt, resposta integral, chave, token ou cookie.

## 10. Dependências

- Controlador e operador formalmente definidos.
- RIPD/DPIA e registro das operações.
- Contratos com subprocessadores e avaliação de transferência internacional.
- IdP, secret manager, KMS, banco, object storage e SIEM aprovados.
- Piloto com instituição, treinamento e suporte de incidente.

## 11. Critérios de go-live

Go-live online é bloqueado enquanto qualquer item P0 de [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) estiver aberto. Exige, no mínimo:

- Teste de isolamento multi-tenant e pentest sem achado crítico/alto não aceito.
- Safety case aprovado e simulação de troca de paciente/leito.
- RIPD, contratos, aviso de privacidade e fluxo de direitos aprovados.
- Backup/restore e resposta a incidente testados.
- Auditoria, suporte, rollback e modo manual funcionais.
- Piloto limitado com métricas e critérios de parada definidos.

## 12. Não objetivos

- Prontuário completo.
- Prescrição ou diagnóstico autônomo.
- Monitorização e alarmes clínicos em tempo real.
- Pesquisa secundária sem governança própria.
- Uso de dados clínicos para publicidade, venda ou ranking profissional.

