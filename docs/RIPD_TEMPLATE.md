# Passagem UTI — Modelo de RIPD

> **RASCUNHO — NÃO É PARECER JURÍDICO.** Este modelo deve ser preenchido e validado pelo controlador, pelo encarregado, pelas áreas clínica, jurídica, privacidade, segurança e tecnologia antes de qualquer tratamento de dados reais no produto online.

## 1. Identificação e controle do documento

| Campo | Preenchimento |
|---|---|
| Organização/controlador | ________________________________ |
| Unidade/UTI | ________________________________ |
| Operador do produto | ________________________________ |
| Encarregado/DPO e contato | ________________________________ |
| Responsável clínico | ________________________________ |
| Responsável por segurança | ________________________________ |
| Responsável pelo RIPD | ________________________________ |
| Versão | ________________________________ |
| Data de abertura | ____/____/________ |
| Data da última revisão | ____/____/________ |
| Próxima revisão | ____/____/________ |
| Estado | ☐ Em elaboração ☐ Em validação ☐ Aprovado ☐ Revisão necessária |
| Escopo/ambiente | ☐ Protótipo sintético ☐ Homologação ☐ Produção |
| Contratos relacionados | ________________________________ |

## 2. Decisão executiva

**Tratamento avaliado:**  
____________________________________________________________________

**Decisão:** ☐ Não iniciar ☐ Iniciar com condicionantes ☐ Iniciar ☐ Suspender

**Condicionantes e prazo:**  
____________________________________________________________________

**Risco residual aceito por:** ____________________ **em:** ____/____/________

## 3. Fronteira obrigatória: produto atual e produto futuro

| Estado | O que existe | O que este RIPD autoriza |
|---|---|---|
| **ATUAL — LOCAL** | Aplicação executada localmente, persistência no navegador/IndexedDB e servidor local para a API. Não há identidade institucional, multi-tenancy, sincronização, RBAC ou auditoria central. | Nada automaticamente. O uso local também precisa seguir a política da instituição e a LGPD. |
| **FUTURO — ONLINE V5** | Arquitetura proposta com contas, organizações, unidades, papéis, sincronização, armazenamento e auditoria. | Somente o escopo expressamente aprovado neste RIPD e nos gates de produção. A documentação não prova que essas funções já foram implementadas. |

O piloto inicial descrito em [PILOT_PROTOCOL.md](PILOT_PROTOCOL.md) usa **somente dados sintéticos**. A passagem para dados reais exige novo gate formal, ambiente aprovado e evidências anexadas a este RIPD.

## 4. Descrição do tratamento

### 4.1 Problema e finalidade

**Problema assistencial:**  
____________________________________________________________________

**Finalidade primária, específica e legítima:**  
____________________________________________________________________

**Resultado esperado:**  
____________________________________________________________________

**Finalidades expressamente excluídas:**  
☐ Publicidade ☐ Venda de dados ☐ Treinamento de modelo sem avaliação própria  
☐ Ranking individual punitivo ☐ Decisão trabalhista automatizada ☐ Outra: __________

### 4.2 Operações realizadas

Marque e detalhe:

- ☐ Coleta/importação de texto, PDF, imagem ou documento autorizado.
- ☐ Geração assistida por IA dos dez tópicos da passagem.
- ☐ Revisão, edição e publicação humana da cápsula.
- ☐ Armazenamento de anexos e checklist.
- ☐ Transferência e read-back entre profissionais autorizados.
- ☐ Notificações de pendências e mudanças materiais.
- ☐ Auditoria e métricas agregadas.
- ☐ Outra: ____________________________________________________________

### 4.3 Modos avaliados

- ☐ **UTI oficial:** organização/unidade/leitos e membros provisionados.
- ☐ **Plantão ad hoc:** workspace temporário, convite limitado e expiração definida.
- ☐ Ambos, com controles diferenciados descritos em: ____________________

## 5. Agentes, titulares e responsabilidades

