# Passagem UTI — Protocolo de Piloto Sintético

> **RASCUNHO — NÃO É PARECER JURÍDICO.** Este protocolo é operacional, não substitui aprovação clínica, ética, jurídica, de privacidade, segurança, pesquisa ou governança exigida pela instituição.

## 1. Identificação

| Campo | Preenchimento |
|---|---|
| Código do piloto | ________________________________ |
| Título | ________________________________ |
| Patrocinador | ________________________________ |
| Instituição/unidade simulada | ________________________________ |
| Responsável clínico | ________________________________ |
| Responsável de produto | ________________________________ |
| Segurança/privacidade | ________________________________ |
| Início planejado | ____/____/________ |
| Término planejado | ____/____/________ |
| Versão/build | ________________________________ |
| Comitê/gate | ________________________________ |
| Estado | ☐ Planejado ☐ Em treinamento ☐ Em execução ☐ Pausado ☐ Encerrado |

## 2. Regra de ouro

O piloto inicial usa **exclusivamente dados sintéticos**: personagens, datas, diagnósticos, exames, imagens, documentos, identificadores e eventos inteiramente fictícios, criados para teste e sem derivação identificável de pacientes reais.

É proibido:

- copiar, adaptar ou “mascarar” caso real;
- capturar tela de prontuário ou importar material assistencial;
- usar nome, iniciais, prontuário, imagem, voz ou dado de pessoa real;
- colocar dado clínico, segredo, token, senha ou chave de API no GitHub, Notion, Google Drive ou iCloud;
- usar conta, dispositivo ou canal pessoal não homologado.

Documentação não clínica, dados sintéticos e métricas agregadas aprovadas podem ser versionados. Segredos ficam em gerenciador de segredos ou configuração local ignorada pelo Git.

## 3. Fronteira do produto avaliado

| Estado | Incluído no piloto? | Observação |
|---|---:|---|
| **ATUAL — LOCAL** | ☐ Sim ☐ Não | Aplicação local com 10 leitos, dez tópicos, anexos locais, checklist, timeline, Radar, read-back, comandos, temas e notificações locais. |
| **FUTURO — ONLINE V5** | ☐ Sim ☐ Não | Somente protótipo/módulo que esteja implementado e evidenciado. Identidade, nuvem, RBAC, sync e auditoria não podem ser presumidos a partir da documentação. |

**Build e funções exatas sob teste:**  
____________________________________________________________________

**Funções explicitamente fora do teste:**  
____________________________________________________________________

## 4. Objetivos e hipóteses

### 4.1 Objetivo primário

Avaliar se o fluxo ajuda profissionais treinados a preparar e compreender uma passagem estruturada sem ocultar informação crítica, mantendo revisão humana e fallback manual.

**Objetivo local específico:**  
____________________________________________________________________

### 4.2 Hipóteses mensuráveis

| ID | Hipótese | Métrica | Meta | Resultado |
|---|---|---|---|---|
| H-01 | Usuários concluem o fluxo com dados sintéticos | Taxa de conclusão | ≥ ____% | ______ |
| H-02 | Conteúdo crítico é lembrado no read-back | Completude crítica | ≥ ____% | ______ |
| H-03 | Saídas inadequadas da IA são detectadas antes da publicação | Taxa de detecção | ≥ ____% | ______ |
| H-04 | Fallback manual funciona quando IA/rede falha | Sucesso do fallback | 100% | ______ |
| H-05 | Usuários reconhecem que o app não substitui prontuário/alerta vital | Avaliação pós-treino | ≥ ____% | ______ |
| H-__ | __________________ | __________________ | ______ | ______ |

## 5. Participantes e papéis

| Perfil | Quantidade planejada | Critério de inclusão | Atividade |
|---|---:|---|---|
| Coordenador | ____ | Treinado e autorizado | Configuração/supervisão simulada |
| Diarista | ____ | Treinado e autorizado | Revisão longitudinal simulada |
| Plantonista emissor | ____ | Treinado e autorizado | Preparação/entrega simulada |
| Plantonista receptor | ____ | Treinado e autorizado | Recepção/read-back simulado |
| Observador | ____ | Compromisso de confidencialidade | Registro não clínico |

**Critérios de exclusão:** ausência de treinamento; tentativa de inserir dado real; conflito de interesse não declarado; indisponibilidade para completar o debrief; outro: __________________.

