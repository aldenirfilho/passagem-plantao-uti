# Passagem UTI - Clinical Safety Case

**Status:** argumento inicial de segurança; não constitui validação clínica  
**Escopo:** baseline local e arquitetura online futura

## 1. Claim principal

> Quando usado dentro do escopo, com revisão humana e controles verificados, o Passagem UTI pode apoiar a comunicação de plantão sem assumir decisão clínica, prontuário oficial ou função de alarme.

O claim só é aceitável enquanto as evidências e controles deste documento forem mantidos.

## 2. Contexto e limites

- Usuários são profissionais autorizados.
- Informação pode estar incompleta, contraditória ou desatualizada.
- IA pode omitir, reorganizar incorretamente ou interpretar mal.
- A aplicação não recebe sinais vitais em tempo real.
- A classificação da IA é sugestão; estado médico é manual.
- Pendências sugeridas ficam inativas até aceite.
- Read-back registra compreensão de uma versão, não garante execução.

## 3. Estado atual e futuro

### ATUAL - LOCAL

Controles existentes:

- Dez tópicos fixos e schema estrito.
- `NÃO INFORMADO` para lacunas relevantes.
- Estado clínico manual separado da sugestão da IA.
- Sugestões de checklist aguardam aceite.
- Resposta obsoleta é descartada se a fonte mudar.
- Read-back é invalidado após alteração.
- Radar/notificações declaram não ser monitorização.

Limitações:

- Sem identidade autenticada ou vínculo institucional.
- Sem controle de acesso entre usuários.
- Persistência e disponibilidade dependem do navegador.
- Sem auditoria central e workflow institucional de incidente.

### FUTURO - ONLINE

Deve adicionar autenticação, RBAC, tenant isolation, versionamento imutável, auditoria, conflito explícito, governança, disponibilidade e resposta a incidente.

## 4. Safety claims

| ID | Claim | Estratégia | Evidência necessária |
|---|---|---|---|
| SC-01 | Paciente/leito não são misturados | Context binding + validação | Testes de troca, concorrência e tenant |
| SC-02 | Saída não é tratada como decisão autônoma | UX, rotulagem e revisão | Teste de usabilidade e conteúdo |
| SC-03 | Mudança posterior invalida aceite | Versionamento/hash | Testes unitários e end-to-end |
| SC-04 | Falha da IA degrada para manual | Separar editor e IA | Exercício de indisponibilidade |
| SC-05 | Pendência da IA não vira ação sem médico | Estado suggested/accepted | Teste de permissão e interface |
| SC-06 | Radar não se apresenta como alarme | Escopo e linguagem | Revisão clínica/human factors |
| SC-07 | Acesso online respeita vínculo | RBAC + tenant isolation | Pentest e testes de autorização |

## 5. Hazard log

Escala proposta: severidade S1-S4; probabilidade P1-P4. Avaliação final deve ser feita pelo safety officer da instituição.

| ID | Perigo | Causa | Consequência | Controles | Estado |
|---|---|---|---|---|---|
| H-01 | Paciente errado | Leito trocado, dado stale, IDOR | Conduta no paciente incorreto | Contexto fixo, confirmação, tenant test, descarte | Aberto online |
| H-02 | Informação crítica omitida | Fonte incompleta ou erro da IA | Falha de continuidade | `NÃO INFORMADO`, lacunas, revisão obrigatória | Controlado parcial |
| H-03 | Plano sugerido confundido com ordem | Linguagem ambígua | Conduta não autorizada | Rotulagem, checklist inativo, treinamento | Controlado parcial |
| H-04 | Passagem desatualizada | Concorrência/offline | Decisão baseada em versão antiga | Versionamento, ETag, conflito, timestamp | Aberto online |
| H-05 | Read-back falso/vencido | Mudança posterior ou identidade fraca | Responsabilidade mal atribuída | Login, versão, invalidação, auditoria | Aberto online |
| H-06 | Anexo errado/malicioso | Upload incorreto ou malware | Erro clínico/segurança | Preview, MIME, antivírus, confirmação | Aberto online |
| H-07 | Radar interpretado como monitor | Design/marketing | Perda de alarme real | Disclaimer persistente e treinamento | Controlado parcial |
| H-08 | Serviço indisponível | Rede/provedor | Atraso na passagem | Modo manual, runbook, exportação aprovada | Aberto online |
| H-09 | Uso punitivo de métricas | Governança inadequada | Dano moral, ocultação, inequidade | Agregação, proibição, conselho de governança | Aberto |
| H-10 | Alucinação quantitativa | IA altera dose/data/valor | Dano assistencial | Preservação, diff, revisão e testes | Aberto |