| Papel | Entidade/nome | Responsabilidade documentada | Evidência/contrato |
|---|---|---|---|
| Controlador | __________________ | __________________ | __________________ |
| Operador | __________________ | __________________ | __________________ |
| Suboperador de nuvem | __________________ | __________________ | __________________ |
| Provedor de IA | __________________ | __________________ | __________________ |
| Encarregado/DPO | __________________ | __________________ | __________________ |
| Responsável clínico | __________________ | __________________ | __________________ |

**Titulares envolvidos:** ☐ Pacientes ☐ Profissionais ☐ Acompanhantes ☐ Outros: ______

Os papéis devem ser confirmados por contexto e contrato; não presumir que o fornecedor é sempre operador ou que consentimento genérico resolve o tratamento assistencial.

## 6. Inventário e fluxo de dados

| Categoria | Exemplos mínimos | Titular | Origem | Destino | Necessidade | Classificação |
|---|---|---|---|---|---|---|
| Identificação clínica | __________________ | ______ | ______ | ______ | ______ | Sensível/identificável |
| Conteúdo assistencial | __________________ | ______ | ______ | ______ | ______ | Dado de saúde sensível |
| Anexos | __________________ | ______ | ______ | ______ | ______ | Potencialmente sensível |
| Profissional | Nome, CRM, papel | ______ | ______ | ______ | ______ | Pessoal/profissional |
| Auditoria | Autor, ação, horário | ______ | ______ | ______ | ______ | Pessoal + metadado clínico |
| Telemetria técnica | Latência, erro, versão | ______ | ______ | ______ | ______ | Sem PHI por padrão |
| Outra | __________________ | ______ | ______ | ______ | ______ | ______ |

### 6.1 Diagrama textual do fluxo

```text
[Fonte autorizada: __________]
          ↓
[Cliente/app: __________]
          ↓ minimização/validação
[Backend/gateway: __________]
       ↙             ↘
[Armazenamento]    [Provedor de IA]
       ↓             ↓
[Cápsula revisada por profissional]
          ↓
[Destinatários autorizados: __________]
```

**Regiões geográficas de processamento/armazenamento:** ____________________

**Transferência internacional:** ☐ Não ☐ Sim — mecanismo e avaliação: __________

### 6.2 Destinos expressamente proibidos

É proibido inserir conteúdo clínico, dado pessoal identificável, dado de saúde, exportação de produção, log sensível, token, senha ou chave de API em:

- GitHub ou qualquer repositório de código;
- Notion;
- Google Drive;
- iCloud;
- tickets, chats, e-mails ou ferramentas pessoais não homologadas.

Esses destinos podem guardar apenas documentação não clínica, dados sintéticos ou métricas agregadas previamente aprovadas. Segredos devem permanecer em gerenciador de segredos homologado; nunca em arquivo versionado.

## 7. Finalidade, base legal e necessidade

| Operação/finalidade | Dados indispensáveis | Base legal para dados pessoais | Hipótese para dados sensíveis | Teste de necessidade concluído? | Responsável |
|---|---|---|---|---|---|
| __________________ | __________________ | __________________ | __________________ | ☐ Sim ☐ Não | __________ |
| __________________ | __________________ | __________________ | __________________ | ☐ Sim ☐ Não | __________ |
| __________________ | __________________ | __________________ | __________________ | ☐ Sim ☐ Não | __________ |

**Alternativas menos invasivas avaliadas:**  
____________________________________________________________________

**Por que os dados e a retenção escolhidos são proporcionais:**  
____________________________________________________________________

## 8. Retenção, descarte e portabilidade

| Objeto | Retenção proposta | Evento inicial | Descarte/anonimização | Exceção legal | Dono |
|---|---|---|---|---|---|
| Cápsulas | __________ | __________ | __________ | __________ | ______ |
| Anexos | __________ | __________ | __________ | __________ | ______ |
| Auditoria | __________ | __________ | __________ | __________ | ______ |
| Convites/sessões | __________ | __________ | __________ | __________ | ______ |
| Telemetria | __________ | __________ | __________ | __________ | ______ |
| Backups | __________ | __________ | __________ | __________ | ______ |

**Evidência de teste de exclusão e restauração:** ____________________________

