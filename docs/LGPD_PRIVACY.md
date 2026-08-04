# Passagem UTI - LGPD e Privacidade

**Status:** política de projeto para validação jurídica  
**Aviso:** este documento não substitui parecer jurídico, RIPD ou decisão do controlador

## 1. Princípio central

Dados referentes à saúde são dados pessoais sensíveis. Qualquer implantação online deve começar pela finalidade, necessidade e governança, não pela coleta disponível.

## 2. Estado atual versus futuro

### ATUAL - LOCAL

- Estado e anexos ficam no navegador escolhido.
- Anexos selecionados são enviados ao provedor de IA somente ao renderizar.
- A chave fica no servidor local.
- Não há conta, controlador configurado no produto, portal de direitos ou política central de retenção.

O modo local não é automaticamente “conforme a LGPD”. O médico e a instituição devem avaliar finalidade, base legal, segurança e política interna.

### FUTURO - ONLINE

Exige, antes de dados reais:

- Definição documentada de controlador, operador, encarregado e subprocessadores.
- Registro das operações de tratamento.
- RIPD/DPIA proporcional ao risco.
- Base legal específica para cada finalidade.
- Aviso de privacidade e fluxo de direitos.
- Contratos, retenção, segurança e resposta a incidente.

## 3. Papéis de tratamento

Modelo provável em B2B, sujeito a contrato:

- Hospital/organização: controlador das finalidades assistenciais.
- Fornecedor Passagem UTI: operador conforme instruções documentadas.
- Provedores de cloud/IA: subprocessadores aprovados.
- Encarregado: canal formal definido pelo controlador e, quando aplicável, pelo operador.

Em B2C ou plantão ad hoc, os papéis podem mudar. Eles devem ser avaliados por contexto; o produto não deve presumir que “o usuário consentiu” resolve o tratamento.

## 4. Finalidades permitidas propostas

- Preparar, atualizar e receber passagem de plantão.
- Rastrear pendências assistenciais documentadas.
- Manter continuidade e auditoria autorizada.
- Operar, proteger e dar suporte ao serviço.
- Produzir indicadores agregados de oportunidade/equidade.

Finalidades secundárias como pesquisa, treinamento de modelo, publicidade ou benchmarking externo exigem avaliação e governança separadas. Não são autorizadas por este documento.

## 5. Base legal

A base legal deve ser escolhida e registrada pelo controlador para cada finalidade e categoria de dado. Em contexto assistencial, podem existir hipóteses relacionadas a tutela da saúde, proteção da vida, obrigação legal/regulatória ou exercício regular de direitos, conforme o caso. Não usar consentimento genérico como solução padrão para assistência.

Checklist de decisão:

1. Qual finalidade específica?
2. Quais dados são indispensáveis?
3. Quem decide e quem opera?
4. Qual base legal para dados pessoais e sensíveis?
5. Há compartilhamento ou transferência internacional?
6. Qual retenção e descarte?
7. Como o titular exerce direitos?
8. Qual risco residual e aprovação?

## 6. Princípios aplicados

| Princípio | Controle de produto |
|---|---|
| Finalidade | Finalidade registrada por workspace e integração |
| Adequação | Campos e fluxos compatíveis com continuidade |
| Necessidade | Minimização antes de persistir ou enviar à IA |
| Livre acesso | Canal de direitos e inventário pesquisável |
| Qualidade | Versões, autoria e correção sem sobrescrita silenciosa |
| Transparência | Avisos claros sobre IA, compartilhamento e retenção |
| Segurança | Criptografia, RBAC, secret manager e auditoria |
| Prevenção | Threat model, safety case e testes |
| Não discriminação | Sem ranking punitivo; revisão de equidade |
| Prestação de contas | Evidências, logs, RIPD e aprovações |

## 7. Inventário mínimo de dados

| Categoria | Exemplos | Classificação | Necessidade |
|---|---|---|---|
| Identidade clínica | Nome/iniciais, prontuário, idade | Sensível/identificável | Minimizar por política |
| Conteúdo assistencial | Diagnósticos, exames, condutas | Dado de saúde sensível | Finalidade assistencial |
| Anexos | PDF, imagem, documento | Potencialmente sensível | Upload deliberado |
| Profissional | Nome, CRM, papel, unidade | Pessoal/profissional | Acesso e autoria |
| Auditoria | Quem, quando, recurso, ação | Pessoal + metadado clínico | Segurança e accountability |
| Telemetria | Latência, erro, versão | Técnica | Sem PHI por padrão |

## 8. Minimização e desidentificação

- Preferir identificador institucional interno a nome completo quando possível.
- Remover metadados desnecessários de arquivos.
- Enviar à IA somente campos e anexos selecionados.
- Não usar “anonimizado” quando houver possibilidade razoável de reidentificação.
- Métricas devem ser agregadas e sujeitas a tamanho mínimo de grupo.
- Dados sintéticos são obrigatórios em desenvolvimento e demonstrações.

## 9. Destinos proibidos

É proibido enviar ou armazenar conteúdo clínico, anexos, exportações, logs clínicos, chaves ou tokens em:

- GitHub, issues, pull requests, Actions artifacts ou snippets.
- Notion ou ferramentas de wiki genéricas.
- Google Drive pessoal ou compartilhado não contratado como repositório clínico.
- iCloud Drive, iCloud Notes ou pastas sincronizadas pessoais.
- E-mail, mensageria ou analytics não aprovados.

Esses serviços podem receber somente documentação sem dados clínicos, material sintético e indicadores agregados aprovados.

## 10. Retenção e descarte

Não há prazo universal definido por este projeto. O controlador deve aprovar uma matriz por objeto e finalidade:

| Objeto | Gatilho de início | Regra a definir | Descarte |
|---|---|---|---|
| Cápsula/versão | Publicação/encerramento | Política assistencial/contratual | Exclusão verificável ou arquivo autorizado |
| Anexo | Upload | Mínimo necessário | Fila de deleção + evidência |
| Plantão ad hoc | Encerramento/TTL | Curta duração por padrão | Descarte automático revisável |
| Auditoria | Evento | Segurança/obrigação | Expiração controlada |
| Backup | Criação | Janela operacional | Expiração e criptographic erasure |
| Incidente | Registro | Mínimo regulatório aplicável | Conforme política jurídica |

Bloqueio legal/litigation hold deve ser explícito, autorizado e auditado.

## 11. Direitos do titular

O produto futuro deve apoiar o controlador com:

- Confirmação e acesso.
- Correção de dados inexatos.
- Informação sobre compartilhamento.
- Portabilidade quando aplicável.
- Bloqueio, anonimização ou eliminação quando cabível.
- Revisão de decisões automatizadas, se houver.
- Registro do pedido, identidade, prazo e resposta.

Pedidos não podem ser resolvidos por exclusão direta sem avaliar prontuário, obrigação de retenção e direitos de terceiros.

## 12. Incidentes

Fluxo mínimo:

1. Detectar, conter e preservar evidências.
2. Acionar segurança, jurídico, encarregado e controlador.
3. Determinar dados, titulares, escala e risco/dano relevante.
4. Mitigar e decidir comunicações.
5. Registrar decisão, conteúdo e prazos.
6. Executar análise de causa e ações corretivas.

A Resolução CD/ANPD nº 15/2024 prevê comunicação pelo controlador à ANPD e aos titulares em três dias úteis quando o incidente puder acarretar risco ou dano relevante, além de registro de incidentes por pelo menos cinco anos. O jurídico deve confirmar a regra vigente e eventuais normas setoriais no momento do incidente.

## 13. Transferência internacional e fornecedores

Antes de contratar cloud/IA:

- Mapear países/regiões e subprocessadores.
- Avaliar mecanismo legal aplicável.
- Contratar confidencialidade, segurança, finalidade e assistência a direitos/incidentes.
- Exigir deleção, portabilidade e aviso de mudanças.
- Documentar risco residual no RIPD.

## 14. Privacy by design

- Configuração mais restritiva por padrão.
- Campos livres minimizados.
- Visualização de dados conforme papel e vínculo.
- Exportação desabilitada até autorização.
- Push sem conteúdo clínico.
- Logs e analytics com allowlist.
- Separação entre dados clínicos e métricas.
- Testes de privacidade em CI e revisão pré-release.

## 15. Evidências exigidas antes do piloto

- RoPA/registro de operações.
- RIPD aprovado.
- Matriz de finalidade/base legal/retenção.
- Contratos e subprocessadores.
- Aviso de privacidade e canal de direitos.
- Teste de exclusão/portabilidade.
- Exercício de incidente.
- Aprovação do controlador, encarregado e segurança.

## 16. Enquadramento como sistema de saúde

O baseline local é uma ferramenta de apoio à comunicação e não deve ser divulgado como prontuário eletrônico. Se o escopo futuro passar a guardar o registro oficial, assinar documentos médicos, substituir papel ou integrar um Sistema de Registro Eletrônico de Saúde, a instituição deve avaliar formalmente requisitos profissionais, arquivísticos, de certificação e interoperabilidade aplicáveis. A Resolução CFM nº 1.821/2007 trata da digitalização, guarda, manuseio e troca de informação identificada em saúde; fluxos de telemedicina também possuem exigências próprias na Resolução CFM nº 2.314/2022. A decisão de enquadramento deve ser documentada por assessoria jurídica, direção técnica e segurança da informação antes de alterar a finalidade do produto.

## 17. Fontes oficiais

- [Lei nº 13.709/2018 - texto compilado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD - Guia de agentes de tratamento e encarregado](https://www.gov.br/anpd/pt-br/assuntos/noticias/nova-versao-do-guia-dos-agentes-de-tratamento)
- [ANPD - Regulamento de Comunicação de Incidente de Segurança](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca)
- [ANPD - Guia de segurança da informação](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte)
- [ANPD - Perguntas e respostas sobre RIPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd)
- [CFM - Resolução nº 1.821/2007](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2007/1821)
- [CFM - Resolução nº 2.314/2022](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2022/2314)