## 6. Controles obrigatórios de interface

- Mostrar paciente/leito/unidade durante edição e antes de renderizar/publicar.
- Exibir versão e horário da última atualização.
- Diferenciar fato, plano, pendência, sugestão e dado ausente.
- Nunca aplicar automaticamente estado, dose, diagnóstico ou checklist.
- Exigir ação explícita para aceitar sugestão.
- Mostrar invalidação do read-back de forma imediata.
- Fornecer modo manual em falha de IA/rede.
- Evitar cores como único canal de gravidade.

## 7. IA: uso permitido e proibido

Permitido:

- Estruturar conteúdo fornecido.
- Resumir cronologia.
- Sinalizar contradições/lacunas para revisão.
- Sugerir checklist derivado do plano documentado.

Proibido:

- Prescrever tratamento novo sem base documentada.
- Alterar estado clínico automaticamente.
- Gerar alarme fisiológico.
- Executar tarefa, prescrição ou mensagem sem aprovação humana.
- Inferir qualidade individual do profissional.

## 8. Cápsula viva e segurança

- Cada versão publicada é imutável.
- Conteúdo novo não reescreve retroativamente o recebido.
- Read-back aponta para versão exata.
- Transferência de leito/paciente exige reconciliação.
- Conflito não pode ser resolvido por last-write-wins.
- Histórico é acessível somente a usuários com vínculo e finalidade.

## 9. Indicadores e equidade

Indicadores são sinais de oportunidade operacional, não medidas validadas de competência. Antes de exibir:

- Definir população, denominador e limitação.
- Verificar diferenças de acesso, carga e conectividade.
- Aplicar mínimo de grupo e proteção contra reidentificação.
- Excluir ranking nominal e automação de punição.
- Disponibilizar contestação e revisão humana.

## 10. Verificação e validação

### Testes obrigatórios

- Troca rápida de L1/L2 durante renderização.
- Alteração da fonte enquanto resposta está em voo.
- Mesmo prontuário em tenants distintos.
- Duas edições concorrentes da cápsula.
- Anexo incompatível, corrompido e malicioso.
- Resposta com tópico fora de ordem/leito divergente.
- Read-back seguido de alteração material.
- Indisponibilidade de IA, banco e rede.
- Usuário sem papel ou vínculo.
- Tema claro/escuro e acessibilidade de alertas.

### Avaliação humana

- Simulações com plantonista, diarista e coordenador.
- Cenários de alta carga e interrupção.
- Medição de compreensão, tempo e erro de seleção.
- Debrief sem punição e análise de near misses.

## 11. Critérios de parada

Suspender piloto/feature se ocorrer:

- Vazamento cross-tenant.
- Associação ao paciente errado.
- Saída obsoleta apresentada como vigente.
- Sugestão executada sem aceite por falha do produto.
- Read-back mantido após mudança material.
- Métrica usada para punição individual.
- Ausência de modo manual durante indisponibilidade.

## 12. Governança do safety case

Responsáveis mínimos:

- Clinical Safety Officer.
- Product owner.
- Security/Privacy.
- Representante da instituição piloto.
- Engenharia e qualidade.

O hazard log deve ser revisado a cada release, incidente, mudança de modelo, integração ou expansão de finalidade.

## 13. Gate clínico

Uso online real permanece bloqueado até SC-01 a SC-07 terem evidência, responsáveis e risco residual aceito formalmente.