## 9. Direitos e transparência

| Controle | Definição/evidência |
|---|---|
| Aviso de privacidade publicado | ________________________________ |
| Canal do titular | ________________________________ |
| Autenticação do solicitante | ________________________________ |
| Busca e exportação por titular | ________________________________ |
| Correção sem apagar trilha clínica | ________________________________ |
| Bloqueio/exclusão conforme obrigação aplicável | ________________________________ |
| Resposta a oposição/revisão | ________________________________ |
| SLA e responsável | ________________________________ |

Usar [PRIVACY_NOTICE_DRAFT.md](PRIVACY_NOTICE_DRAFT.md) como ponto de partida, nunca como aviso automaticamente aprovado.

## 10. Avaliação específica de IA

| Pergunta de controle | Resposta/evidência |
|---|---|
| Quais campos/anexos podem ser enviados? | ________________________________ |
| Como ocorre minimização antes do envio? | ________________________________ |
| O provedor usa o conteúdo para treinar modelos? | ________________________________ |
| Onde e por quanto tempo o provedor retém? | ________________________________ |
| Como versão, leito e paciente são reconciliados? | ________________________________ |
| Como a saída é rotulada e revisada por humano? | ________________________________ |
| Como falha/alucinação é detectada e registrada? | ________________________________ |
| Existe modo manual em caso de indisponibilidade? | ________________________________ |
| Como prompt/output sensível deixa de entrar em telemetria? | ________________________________ |

Regras mínimas:

- A IA auxilia a síntese; não diagnostica, prescreve, monitora ou publica conduta autonomamente.
- Toda saída requer revisão profissional antes de integrar a cápsula.
- Sugestão divergente, incompleta ou ligada à versão errada deve ser descartada.
- Mudança material invalida o read-back anterior.

## 11. Avaliação de riscos

Use probabilidade e impacto de 1 (baixo) a 5 (muito alto). **Risco = P × I**. Adapte a matriz à metodologia institucional.

| ID | Cenário de risco ao titular/assistência | Causa/ameaça | P | I | Risco inerente | Controles existentes/propostos | P residual | I residual | Risco residual | Dono/prazo |
|---|---|---|---:|---:|---:|---|---:|---:|---:|---|
| R-01 | Acesso indevido entre unidades | __________________ | _ | _ | _ | RBAC backend + teste entre tenants | _ | _ | _ | __________ |
| R-02 | Cápsula vinculada ao paciente/leito errado | __________________ | _ | _ | _ | Confirmação de contexto + versionamento | _ | _ | _ | __________ |
| R-03 | Conteúdo clínico em destino não homologado | __________________ | _ | _ | _ | Política, DLP e treinamento | _ | _ | _ | __________ |
| R-04 | Chave exposta no cliente/repositório | __________________ | _ | _ | _ | Gateway server-side + secret manager | _ | _ | _ | __________ |
| R-05 | Saída incorreta da IA aceita sem revisão | __________________ | _ | _ | _ | Rotulagem + revisão obrigatória | _ | _ | _ | __________ |
| R-06 | Notificação revelar dado sensível na tela bloqueada | __________________ | _ | _ | _ | Conteúdo mínimo por padrão | _ | _ | _ | __________ |
| R-__ | __________________ | __________________ | _ | _ | _ | __________________ | _ | _ | _ | __________ |

## 12. Controles e evidências de eficácia

| Domínio | Controle mínimo | Evidência esperada | Resultado |
|---|---|---|---|
| Acesso | MFA, menor privilégio, revogação, timeout | Testes e configuração | ☐ OK ☐ Falha ☐ N/A |
| Tenancy | Escopo imposto no backend | Teste automatizado negativo | ☐ OK ☐ Falha ☐ N/A |
| Criptografia | Em trânsito e repouso | Configuração/certificado | ☐ OK ☐ Falha ☐ N/A |
| Segredos | Secret manager, rotação e varredura | Relatório sem valor secreto | ☐ OK ☐ Falha ☐ N/A |
| Auditoria | Eventos íntegros e consultáveis | Amostra sintética | ☐ OK ☐ Falha ☐ N/A |
| Backups | Restauração e descarte testados | Relatório de ensaio | ☐ OK ☐ Falha ☐ N/A |
| IA | Schema, contexto e revisão humana | Teste com cenários sintéticos | ☐ OK ☐ Falha ☐ N/A |
| Notificações | Sem conteúdo sensível por padrão | Teste em dispositivos | ☐ OK ☐ Falha ☐ N/A |
| Incidentes | Runbook, contatos e simulação | Ata do tabletop | ☐ OK ☐ Falha ☐ N/A |

