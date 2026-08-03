# Passagem UTI — Termos de Uso

> **RASCUNHO — NÃO É PARECER JURÍDICO.** Modelo sujeito à revisão jurídica, clínica, regulatória, de privacidade e segurança. Não publicar nem aceitar eletronicamente antes da aprovação da entidade responsável.

**Fornecedor/entidade:** [NOME LEGAL]  
**CNPJ:** [CNPJ]  
**Endereço:** [ENDEREÇO]  
**Versão:** __________  
**Vigência:** ____/____/________  
**Jurisdição/foro, se aplicável:** [PREENCHER APÓS REVISÃO JURÍDICA]  
**Canal de suporte:** [CANAL]  

## 1. Aceitação e escopo

Ao usar o Passagem UTI em ambiente formalmente disponibilizado por [ENTIDADE], o usuário declara ter autorização institucional, vínculo assistencial e treinamento compatível com seu papel, além de aceitar estes termos e as políticas aplicáveis.

Este documento separa dois estados:

- **ATUAL — LOCAL:** aplicação executada localmente, sem conta institucional, multi-tenancy, sincronização, RBAC ou auditoria central. A instalação local não equivale a homologação institucional.
- **FUTURO — ONLINE V5:** proposta com contas, organizações, unidades, colaboração, armazenamento e auditoria. Suas condições só valem quando as funções estiverem implementadas, homologadas e contratadas.

O primeiro piloto é exclusivamente sintético. Dados reais exigem autorização separada e gates previstos no [PILOT_PROTOCOL.md](PILOT_PROTOCOL.md).

## 2. Natureza e finalidade do serviço

O Passagem UTI é uma ferramenta de apoio à preparação, revisão e recebimento da passagem de plantão. Pode organizar conteúdo em dez tópicos, manter anexos autorizados, checklist, eventos, read-back e notificações.

O serviço:

- não é prontuário eletrônico oficial, salvo eventual integração futura expressamente homologada;
- não é monitor multiparamétrico, sistema de prescrição ou dispositivo de alerta vital;
- não diagnostica, prescreve, substitui exame, protocolo institucional ou julgamento médico;
- não garante completude, atualidade ou correção automática do conteúdo;
- não transfere responsabilidade profissional para a IA ou para o fornecedor.

Em emergência, use os canais assistenciais e protocolos oficiais. Não dependa do aplicativo como único meio de comunicação crítica.

## 3. Elegibilidade e papéis

O acesso é limitado a pessoas autorizadas por [CONTROLADOR/INSTITUIÇÃO]. Idade mínima e requisitos profissionais: ________________________________

| Papel proposto | Permissões esperadas | Limites |
|---|---|---|
| Coordenador | Configurar unidade, leitos, membros e políticas | Não acessar/alterar conteúdo sem necessidade e autorização |
| Diarista | Revisar cápsulas, planos e pendências longitudinais | Publicação exige vínculo assistencial |
| Plantonista | Preparar, atualizar, entregar e receber plantão | Restrito a unidade/leito/turno autorizado |
| Administrador técnico | Operar identidade e suporte | Sem acesso clínico por padrão; acesso excepcional auditado |

**Papéis efetivamente contratados:** ________________________________

É proibido compartilhar conta, autenticação, convite ou sessão. O usuário deve comunicar perda de dispositivo ou acesso suspeito imediatamente pelo canal [CANAL].

## 4. Regras de uso seguro

O usuário deve:

1. Confirmar organização, unidade, leito e paciente antes de importar ou publicar.
2. Inserir somente dados necessários, corretos e autorizados.
3. Revisar todas as saídas geradas por IA antes de aceitá-las.
4. Destacar riscos, pendências e prazos de forma verificável.
5. Executar read-back e repetir após mudança material.
6. Registrar correções em nova versão, sem ocultar a trilha aplicável.
7. Usar os canais oficiais para comunicação urgente ou contingência.
8. Encerrar sessão em dispositivos compartilhados e proteger credenciais.

## 5. Uso proibido

É proibido:

- inserir dados sem vínculo assistencial, finalidade ou autorização;
- usar o serviço para curiosidade, vigilância, discriminação ou assédio;
- publicar sugestão da IA sem revisão humana;
- usar métricas para ranking individual ou punição automatizada;
- tentar acessar outra organização, unidade, leito ou conta;
- desativar controles, adulterar auditoria ou explorar vulnerabilidades fora de programa autorizado;
- enviar malware, conteúdo ilícito ou arquivo incompatível com a finalidade;
- copiar conteúdo clínico, captura sensível ou exportação de produção para ferramentas não homologadas;
- inserir chave, token ou senha no cliente, código, log, prompt ou repositório.

## 6. Dados clínicos e destinos proibidos

Dados clínicos, dados pessoais identificáveis, dados de saúde, exportações de produção e logs sensíveis **não podem** ser armazenados em GitHub, Notion, Google Drive ou iCloud. Também não podem ser enviados para conta pessoal, chat, ticket ou mídia removível não homologada.

Esses destinos só podem conter documentação não clínica, dados sintéticos ou métricas agregadas aprovadas. Chaves de API e outros segredos devem permanecer em gerenciador de segredos institucional e ser rotacionados conforme a política.

O usuário deve cumprir o aviso de privacidade, a política de segurança, a retenção e as orientações do controlador.