Participação e métricas não podem ser usadas para ranking ou punição individual.

## 6. Dataset sintético

### 6.1 Construção

- Gerador/responsável: ________________________________
- Método de criação: ________________________________
- Revisão de que não deriva de caso real: ________________________________
- Licença/origem de imagens sintéticas: ________________________________
- Data de aprovação: ____/____/________
- Hash/versão do conjunto: ________________________________

### 6.2 Casos mínimos

| ID | Cenário fictício | Risco/objetivo | Artefatos sintéticos | Resposta esperada |
|---|---|---|---|---|
| S-01 | Caso estável com pendências | Fluxo nominal | Texto + exame | Dez tópicos revisáveis |
| S-02 | Choque com prioridades conflitantes | Priorização/read-back | PDF + texto | Risco destacado, sem prescrição automática |
| S-03 | Documento ambíguo/ilegível | Incerteza | Imagem sintética | Falha explícita/solicitação de revisão |
| S-04 | Paciente/leito divergente | Reconciliação | Dois identificadores fictícios | Bloqueio/alerta de contexto |
| S-05 | Mudança após read-back | Versionamento | Evento posterior | Invalidação e nova revisão |
| S-06 | IA indisponível | Continuidade | Entrada manual | Fallback completo |
| S-07 | Anexo malicioso simulado/incompatível | Segurança | Arquivo inerte de teste | Rejeição segura |
| S-08 | Notificação em tela bloqueada | Privacidade | Evento fictício | Sem nome/diagnóstico/conduta |
| S-09 | Conflito de edição futuro | Consistência | Atualizações sintéticas | Sem sobrescrita silenciosa |
| S-10 | Tentativa de acesso entre tenants futuro | Isolamento | Contas de teste | Negação + log |

Arquivos de teste não podem conter código malicioso real sem ambiente, autorização e equipe especializada.

## 7. Ambientes e configurações

| Item | Valor/evidência |
|---|---|
| URL/caminho do ambiente | ________________________________ |
| Isolado de produção? | ☐ Sim ☐ Não |
| Dados reais tecnicamente bloqueados? | ________________________________ |
| Contas fictícias | ________________________________ |
| Chave/API de teste gerenciada em | ________________________________ |
| Logs sem conteúdo clínico | ________________________________ |
| Backup/restauração necessários? | ________________________________ |
| Navegadores/dispositivos | ________________________________ |
| Versão dos prompts/modelos | ________________________________ |

## 8. Treinamento obrigatório

Antes da sessão, cada participante deve demonstrar:

- ☐ diferenciação entre produto local atual e online futuro;
- ☐ proibição de dados reais no piloto;
- ☐ confirmação de paciente/leito fictícios;
- ☐ revisão humana das dez linhas;
- ☐ uso do checklist e read-back;
- ☐ identificação de mudança material;
- ☐ fallback sem IA;
- ☐ reporte de falha, risco e incidente;
- ☐ conhecimento dos destinos proibidos e proteção de segredo.

**Material/versão:** __________________  
**Instrutor:** __________________  
**Critério de aprovação:** __________________

## 9. Procedimento da sessão

1. Confirmar build, ambiente e dataset sintético.
2. Verificar que não há integração com prontuário/produção.
3. Distribuir papéis e cenário sem revelar a resposta esperada.
4. Emissor cria/atualiza a cápsula e revisa a IA.
5. Receptor executa read-back e registra dúvidas.
6. Moderador injeta mudança, falha ou conflito planejado.
7. Equipe usa notificação e/ou fallback conforme o cenário.
8. Encerrar o caso, exportar apenas evidência não clínica e excluir temporários.
9. Fazer debrief sem julgamento individual.
10. Classificar achados, donos, prazos e critério de reteste.

## 10. Métricas e coleta

As definições canônicas estão em [METRICS_DICTIONARY.md](METRICS_DICTIONARY.md).

| Métrica | Fonte sintética | Meta | Regra de agregação |
|---|---|---|---|
| Tempo de preparação | Evento local/de observação | ______ | Mediana, sem nome |
| Completude crítica | Rubrica do cenário | ______ | Grupo ≥ ____ |
| Detecção de saída inadequada | Rubrica da IA | ______ | Proporção agregada |
| Conclusão do read-back | Evento/rubrica | ______ | Agregada |
| Sucesso do fallback | Checklist | 100% | Por cenário |
| Erros/near misses | Debrief | Tendência de redução | Sem atribuição punitiva |
| Usabilidade | Questionário | ______ | Distribuição agregada |

