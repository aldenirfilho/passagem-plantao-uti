# Passagem UTI — Dicionário de Métricas

> **RASCUNHO — NÃO É PARECER JURÍDICO.** As métricas propostas precisam de validação clínica, estatística, jurídica, trabalhista, de privacidade e governança antes de qualquer coleta com pessoas ou dados reais.

## 1. Objetivo e princípios

Este dicionário define métricas para avaliar segurança, utilidade, confiabilidade e equidade do Passagem UTI. A medição deve favorecer aprendizado do sistema e melhoria do processo, nunca vigilância simplista do profissional.

Princípios obrigatórios:

- **não punitivo:** nenhuma métrica isolada ou automatizada determina remuneração, escala, promoção, advertência, demissão ou privilégio clínico;
- **sem ranking nominal:** não publicar placar de médicos, equipes ou unidades;
- **contextual:** interpretar carga, gravidade, interrupções, disponibilidade de dados e falhas técnicas;
- **mínimo necessário:** coletar eventos técnicos e agregados sem conteúdo clínico por padrão;
- **transparente:** finalidade, fórmula, limitações, acesso e retenção são conhecidos;
- **auditável:** mudanças de definição recebem versão, dono e aprovação;
- **equidade:** diferenças acionam investigação do sistema e acesso a suporte, não presunção de culpa.

## 2. Fronteira de aplicação

| Estado | Uso permitido das métricas |
|---|---|
| **ATUAL — LOCAL** | Medição manual ou local, com dados sintéticos e sem presumir telemetria central. O app atual não possui pipeline online institucional comprovado. |
| **FUTURO — ONLINE V5** | Telemetria minimizada e agregação podem ser implementadas somente após aprovação, isolamento por tenant, aviso, retenção e controle de acesso. Documentar a métrica não significa que ela já é coletada. |

No piloto inicial, todas as métricas vêm de cenários e identidades **sintéticos** conforme [PILOT_PROTOCOL.md](PILOT_PROTOCOL.md).

## 3. Usos proibidos

É proibido:

- ranquear individualmente profissionais ou expor “melhor/pior” desempenho;
- usar tempos brutos como proxy de competência;
- comparar unidades sem ajustar contexto e maturidade de implantação;
- tomar decisão trabalhista ou assistencial automatizada;
- coletar texto clínico, prompt ou saída completa apenas “para analytics”;
- exportar eventos identificáveis ou dados de saúde para GitHub, Notion, Google Drive ou iCloud;
- armazenar token, senha ou chave de API junto à telemetria.

Somente documentação não clínica, dados sintéticos e agregados aprovados podem entrar nesses destinos. Segredos ficam em gerenciador homologado.

## 4. Metadados deste dicionário

| Campo | Valor |
|---|---|
| Dono do dicionário | ________________________________ |
| Steward clínico | ________________________________ |
| Privacidade/DPO | ________________________________ |
| Versão | ________________________________ |
| Vigência | ____/____/________ |
| Próxima revisão | ____/____/________ |
| Tamanho mínimo de grupo (`k`) | ______ participantes/turnos |
| Janela padrão | ________________________________ |
| Fuso horário | ________________________________ |
| Ambiente | ☐ Sintético ☐ Homologação ☐ Produção |

## 5. Campos obrigatórios de cada métrica

Uma métrica só pode entrar em painel após preencher:

| Campo | Descrição |
|---|---|
| ID/nome | Identificador estável e rótulo humano |
| Pergunta | Decisão ou aprendizagem que a métrica apoia |
| Fórmula | Numerador, denominador, unidade e janela |
| População | Eventos/turnos incluídos |
| Exclusões | Casos que não devem entrar |
| Fonte | Evento técnico, rubrica ou pesquisa |
| Dimensões | Recortes permitidos e proibidos |
| Dono | Responsável por qualidade e interpretação |
| Atualização | Frequência e atraso esperado |
| Meta/limite | Faixa de referência e fundamento |
| Limitações | Vieses, confundidores e não usos |
| Privacidade | Identificadores, retenção, agregação e acesso |
| Estado | Proposta, piloto, aprovada, suspensa ou aposentada |

## 6. Métricas canônicas

### M-01 — Tempo de preparação da passagem