## 13. Incidentes e continuidade

**Canal 24×7:** ____________________  
**Responsável por triagem:** ____________________  
**Responsável por decisão de comunicação:** ____________________  
**Plano de continuidade/fallback manual:** ____________________

Em caso de incidente, preservar evidências, conter, avaliar titulares e risco, registrar decisões e verificar a norma vigente. A Resolução CD/ANPD nº 15/2024 prevê, para incidentes com risco ou dano relevante, comunicação pelo controlador em três dias úteis e conservação do registro por pelo menos cinco anos; a equipe jurídica deve confirmar os requisitos aplicáveis no momento do evento.

## 14. Métricas e risco de uso indevido

As métricas seguem [METRICS_DICTIONARY.md](METRICS_DICTIONARY.md) e são **não punitivas**:

- sem ranking nominal de profissionais;
- sem uso automatizado para remuneração, demissão, punição ou escala;
- apresentação agregada com tamanho mínimo de grupo: ______;
- acesso individual somente para finalidade assistencial/segurança autorizada;
- investigação de qualidade considera contexto, carga e falhas sistêmicas.

## 15. Piloto e gates

### 15.1 Piloto sintético

- ☐ Dataset 100% sintético aprovado.
- ☐ Nenhuma informação copiada de prontuário ou paciente real.
- ☐ Nenhum segredo/chave em repositório ou material de teste.
- ☐ Cenários críticos, fallback e critérios de parada testados.
- ☐ Métricas agregadas e não punitivas.
- ☐ Evidências anexadas sem dados sensíveis.

### 15.2 Gate separado para dados reais

- ☐ RIPD aprovado e assinado.
- ☐ Aviso, termos e contratos aprovados.
- ☐ Controlador, operador e subprocessadores definidos.
- ☐ Ambiente institucional homologado.
- ☐ Testes de segurança, tenancy, backup e incidente aprovados.
- ☐ Retenção, direitos e suporte operacional ativos.
- ☐ Responsável clínico autoriza protocolo e contingência.

Falha em qualquer item bloqueador mantém o produto em dados sintéticos.

## 16. Aprovações

| Função | Nome | Decisão | Assinatura/evidência | Data |
|---|---|---|---|---|
| Controlador | __________ | ☐ Aprova ☐ Reprova | __________ | ___/___/_____ |
| Encarregado/DPO | __________ | ☐ Aprova ☐ Ressalva | __________ | ___/___/_____ |
| Jurídico | __________ | ☐ Aprova ☐ Ressalva | __________ | ___/___/_____ |
| Segurança | __________ | ☐ Aprova ☐ Reprova | __________ | ___/___/_____ |
| Responsável clínico | __________ | ☐ Aprova ☐ Reprova | __________ | ___/___/_____ |
| Produto/tecnologia | __________ | ☐ Aprova ☐ Reprova | __________ | ___/___/_____ |

## 17. Referências oficiais

- [Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD — Guia orientativo para definições dos agentes de tratamento e do encarregado](https://www.gov.br/anpd/pt-br/assuntos/noticias/nova-versao-do-guia-dos-agentes-de-tratamento)
- [ANPD — Regulamento de Comunicação de Incidente de Segurança](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca)
- [ANPD — Guia orientativo sobre segurança da informação](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte)
- Documentos do projeto: [LGPD_PRIVACY.md](LGPD_PRIVACY.md), [SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md) e [CLINICAL_SAFETY_CASE.md](CLINICAL_SAFETY_CASE.md).

