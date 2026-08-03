# Passagem UTI - Product Brief

**Documento:** visão executiva do produto  
**Versão:** 1.0  
**Escopo:** baseline local atual + direção online futura  
**Regra de leitura:** nada marcado como **FUTURO - ONLINE** está implementado ou autorizado para uso clínico institucional.

## 1. Resumo

Passagem UTI é um cockpit de continuidade assistencial criado para reduzir perda de contexto, pendências invisíveis e variabilidade na passagem de plantão médico. O produto organiza cada leito em uma cápsula de trabalho com dez tópicos fixos, anexos, checklist, linha do tempo e confirmação de recebimento.

O produto não é prontuário, prescrição, monitor de sinais vitais, sistema de alarme ou mecanismo autônomo de decisão clínica.

## 2. Estado do produto

### ATUAL - LOCAL

- Aplicativo local-first executado em `127.0.0.1`.
- Dez leitos fixos, L1 a L10.
- Cabeçalho do plantão, três áreas por leito e salvamento no navegador.
- Renderização assistida por GPT em dez tópicos estruturados.
- Cofre local de anexos, checklist, linha do tempo, Radar e read-back.
- Ações rápidas, Modo Turbo, temas e notificações locais.
- Chave da API mantida fora do JavaScript do navegador.
- Sem autenticação institucional, multi-tenancy, sincronização em nuvem ou prontuário integrado.

### FUTURO - ONLINE

- Backend autenticado e multi-tenant por organização.
- UTI oficial e plantão ad hoc.
- Papéis coordenador, diarista e plantonista com RBAC.
- Cápsula viva por paciente/leito, versionada, auditável e transferível.
- Sincronização segura entre turnos e dispositivos autorizados.
- Auditoria, observabilidade, gestão de incidentes e governança LGPD.
- Indicadores de oportunidade e equidade agregados, sem ranking punitivo.

## 3. Problema

Passagens de plantão podem falhar por excesso de texto, atualização tardia, mistura entre fato e plano, ausência de dono para pendências, troca de leito/paciente e falta de confirmação do receptor. Em UTIs com múltiplos turnos, a informação se fragmenta entre memória, mensagens, papéis, prontuário e arquivos.

## 4. Proposta de valor

> Transformar informação clínica dispersa em uma cápsula de continuidade curta, rastreável e revisável, deixando explícito o que aconteceu, o que falta e quem recebeu.

Benefícios pretendidos:

- Menor tempo para preparar e receber o plantão.
- Maior visibilidade de lacunas e pendências.
- Continuidade cronológica entre plantonista e diarista.
- Melhor rastreabilidade do aceite e das mudanças posteriores.
- Gestão operacional dos leitos sem converter dados em avaliação punitiva de profissionais.

## 5. Modos de uso futuros

### UTI oficial

Workspace institucional persistente, criado e governado pela organização. Possui escala, leitos, membros, política de retenção, auditoria e integrações aprovadas. O hospital define finalidade, papéis de tratamento, base legal e controles.

### Plantão ad hoc

Workspace temporário, criado para uma cobertura, equipe móvel ou cenário sem unidade cadastrada. Deve ter convite explícito, expiração curta, limites de compartilhamento e encerramento verificável. Não é atalho para contornar governança institucional.

## 6. Usuários e papéis

| Papel | Necessidade principal | Autoridade futura resumida |
|---|---|---|
| Coordenador | Organizar unidade, escala, padrões e qualidade | Configura UTI, membros, políticas e indicadores agregados |
| Diarista | Manter plano longitudinal e conciliar mudanças | Revisa cápsulas, atualiza plano e valida continuidade diurna |
| Plantonista | Preparar, executar e transferir o turno | Registra eventos, pendências, passagem e read-back |

Princípios de RBAC:

- Menor privilégio.
- Acesso limitado à organização e unidade autorizadas.
- Ações sensíveis auditadas.
- Nenhum papel recebe acesso global por conveniência.
- Suporte técnico não acessa conteúdo clínico por padrão.

## 7. Cápsula viva

A cápsula viva é a unidade de continuidade do produto futuro. Ela reúne:

- Identidade contextual do paciente/leito, com identificadores minimizados.
- Dez tópicos de passagem e revisões.
- Linha do tempo de eventos.
- Anexos autorizados e metadados.
- Pendências, responsáveis, prazo/gatilho e estado.
- Alertas e lacunas rotulados como sinalização da IA.
- Read-back e histórico de invalidação.
- Versão, autores, timestamps e trilha de auditoria.

Ela não substitui o registro oficial no prontuário e não pode se tornar um repositório paralelo sem política institucional.

## 8. Princípios de produto

1. **Conduta humana no comando:** IA organiza; o médico revisa e decide.
2. **Contexto antes de velocidade:** nenhuma otimização justifica misturar pacientes ou turnos.
3. **Pendência tem dono:** ação, prazo/gatilho, responsável e resultado esperado.
4. **Local é baseline; online exige controles adicionais:** autenticação, isolamento, auditoria e LGPD.
5. **Dados clínicos não são moeda:** não vender, licenciar ou usar para publicidade.
6. **Equidade sem punição:** indicadores servem para remover barreiras, não ranquear profissionais.
7. **Falha segura:** dúvida, conflito ou atraso devem interromper automação e pedir revisão.

## 9. Indicadores de sucesso

Indicadores de produto e segurança, preferencialmente agregados:

- Tempo mediano de preparação e recebimento.
- Percentual de cápsulas com dez tópicos revisados.
- Pendências aceitas com responsável e gatilho.
- Read-back concluído antes da troca de responsabilidade.
- Alterações pós-read-back que provocaram nova revisão.
- Falhas de renderização, conflitos e respostas descartadas.
- Oportunidades de suporte por turno, unidade e faixa horária.
- Diferenças de acesso e conclusão entre contextos, sem ranking nominal.

Indicadores não devem ser apresentados como desfecho clínico, qualidade individual ou produtividade médica sem validação específica.

## 10. Fora de escopo

- Diagnóstico ou prescrição autônoma.
- Controle de ventilador, bomba, monitor ou dispositivo.
- Alarme clínico em tempo real.
- Substituição do prontuário eletrônico.
- Ranking de médicos, metas coercitivas ou punição baseada em uso.
- Sincronização de conteúdo clínico com GitHub, Notion, Google Drive ou iCloud.

## 11. Guardrail absoluto de dados

É proibido armazenar chaves, tokens, prontuários, anexos clínicos, exportações de plantão, identificadores de pacientes ou logs clínicos em GitHub, Notion, Google Drive ou iCloud. Esses destinos podem receber somente documentação pública/interna sem dados clínicos e métricas agregadas aprovadas.

## 12. Decisão de investimento

A evolução online só deve avançar após aprovação conjunta de produto, segurança clínica, segurança da informação, jurídico/LGPD e instituição piloto. O checklist vinculante está em [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md).

## Documentos relacionados

- [PRD V5](./PRD_V5.md)
- [Arquitetura online](./ARCHITECTURE_ONLINE.md)
- [Segurança clínica](./CLINICAL_SAFETY_CASE.md)
- [LGPD e privacidade](./LGPD_PRIVACY.md)
- [Governança e sincronização](./DATA_GOVERNANCE_SYNC.md)