| Campo | Definição |
|---|---|
| Pergunta | O fluxo reduz esforço sem sacrificar revisão? |
| Fórmula | Mediana de `publicação_revisada - início_da_preparação`, em minutos |
| População | Sessões concluídas com contexto válido |
| Exclusões | Abandono, pausa > ____ min, treinamento, falha de relógio |
| Fonte | Eventos minimizados de início/publicação ou observação sintética |
| Recortes permitidos | Modo, build, complexidade sintética, período |
| Recortes proibidos | Ranking nominal de profissional |
| Limitações | Tempo menor não significa melhor cuidado; interrupções distorcem |
| Estado/dono | __________ / __________ |

### M-02 — Completude crítica da passagem

| Campo | Definição |
|---|---|
| Pergunta | Itens críticos esperados aparecem e são compreendidos? |
| Fórmula | `itens críticos corretos e explicitados ÷ itens críticos previstos na rubrica × 100` |
| População | Cenários com rubrica clínica previamente aprovada |
| Exclusões | Item não aplicável ou cenário com gabarito inválido |
| Fonte | Avaliação por dois revisores ou consenso documentado |
| Meta piloto | ≥ ____% e nenhum item sentinela omitido |
| Limitações | Depende da qualidade da rubrica; não medir prontuário real no piloto sintético |
| Estado/dono | __________ / __________ |

### M-03 — Taxa de dado crítico ausente

| Campo | Definição |
|---|---|
| Pergunta | Com que frequência falta um item cuja ausência pode alterar a execução do plano? |
| Fórmula | `passagens com ≥1 item crítico ausente ÷ passagens avaliáveis × 100` |
| População | Passagens avaliadas por rubrica |
| Exclusões | Informação realmente indisponível e marcada como tal, conforme regra: __________ |
| Fonte | Rubrica/debrief, sem texto clínico em analytics |
| Meta piloto | ≤ ____% |
| Limitações | “Ausente” deve ser distinguido de “desconhecido explicitamente” |
| Estado/dono | __________ / __________ |

### M-04 — Pendências críticas aceitas com dono e prazo

| Campo | Definição |
|---|---|
| Pergunta | Pendências prioritárias ficam executáveis? |
| Fórmula | `pendências críticas aceitas com responsável + prazo/condição ÷ pendências críticas aceitas × 100` |
| População | Pendências marcadas críticas no cenário |
| Exclusões | Pendência cancelada antes da entrega; item sem necessidade de prazo conforme rubrica |
| Fonte | Estrutura do checklist/eventos sintéticos |
| Meta piloto | ≥ ____% |
| Limitações | Registro de dono não prova execução clínica |
| Estado/dono | __________ / __________ |

### M-05 — Conclusão válida do read-back

| Campo | Definição |
|---|---|
| Pergunta | O receptor confirma os elementos críticos da versão entregue? |
| Fórmula | `entregas com read-back completo na mesma versão ÷ entregas elegíveis × 100` |
| População | Transferências com emissor e receptor distintos no cenário |
| Exclusões | Sessão cancelada; versão invalidada antes do início do read-back |
| Fonte | Evento de read-back + versão |
| Meta piloto | ≥ ____% |
| Limitações | Clique isolado não prova compreensão; combinar com rubrica amostral |
| Estado/dono | __________ / __________ |

### M-06 — Invalidação e nova revisão após mudança material

| Campo | Definição |
|---|---|
| Pergunta | Mudanças materiais anulam o aceite antigo e geram nova revisão? |
| Fórmula | `mudanças materiais com invalidação + nova revisão solicitada ÷ mudanças materiais testadas × 100` |
| População | Cenários com alteração após read-back |
| Exclusões | Alteração classificada não material por regra versionada |
| Fonte | Eventos de versão/notificação |
| Meta piloto | 100% |
| Limitações | A taxonomia de materialidade precisa ser validada clinicamente |
| Estado/dono | __________ / __________ |

### M-07 — Taxa de descarte/correção da saída de IA

| Campo | Definição |
|---|---|
| Pergunta | Quão frequentemente a saída precisa ser recusada ou corrigida materialmente? |
| Fórmula | `saídas recusadas ou materialmente corrigidas ÷ saídas avaliáveis × 100` |
| População | Gerações concluídas e exibidas para revisão |
| Exclusões | Falha técnica sem saída; cancelamento antes da resposta |
| Fonte | Ação estruturada; não registrar prompt/output clínico completo na telemetria |
| Interpretação | Alta taxa pode indicar modelo/prompt ruim ou casos difíceis; baixa taxa não prova correção |
| Estado/dono | __________ / __________ |

### M-08 — Falha de geração e recuperação manual

