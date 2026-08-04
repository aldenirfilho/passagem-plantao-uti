# Passagem UTI - Checklist de Lançamento

**Uso:** decisão formal de go/no-go  
**Regra:** item P0 aberto bloqueia lançamento; `N/A` exige justificativa e aprovação

## 1. Cabeçalho da decisão

| Campo | Valor |
|---|---|
| Release | |
| Ambiente | local / sintético / piloto / produção |
| Tenant/unidade | |
| Data proposta | |
| Release owner | |
| Clinical Safety Officer | |
| Security owner | |
| Encarregado/Privacy | |
| Instituição/controlador | |

## 2. Gate local

- [ ] Testes automatizados aprovados.
- [ ] Chave ausente do Git e bundle do frontend.
- [ ] Servidor limitado a loopback.
- [ ] Tutorial e avisos clínicos atualizados.
- [ ] Exportações e anexos não incluídos no pacote público.
- [ ] Limitações locais comunicadas ao usuário.

## 3. Gate P0 - escopo e governança online

- [ ] **P0** Capacidade online está marcada como futura até ser implementada.
- [ ] **P0** Controlador, operador, encarregado e subprocessadores definidos.
- [ ] **P0** UTI oficial e ad hoc têm finalidade, owner, retenção e encerramento.
- [ ] **P0** Coordenador, diarista e plantonista possuem matriz RBAC aprovada.
- [ ] **P0** Cápsula viva e versionamento aprovados.
- [ ] **P0** Critérios de parada e rollback aprovados.

## 4. Gate P0 - segurança clínica

- [ ] **P0** Safety case revisado e hazard log sem risco inaceitável aberto.
- [ ] **P0** Teste de paciente/leito/tenant errado aprovado.
- [ ] **P0** Resposta obsoleta/divergente é descartada.
- [ ] **P0** Read-back invalida após mudança material.
- [ ] **P0** Sugestões da IA não executam ação automaticamente.
- [ ] **P0** Modo manual funciona sem IA/rede.
- [ ] **P0** Radar/notificações não se apresentam como alarmes clínicos.
- [ ] **P0** Treinamento e canal de near miss disponíveis.

## 5. Gate P0 - LGPD e privacidade

- [ ] **P0** RoPA/registro de operações concluído.
- [ ] **P0** RIPD aprovado pelo controlador/encarregado.
- [ ] **P0** Base legal e finalidade documentadas por tratamento.
- [ ] **P0** Aviso de privacidade aprovado.
- [ ] **P0** Fluxo de direitos testado.
- [ ] **P0** Retenção/descarte configurados e testados.
- [ ] **P0** Transferência internacional e contratos aprovados.
- [ ] **P0** Incidente tabletop inclui comunicação e registro.
- [ ] **P0** GitHub, Notion, Drive/iCloud bloqueados para dados clínicos/segredos.

## 6. Gate P0 - segurança da informação

- [ ] **P0** MFA e sessões seguras implementados.
- [ ] **P0** Autorização backend e tenant isolation testados.
- [ ] **P0** Pentest sem crítico/alto não resolvido ou não aceito formalmente.
- [ ] **P0** Secret manager/KMS em uso; rotação testada.
- [ ] **P0** SAST, dependency, IaC e secret scanning aprovados.
- [ ] **P0** Upload: MIME, limites, AV e quarentena.
- [ ] **P0** Logs/APM/traces sem PHI ou segredos.
- [ ] **P0** Exportação com autorização, step-up e auditoria.
- [ ] **P0** Backup/restore e ransomware tabletop aprovados.

## 7. Gate P0 - confiabilidade

- [ ] **P0** SLO, RPO e RTO definidos.
- [ ] **P0** Capacidade e rate limits testados.
- [ ] **P0** Idempotência, conflito e retries validados.
- [ ] **P0** Rollback e feature flags testados.
- [ ] **P0** Monitoramento e on-call ativos.
- [ ] **P0** Dependência da IA possui timeout/circuit breaker.

## 8. Gate P1 - produto e acessibilidade

- [ ] Fluxos testados com coordenador, diarista e plantonista.
- [ ] Acessibilidade de teclado, contraste e leitor de tela revisada.
- [ ] Temas claro/escuro/sistema validados.
- [ ] Terminologia de IA, alerta, lacuna e pendência compreendida.
- [ ] Ajuda, suporte e tutorial atualizados.
- [ ] Fluxo de ad hoc deixa expiração explícita.

## 9. Gate P1 - indicadores

- [ ] Dicionário de métricas versionado.
- [ ] Oportunidade/equidade têm finalidade e owner.
- [ ] Tamanho mínimo de grupo implementado.
- [ ] Reidentificação e viés revisados.
- [ ] Ranking nominal e uso punitivo tecnicamente/politicamente proibidos.
- [ ] Dashboard declara limitações e não implica qualidade clínica.

## 10. Operação do piloto

- [ ] Instituição e usuários nomeados.
- [ ] Janela, escopo e features do piloto definidos.
- [ ] Critérios de sucesso e parada comunicados.
- [ ] Dados sintéticos usados até autorização final.
- [ ] Suporte e escalonamento clínico/técnico treinados.
- [ ] Plano de comunicação em indisponibilidade pronto.
- [ ] Revisão semanal de incidentes e near misses agendada.

## 11. Comercial

- [ ] Contrato/DPA/SLA assinados.
- [ ] Preço e limites de IA transparentes.
- [ ] Sem cláusula de uso secundário/venda de dados.
- [ ] Plano de saída, portabilidade e deleção contratado.
- [ ] Marketing não promete desfecho clínico não comprovado.

## 12. Evidências

| Gate | Evidência/link interno | Owner | Data | Status |
|---|---|---|---|---|
| Safety case | | | | |
| RIPD/RoPA | | | | |
| Threat model/pentest | | | | |
| RBAC/tenant test | | | | |
| Backup/restore | | | | |
| Incident tabletop | | | | |
| Usability/accessibility | | | | |

Não inserir evidência clínica ou segredo nesta tabela/repositório; usar apenas identificador/link para repositório governado.

## 13. Assinatura go/no-go

| Área | Nome | Decisão | Condições | Data |
|---|---|---|---|---|
| Produto | | | | |
| Segurança clínica | | | | |
| Segurança | | | | |
| Privacidade/Jurídico | | | | |
| Controlador/instituição | | | | |
| Operações | | | | |

**Decisão final:** GO / NO-GO / GO CONDICIONAL  
**Expiração da decisão:**  
**Rollback owner:**