Não haverá ranking de participante, comparação nominal ou uso em remuneração, escala, promoção, punição ou desligamento.

## 11. Segurança clínica e critérios de parada

Pausar imediatamente a sessão se ocorrer:

- dado ou material possivelmente real;
- exposição de chave, token, senha ou credencial;
- associação equivocada de contexto não bloqueada;
- saída da IA apresentada como fato/conduta sem revisão;
- impossibilidade de executar fallback;
- acesso indevido entre perfis/organizações de teste;
- falha que possa ser reproduzida contra produção;
- participante compreender o piloto como avaliação individual;
- outro critério: ________________________________________________.

**Quem pode ordenar parada:** __________________  
**Canal de escalonamento:** __________________  
**Prazo de triagem:** __________________  
**Critério de retomada:** __________________

## 12. Registro e classificação de achados

| ID | Cenário/build | Achado | Severidade | Impacto possível | Ação/dono | Prazo | Reteste |
|---|---|---|---|---|---|---|---|
| A-___ | __________ | __________ | ☐ Bloqueador ☐ Alto ☐ Médio ☐ Baixo | __________ | __________ | ______ | ______ |

O registro não deve conter nomes ou dados clínicos. Grave evidência mínima, sintética e suficiente para reprodução.

## 13. Critérios de aceitação do piloto sintético

O piloto só é considerado concluído quando:

- ☐ 100% das sessões usaram apenas dados sintéticos;
- ☐ nenhum segredo foi exposto ou versionado;
- ☐ zero bloqueador clínico, de privacidade ou segurança permanece aberto;
- ☐ todos os casos de paciente/leito divergente foram bloqueados ou claramente sinalizados;
- ☐ 100% das publicações exigiram revisão humana;
- ☐ 100% dos cenários de indisponibilidade concluíram fallback manual;
- ☐ read-back e invalidação por mudança material funcionaram nos cenários aplicáveis;
- ☐ notificações não revelaram conteúdo clínico em tela bloqueada;
- ☐ métricas respeitaram agregação e uso não punitivo;
- ☐ limitações e decisão final foram registradas no [DECISION_LOG.md](DECISION_LOG.md).

**Resultado:** ☐ Aprovado ☐ Aprovado com ressalvas ☐ Repetir ☐ Reprovado

## 14. Gate futuro para piloto com dados reais

O piloto sintético **não** autoriza dados reais. Uma fase assistencial separada só pode ser proposta após:

- RIPD, aviso de privacidade, termos, contratos e papéis aprovados;
- protocolo institucional e, quando aplicável, avaliação ética/regulatória;
- ambiente online implementado e homologado, com RBAC, tenancy e auditoria testados;
- integração, retenção, direitos, backups e resposta a incidente ativos;
- provedor de IA e transferências aprovados;
- monitoramento, suporte, SLA e fallback presencial definidos;
- treinamento e consentimentos/ciência exigidos pela instituição;
- aprovação formal de jurídico, DPO, segurança, assistência e direção.

**Documento do gate real:** ________________________________  
**Data mínima de avaliação:** ____/____/________

## 15. Encerramento e aprovações

**Resumo dos resultados:**  
____________________________________________________________________

**Limitações:**  
____________________________________________________________________

**Próxima decisão:**  
____________________________________________________________________

| Função | Nome | Decisão | Data |
|---|---|---|---|
| Responsável clínico | __________ | ☐ Aprova ☐ Reprova | ___/___/_____ |
| Privacidade/DPO | __________ | ☐ Aprova ☐ Reprova | ___/___/_____ |
| Segurança | __________ | ☐ Aprova ☐ Reprova | ___/___/_____ |
| Produto/tecnologia | __________ | ☐ Aprova ☐ Reprova | ___/___/_____ |
| Patrocinador | __________ | ☐ Aprova ☐ Reprova | ___/___/_____ |

## 16. Referências do projeto

- [PRD_V5.md](PRD_V5.md)
- [CLINICAL_SAFETY_CASE.md](CLINICAL_SAFETY_CASE.md)
- [SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md)
- [RIPD_TEMPLATE.md](RIPD_TEMPLATE.md)
- [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)

