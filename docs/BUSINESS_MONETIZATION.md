# Passagem UTI - Estratégia de Negócio e Monetização

**Status:** hipóteses comerciais; não representa preço ou contrato aprovado

## 1. Tese

O valor do Passagem UTI está na continuidade estruturada, redução de retrabalho e visibilidade de pendências. A monetização deve remunerar software, implantação e suporte, nunca a venda de dados de pacientes ou a exploração punitiva do desempenho médico.

## 2. Segmentos

### B2C - profissional individual

- Médicos plantonistas e diaristas.
- Equipes pequenas sem contratação institucional inicial.
- Uso preferencialmente com dados minimizados e conforme política do serviço.

### B2B - organizações

- Hospitais e redes.
- Empresas médicas responsáveis por escalas.
- UTIs independentes, grupos de qualidade e educação assistencial.

## 3. Ofertas propostas

### B2C Individual

| Plano | Conteúdo | Limites/guardrails |
|---|---|---|
| Local | Aplicativo local e exportação manual | Sem sincronização ou suporte institucional |
| Pro | Conta individual, plantão ad hoc e histórico limitado | Somente após backend seguro; sem integração hospitalar implícita |
| Equipe | Pequeno workspace autenticado | Convites, RBAC e retenção curta |

### B2B Institucional

| Oferta | Conteúdo |
|---|---|
| Piloto | 1 UTI, implantação limitada, treinamento e avaliação |
| Unidade | UTI oficial, SSO/MFA, RBAC, auditoria e suporte |
| Rede | Múltiplas unidades, governança central, SLA e integrações aprovadas |

Serviços adicionais:

- Onboarding e configuração.
- Treinamento clínico e de governança.
- Integrações contratadas.
- Suporte/SLA.
- Relatórios agregados de oportunidade/equidade.

## 4. Métrica de valor

Cobrança deve seguir unidade clara e previsível:

- B2C: usuário ativo/mês com limite transparente de IA.
- B2B: unidade/leito licenciado + usuários autorizados + consumo de IA acordado.
- Implantação e integração cobradas separadamente.

Evitar cobrança que incentive chamadas desnecessárias, retenção excessiva ou competição entre profissionais.

## 5. Hipóteses de preço

Faixas devem ser validadas por entrevista, piloto e custo real. Não publicar preço definitivo antes de conhecer:

- Custo de IA por cápsula/turno.
- Storage, auditoria e suporte.
- Ciclo de compra hospitalar.
- Custo de implantação e segurança.
- Disposição a pagar por redução de tempo e risco operacional.

Estratégia inicial:

1. Piloto pago de escopo fechado.
2. Preço por UTI/mês com franquia de uso.
3. Overages transparentes e limites configuráveis.
4. Revisão após 90 dias de uso real.

## 6. Unit economics

Indicadores:

- Receita recorrente mensal por cliente.
- Margem bruta após IA, storage, segurança e suporte.
- Custo de aquisição e tempo de payback.
- Retenção por unidade e expansão na rede.
- Chamadas de IA por leito/turno.
- Custo de suporte por usuário ativo.

Guardrails:

- Não reduzir segurança para elevar margem.
- Não ocultar custo variável da IA.
- Não treinar modelo comercial com conteúdo clínico sem base, contrato e governança separados.

## 7. Go-to-market

### Fase 1 - design partners

- 1 a 3 UTIs com liderança engajada.
- Contrato de piloto, objetivos, critérios de parada e sem promessa de desfecho clínico.
- Treinamento e canal de incidente.

### Fase 2 - prova operacional

- Medir tempo, completude, pendências e adoção.
- Executar pesquisa qualitativa de segurança e carga cognitiva.
- Validar integração mínima e suporte.

### Fase 3 - escala controlada

- Expandir por rede após gates de segurança.
- SSO, provisionamento e governança central.
- Programa de champions sem metas punitivas.

## 8. Indicadores de oportunidade e equidade

Objetivo: identificar onde produto, treinamento, escala ou infraestrutura criam barreiras.

Exemplos:

- Turnos com maior taxa de cápsulas incompletas.
- Unidades com mais falhas técnicas ou menor acesso.
- Diferenças por horário, conectividade ou tipo de vínculo.
- Tempo para resolver pendências por contexto operacional.

Proibições:

- Ranking nominal de médicos.
- Score individual de qualidade clínica.
- Uso automático para remuneração, punição, escala ou desligamento.
- Comparações de grupos pequenos que permitam reidentificação.

Toda métrica deve ter definição, finalidade, população, limitação, responsável e revisão de viés.

## 9. Ética de receita

- Sem publicidade direcionada em área clínica.
- Sem venda, corretagem ou licenciamento de dados de saúde.
- Sem enriquecimento de perfil de paciente ou profissional para terceiros.
- Sem dark patterns de consentimento.
- Sem bloquear acesso a dados do controlador por lock-in indevido.

## 10. Contratos B2B essenciais

- Definição de controlador, operador e subprocessadores.
- Escopo, finalidade e instruções de tratamento.
- Segurança, auditoria, retenção, exclusão e portabilidade.
- Incidentes e cooperação regulatória.
- Transferência internacional e localização de dados.
- SLA, suporte, continuidade e saída contratual.
- Proibição de uso secundário não autorizado.

## 11. Riscos comerciais

| Risco | Resposta |
|---|---|
| Ciclo de venda longo | Pilotos pequenos com patrocinador executivo |
| Confusão com prontuário | Posicionamento e contrato claros |
| Custo variável da IA | Franquia, cache seguro e acompanhamento |
| Resistência clínica | Co-design, modo manual e treinamento |
| Responsabilidade percebida | Safety case e limites explícitos |
| Lock-in | Exportação e plano de saída |

## 12. Critério comercial para lançamento

Não vender o produto online como pronto antes de segurança, LGPD, auditoria, suporte e recuperação passarem pelo [checklist de lançamento](./LAUNCH_CHECKLIST.md). Piloto deve declarar claramente caráter limitado e capacidades não disponíveis.