| Campo | Definição |
|---|---|
| Pergunta | O fluxo permanece utilizável quando a IA falha? |
| Fórmula A | `gerações com erro/timeout ÷ tentativas válidas × 100` |
| Fórmula B | `falhas seguidas de conclusão manual ÷ falhas elegíveis × 100` |
| Exclusões | Entrada inválida bloqueada antes do envio |
| Fonte | Código de erro técnico e evento de conclusão manual |
| Meta piloto | Recuperação manual = 100% nos cenários planejados |
| Limitações | Conclusão manual não garante qualidade; avaliar rubrica |
| Estado/dono | __________ / __________ |

### M-09 — Conflitos sem sobrescrita silenciosa

| Campo | Definição |
|---|---|
| Pergunta | Edições concorrentes são detectadas e resolvidas explicitamente? |
| Fórmula | `conflitos detectados sem perda silenciosa ÷ conflitos injetados/confirmados × 100` |
| População | Somente módulo online futuro quando implementado |
| Exclusões | Uso local de aba única sem mecanismo de sync, reportado separadamente |
| Fonte | Testes automatizados e eventos de conflito sintéticos |
| Meta | 100% |
| Limitações | Não existe como capacidade online comprovada na baseline local |
| Estado/dono | Proposta / __________ |

### M-10 — Disponibilidade do fallback operacional

| Campo | Definição |
|---|---|
| Pergunta | A equipe consegue continuar sem app, rede ou IA? |
| Fórmula | `simulações concluídas dentro de ____ min ÷ simulações executadas × 100` |
| População | Exercícios de contingência planejados |
| Exclusões | Sessão interrompida por motivo externo documentado |
| Fonte | Checklist/tabletop |
| Meta | 100% antes de dados reais |
| Limitações | Simulação não substitui exercícios recorrentes |
| Estado/dono | __________ / __________ |

### M-11 — Latência de notificação de mudança material

| Campo | Definição |
|---|---|
| Pergunta | O destinatário autorizado recebe sinalização em tempo útil? |
| Fórmula | P50/P95 de `entrega_da_notificação - publicação_da_mudança`, em segundos |
| População | Notificações elegíveis e aceitas pelo provedor/dispositivo |
| Exclusões | Usuário sem canal habilitado, offline planejado; reportar separadamente |
| Fonte | Timestamps técnicos sem conteúdo clínico |
| Meta | P95 ≤ ____ s no ambiente definido |
| Limitações | Entrega técnica não prova leitura; notificação não é canal de emergência |
| Estado/dono | __________ / __________ |

### M-12 — Privacidade da notificação

| Campo | Definição |
|---|---|
| Pergunta | Notificações evitam revelar dado clínico em tela bloqueada? |
| Fórmula | `notificações testadas sem nome/diagnóstico/conduta ÷ notificações testadas × 100` |
| População | Modelos e plataformas suportadas |
| Fonte | Teste visual/snapshot com dados sintéticos |
| Meta | 100% |
| Limitações | Configurações do sistema operacional podem variar |
| Estado/dono | __________ / __________ |

### M-13 — Taxa de bloqueio de contexto divergente

| Campo | Definição |
|---|---|
| Pergunta | O sistema impede incorporação no paciente/leito/versão errados? |
| Fórmula | `divergências bloqueadas ou reconciliadas explicitamente ÷ divergências injetadas × 100` |
| População | Cenários sintéticos de reconciliação |
| Fonte | Testes e rubrica |
| Meta | 100% |
| Limitações | Depende de identificadores disponíveis e desenho do fluxo |
| Estado/dono | __________ / __________ |

### M-14 — Incidentes e near misses reportados

| Campo | Definição |
|---|---|
| Pergunta | Há cultura e canal eficazes para aprender com risco? |
| Fórmula | Contagem e taxa por 100 sessões, segmentadas por tipo/severidade |
| População | Sessões/turnos no escopo |
| Fonte | Relato estruturado minimizado |
| Interpretação | Aumento pode significar detecção/cultura melhor, não pior desempenho |
| Uso proibido | Comparação punitiva entre pessoas/equipes |
| Estado/dono | __________ / __________ |

### M-15 — Oportunidade de acesso e suporte

| Campo | Definição |
|---|---|
| Pergunta | Grupos elegíveis recebem treinamento, acesso e suporte comparáveis? |
| Fórmula | `elegíveis com acesso + treinamento concluído ÷ elegíveis no grupo × 100` |
| Dimensões permitidas | Turno, papel, unidade e vínculo, somente com grupo ≥ `k` |
| Exclusões | Afastamento/licença documentados; não resposta não inferida como recusa |
| Fonte | Cadastro/treinamento minimizado |
| Interpretação | Diferença aciona investigação de barreiras e oferta de suporte |
| Estado/dono | __________ / __________ |

