# Fontes técnicas e regulatórias verificadas

**Verificação:** 03/08/2026  
**Uso:** referências para engenharia e governança; não substituem parecer jurídico, certificação ou validação clínica.

## OpenAI

- [Latest model guide](https://developers.openai.com/api/docs/guides/latest-model): família GPT-5.6 e uso da Responses API.
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs): aderência a JSON Schema estrito.
- [File inputs](https://developers.openai.com/api/docs/guides/file-inputs): entrada de PDF e arquivos na Responses API.

O baseline usa Responses API, formato estruturado estrito, \`store: false\`, arquivos somente após seleção explícita e chave no servidor local.

## Brasil — privacidade

- [Lei nº 13.709/2018 — LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).
- [ANPD — Relatório de Impacto à Proteção de Dados Pessoais](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd).
- [ANPD — Regulamento de Comunicação de Incidente de Segurança](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca).
- [ANPD — Guia de segurança da informação](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte).

A ANPD recomenda elaborar o RIPD antes de iniciar tratamento que possa gerar alto risco. O regulamento de incidentes prevê comunicação pelo controlador em três dias úteis quando houver risco ou dano relevante e manutenção do registro por ao menos cinco anos; a equipe jurídica deve verificar a regra vigente e normas setoriais no evento concreto.

## Brasil — registro eletrônico em saúde

- [CFM — Resolução nº 1.821/2007](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2007/1821).
- [CFM — Resolução nº 2.314/2022](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2022/2314).

Essas normas ajudam a delimitar requisitos quando um produto passa a guardar registro oficial ou integra fluxos de S-RES/telemedicina. O Passagem UTI local permanece apresentado como apoio à comunicação, não como prontuário certificado.

## Regra de atualização

Revalidar estas fontes antes de cada piloto, release online, mudança de provedor/modelo ou expansão de finalidade. Registrar a data e a decisão no \`DECISION_LOG.md\`.
