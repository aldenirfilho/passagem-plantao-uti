# Passagem UTI - Roadmap

**Horizonte:** da versão local ao produto online governado  
**Regra:** datas são definidas somente após capacidade e dependências; gates têm prioridade sobre prazo

## Estado 0 - Baseline local concluído

**Status:** ATUAL - LOCAL

- Cockpit de 10 leitos.
- Dez tópicos, anexos, checklist e linha do tempo.
- Radar, read-back, comandos rápidos e Turbo.
- Temas, notificações locais e tutorial.
- Servidor local e chave fora do frontend.

Saída: ferramenta local utilizável com revisão médica, sem colaboração online.

## Fase 1 - Fundação de produto e governança

**Status:** documentação/projeto

- Product brief e PRD aprovados.
- Safety case inicial e hazard log.
- Threat model e arquitetura-alvo.
- Data map, RIPD preliminar e papéis LGPD.
- Modelo comercial e critérios de piloto.
- Design da cápsula viva e dos dois modos.

Gate F1:

- Escopo online e não objetivos aprovados.
- Controlador/operador provisórios definidos para piloto.
- Sem ambiguidade entre baseline local e produto futuro.

## Fase 2 - Plataforma online não clínica

- Tenant, organização, unidade e memberships.
- OIDC/MFA e RBAC.
- Secret manager, KMS e auditoria.
- Cápsula sintética versionada.
- Storage com arquivos sintéticos e quarentena.
- Observabilidade sem PHI.
- CI/CD, SAST, dependency/secret scanning.

Gate F2:

- Testes de isolamento multi-tenant.
- Threat model atualizado.
- Backup/restore e rollback testados.
- Nenhum dado clínico real no ambiente de desenvolvimento.

## Fase 3 - MVP clínico controlado

- UTI oficial.
- Plantão ad hoc com expiração.
- Coordenador, diarista e plantonista.
- Cápsula viva, versionamento e conflitos.
- Read-back auditável.
- Gateway de IA com minimização e validação.
- Notificações internas e modo manual.

Gate F3:

- RIPD e contratos aprovados.
- Safety case verificado com simulação.
- Pentest e correção de achados.
- Runbooks e treinamento concluídos.

## Fase 4 - Piloto institucional

- Uma UTI, período e usuários limitados.
- Feature flags e suporte em horário definido.
- Critérios de parada clínica, técnica e de privacidade.
- Monitoramento de adoção, carga cognitiva e falhas.
- Revisões semanais com governança do piloto.

Critérios de parada imediata:

- Mistura de tenant/paciente/leito.
- Acesso não autorizado ou vazamento.
- Saída obsoleta apresentada como vigente.
- Dependência que impeça modo manual seguro.
- Uso punitivo de indicador.

Gate F4:

- Nenhum evento sentinela não mitigado.
- Evidência de benefício operacional, sem alegar benefício clínico não estudado.
- Suporte, segurança e custos sustentáveis.

## Fase 5 - Produto B2B/B2C limitado

- Planos e billing transparentes.
- SSO e provisionamento institucional.
- Gestão de subprocessadores.
- Portabilidade e saída contratual.
- Indicadores agregados de oportunidade/equidade.
- Painel de auditoria do cliente.

Gate F5:

- Checklist de go-live integral.
- SLA e capacidade aprovados.
- Processo de direitos e incidentes testado.

## Fase 6 - Integrações e escala

- Integrações de prontuário somente após contrato e validação.
- Interoperabilidade padronizada.
- Multi-região conforme análise jurídica.
- Isolamento dedicado para clientes elegíveis.
- Estudos formais de efetividade e segurança.

## Backlog deliberadamente posterior

- Aplicativo móvel nativo.
- Ditado clínico online.
- Integração com monitores.
- Recomendações preditivas.
- Benchmark de desfechos.

Esses itens não entram sem novo safety case, threat model e avaliação regulatória.

## Trilhas transversais

| Trilha | Entregas contínuas |
|---|---|
| Segurança clínica | Hazard log, testes, incidentes, treinamento |
| Segurança | Threat model, pentest, SDLC, resposta |
| Privacidade | RoPA, RIPD, retenção, direitos, fornecedores |
| Produto | Pesquisa, acessibilidade, métricas e suporte |
| Negócio | Pilotos, unit economics, contratos e ética |

## Próxima decisão

Autorizar somente a Fase 1 e o protótipo sintético da Fase 2. Uso online com dados clínicos permanece bloqueado até os gates F2 e F3.