### M-16 — Disparidade de experiência técnica

| Campo | Definição |
|---|---|
| Pergunta | Há diferença de falha, latência ou abandono entre contextos operacionais? |
| Fórmula | Comparar taxas agregadas entre grupos elegíveis com intervalo de incerteza |
| Dimensões permitidas | Dispositivo, conectividade, turno, unidade; nunca atributo sensível sem avaliação específica |
| Requisito | Grupo ≥ `k`; suprimir célula pequena e combinações reidentificáveis |
| Uso | Corrigir infraestrutura, acessibilidade e treinamento |
| Limitações | Associação não prova causa nem desempenho individual |
| Estado/dono | __________ / __________ |

## 7. Indicadores de guarda

Nenhuma meta de velocidade pode ser celebrada se um indicador de segurança piorar. Para cada ciclo, avaliar em conjunto:

| Indicador de benefício | Guarda obrigatório |
|---|---|
| Menor tempo de preparação | Completude crítica não diminui |
| Maior uso de IA | Descarte/correção e near misses não pioram |
| Mais notificações | Privacidade e fadiga permanecem dentro do limite |
| Mais conclusão de checklist | Itens críticos têm dono/prazo e não viram clique mecânico |

**Limites de parada aprovados:** ________________________________

## 8. Qualidade, agregação e acesso

### 8.1 Regras de agregação

- Tamanho mínimo de grupo (`k`): ______.
- Janela mínima: ______ dias/turnos.
- Células abaixo de `k`: ☐ suprimir ☐ combinar ☐ outra regra: ______.
- Percentis preferidos a média quando houver cauda longa.
- Sempre exibir denominador, período, versão e dados ausentes.
- Não permitir drill-down nominal em painel de gestão.

### 8.2 Papéis de acesso

| Papel | Dados agregados | Evento individual | Conteúdo clínico |
|---|---|---|---|
| Profissional | Feedback próprio contextual: __________ | Somente o necessário: __________ | Conforme vínculo assistencial |
| Coordenador clínico | Grupo ≥ `k` | Exceção justificada/auditada | Conforme política institucional |
| Produto/analytics | Agregado/pseudonimizado | Por exceção aprovada | Não por padrão |
| Suporte técnico | Métrica técnica | Por ticket autorizado | Não por padrão |

## 9. Retenção e exportação

| Artefato | Retenção | Local autorizado | Exportação permitida |
|---|---|---|---|
| Evento técnico bruto | __________ | __________ | Não, salvo processo aprovado |
| Métrica agregada | __________ | __________ | Conforme `k` e revisão |
| Rubrica sintética | __________ | Repositório aprovado | Sim, sem dado real |
| Dashboard | __________ | __________ | Somente agregado aprovado |

## 10. Processo de mudança

1. Proponente abre decisão com problema, fórmula e risco.
2. Dono clínico e dados validam significado e qualidade.
3. DPO/jurídico/trabalhista avaliam finalidade e não uso punitivo.
4. Segurança valida fonte, acesso, retenção e exportação.
5. Alteração recebe versão e data; séries quebradas são sinalizadas.
6. Métrica sem decisão útil ou com risco desproporcional é aposentada.

| Campo de mudança | Preenchimento |
|---|---|
| Métrica | ________________________________ |
| Versão antiga/nova | __________ / __________ |
| Motivo | ________________________________ |
| Impacto histórico | ________________________________ |
| Aprovações | ________________________________ |
| Vigência | ____/____/________ |

## 11. Checklist antes de ativar uma métrica

- ☐ Pergunta e decisão estão claras.
- ☐ Fórmula, denominador e exclusões foram testados.
- ☐ Não há conteúdo clínico desnecessário na fonte.
- ☐ Não produz ranking nem decisão punitiva automatizada.
- ☐ Contexto e limitações aparecem no painel.
- ☐ Agregação e tamanho mínimo de grupo estão ativos.
- ☐ Retenção, acesso e descarte foram aprovados.
- ☐ Cenários sintéticos passaram.
- ☐ Dono e revisão têm data.

**Aprovado por:** __________________  
**Data:** ____/____/________

## 12. Referências do projeto

- [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md)
- [PILOT_PROTOCOL.md](PILOT_PROTOCOL.md)
- [LGPD_PRIVACY.md](LGPD_PRIVACY.md)
- [CLINICAL_SAFETY_CASE.md](CLINICAL_SAFETY_CASE.md)