## 7. Inteligência artificial

A IA oferece síntese e estruturação probabilísticas. Portanto:

- pode produzir omissão, ambiguidade ou informação incorreta;
- não deve criar ou mudar conduta automaticamente;
- não deve ser a única fonte para uma decisão clínica;
- toda saída precisa indicar origem/estado de revisão;
- versão, paciente e leito devem ser confirmados antes de incorporar a saída;
- em falha, o modo manual permanece o procedimento de contingência.

**Provedor de IA aprovado:** __________________  
**Política institucional aplicável:** __________________  
**Limites configurados:** __________________

## 8. Conteúdo, autoria e registros

O usuário continua responsável pelo conteúdo que insere e pelas decisões que valida. [ENTIDADE] pode manter registros de autoria, versão, acesso, alteração e aceite para segurança, qualidade e obrigações aplicáveis.

**Titularidade/licença do conteúdo clínico:** [DEFINIR EM CONTRATO]  
**Licença do software e materiais:** [DEFINIR]  
**Política de exportação/portabilidade:** [DEFINIR]  
**Retenção e descarte:** [DEFINIR]

Correções não devem apagar silenciosamente uma versão previamente entregue. Mudança material exige nova revisão/read-back.

## 9. Notificações

Notificações apoiam o fluxo e não substituem comunicação clínica urgente. Elas devem evitar conteúdo sensível na tela bloqueada. O usuário é responsável por manter canal e dispositivo autorizados configurados.

**Canais disponíveis:** ________________________________  
**SLA, se contratado:** ________________________________  
**Contingência:** ________________________________

## 10. Disponibilidade, suporte e mudanças

O serviço pode sofrer manutenção, indisponibilidade ou falha de terceiros. A instituição deve manter processo manual de contingência testado.

**Janela de manutenção:** __________________  
**SLA contratado:** __________________  
**Canal de incidente crítico:** __________________  
**Política de versão/descontinuação:** __________________

Alterações materiais que afetem privacidade, segurança ou assistência devem passar por controle de mudança e comunicação adequada.

## 11. Métricas e uso não punitivo

Métricas servem para aprender e melhorar sistema, treinamento e processo. Não podem, isoladamente ou por automação, determinar remuneração, escala, promoção, punição ou desligamento.

- Não haverá ranking nominal de profissionais.
- Resultados serão agregados com tamanho mínimo de grupo: ______.
- Investigações considerarão carga, complexidade, interrupções e falhas sistêmicas.
- Acesso excepcional a evento individual exige finalidade, autorização e registro.

Consulte [METRICS_DICTIONARY.md](METRICS_DICTIONARY.md).

## 12. Suspensão e encerramento

[ENTIDADE] pode suspender acesso para conter risco, uso indevido, incidente, término de vínculo ou obrigação aplicável, respeitando contrato e continuidade assistencial.

**Procedimento de suspensão:** ________________________________  
**Como ocorre exportação/transição:** ________________________________  
**Prazo de retenção pós-encerramento:** ________________________________  
**Procedimento de recurso:** ________________________________

## 13. Preço e condições comerciais

**Plano/contrato aplicável:** ________________________________  
**Preço, impostos e reajuste:** ________________________________  
**Cobrança/cancelamento:** ________________________________  
**Piloto gratuito ou remunerado:** ________________________________

Nenhuma condição comercial reduz obrigações de privacidade, segurança ou cuidado.

## 14. Responsabilidade e garantias

**Cláusulas de responsabilidade, indenização, garantias, caso fortuito, força maior e limites devem ser redigidas pelo jurídico considerando legislação, relação B2B/B2C, risco assistencial, contrato e seguros.**

Texto aprovado:  
____________________________________________________________________  
____________________________________________________________________

Nada nestes termos elimina responsabilidade que não possa ser afastada por lei.

## 15. Lei aplicável e solução de controvérsias

**Lei aplicável:** ________________________________  
**Canal inicial de solução:** ________________________________  
**Mediação/arbitragem, se válida:** ________________________________  
**Foro:** ________________________________

## 16. Contatos

| Assunto | Canal | SLA |
|---|---|---|
| Suporte | __________________ | __________________ |
| Segurança/incidente | __________________ | __________________ |
| Privacidade/DPO | __________________ | __________________ |
| Comercial/contrato | __________________ | __________________ |
| Reclamação/controvérsia | __________________ | __________________ |

## 17. Aprovação

| Área | Nome | Aprovação | Data |
|---|---|---|---|
| Jurídico | __________ | ☐ Sim ☐ Não | ___/___/_____ |
| Privacidade/DPO | __________ | ☐ Sim ☐ Não | ___/___/_____ |
| Segurança | __________ | ☐ Sim ☐ Não | ___/___/_____ |
| Responsável clínico | __________ | ☐ Sim ☐ Não | ___/___/_____ |
| Produto | __________ | ☐ Sim ☐ Não | ___/___/_____ |

## 18. Referências

- [Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- Projeto: [PRIVACY_NOTICE_DRAFT.md](PRIVACY_NOTICE_DRAFT.md), [LGPD_PRIVACY.md](LGPD_PRIVACY.md), [CLINICAL_SAFETY_CASE.md](CLINICAL_SAFETY_CASE.md) e [SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md).

