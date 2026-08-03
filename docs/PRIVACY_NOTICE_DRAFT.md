# Passagem UTI — Aviso de Privacidade

> **RASCUNHO — NÃO É PARECER JURÍDICO.** Este texto é um modelo para revisão do controlador, do encarregado e da assessoria jurídica. Não publicar nem usar com dados reais antes de preencher, validar e aprovar todos os campos.

**Versão:** __________  
**Vigência:** ____/____/________  
**Controlador:** [NOME LEGAL DA ORGANIZAÇÃO]  
**CNPJ:** [CNPJ]  
**Endereço:** [ENDEREÇO]  
**Encarregado/DPO:** [NOME OU FUNÇÃO]  
**Contato de privacidade:** [E-MAIL/CANAL]  

## 1. A quem e a que este aviso se aplica

Este aviso descreve como [CONTROLADOR] trata dados pessoais no uso autorizado do Passagem UTI por pacientes, profissionais e demais titulares relacionados à continuidade assistencial.

Existem duas fronteiras que não devem ser confundidas:

- **ATUAL — LOCAL:** o repositório contém uma aplicação local, com dados mantidos no navegador/IndexedDB e uso de servidor local para a API. Ela não possui contas institucionais, multi-tenancy, sincronização, RBAC ou auditoria central.
- **FUTURO — ONLINE V5:** é uma proposta de produto com identidade, organizações, unidades, armazenamento, colaboração e auditoria. Este aviso só passa a valer para esse ambiente após implementação, homologação e publicação formal pelo controlador.

O piloto inicial é restrito a dados sintéticos. Nenhum texto deste aviso autoriza o uso de dados reais antes dos gates clínicos, jurídicos, de privacidade e segurança.

## 2. Quais dados podemos tratar

Conforme a configuração aprovada pela instituição, poderemos tratar:

- dados de identificação e contexto assistencial, como [EXEMPLOS APROVADOS];
- dados de saúde necessários à passagem, incluindo [EXEMPLOS MÍNIMOS];
- textos, imagens, PDFs e documentos deliberadamente enviados por usuário autorizado;
- nome, CRM, função, unidade e registros de autoria dos profissionais;
- eventos de segurança e auditoria, como acesso, ação, data, hora e dispositivo;
- telemetria técnica minimizada, como versão, latência e tipo de erro, sem conteúdo clínico por padrão.

**Dados excluídos por política:** [LISTAR O QUE NÃO DEVE SER INSERIDO]  
**Campos obrigatórios:** [LISTAR]  
**Campos opcionais:** [LISTAR]

Dados de saúde são dados pessoais sensíveis. Coletamos apenas o necessário para finalidades definidas e aprovadas.

## 3. Para que usamos os dados

| Finalidade | Categorias mínimas | Responsável pela aprovação |
|---|---|---|
| Preparar, atualizar e receber passagem de plantão | __________________ | __________________ |
| Registrar pendências, read-back e mudanças materiais | __________________ | __________________ |
| Manter segurança, disponibilidade e auditoria | __________________ | __________________ |
| Atender direitos e obrigações aplicáveis | __________________ | __________________ |
| Produzir métricas agregadas de qualidade e oportunidade | __________________ | __________________ |
| Outra finalidade específica | __________________ | __________________ |

Não usamos dados clínicos para publicidade, venda de dados, perfil comercial ou treinamento de modelos sem uma avaliação, base legal e comunicação próprias.

As métricas são **não punitivas**: não criam ranking nominal e não devem ser usadas automaticamente para remuneração, demissão, sanção ou escala de profissionais.

## 4. Base legal

[CONTROLADOR] registra a base legal aplicável a cada finalidade e às categorias de dados pessoais e sensíveis. Dependendo do contexto, podem ser avaliadas hipóteses legais relacionadas a tutela da saúde, proteção da vida, cumprimento de obrigação legal/regulatória ou exercício regular de direitos.

**Matriz/base legal aprovada:** [LINK INTERNO HOMOLOGADO OU REFERÊNCIA DO REGISTRO]  
**Decisão e data:** ________________________________

Não tratamos consentimento genérico como autorização padrão para atividade assistencial. Quando o consentimento for realmente aplicável, ele será específico, informado, demonstrável e revogável nos termos legais.

## 5. Uso de inteligência artificial

O Passagem UTI pode usar um provedor de IA aprovado para organizar conteúdo selecionado em dez tópicos de passagem.

- A IA é ferramenta de apoio e pode errar, omitir ou interpretar incorretamente.
- Ela não substitui prontuário, monitorização, prescrição, diagnóstico ou julgamento profissional.
- Um profissional autorizado deve revisar e editar a saída antes da publicação.
- Enviamos apenas o conteúdo necessário e autorizado para a finalidade.
- Informaremos o provedor, a região, a retenção e o uso para treinamento após definição contratual.

**Provedor/suboperador:** [NOME]  
**Região de tratamento:** [REGIÃO]  
**Retenção pelo provedor:** [PRAZO/POLÍTICA]  
**Uso para treinamento:** [SIM/NÃO E FUNDAMENTO]  
**Contato/documentação:** [LINK APROVADO]

## 6. Com quem compartilhamos

Podemos compartilhar dados, no limite necessário, com:

| Destinatário | Papel | Finalidade | Local/região | Evidência contratual |
|---|---|---|---|---|
| [FORNECEDOR DO PRODUTO] | __________ | __________ | __________ | __________ |
| [PROVEDOR DE NUVEM] | __________ | __________ | __________ | __________ |
| [PROVEDOR DE IA] | __________ | __________ | __________ | __________ |
| [OUTRO HOMOLOGADO] | __________ | __________ | __________ | __________ |

Não tornamos o conteúdo clínico público. Exigimos controles e instruções compatíveis dos fornecedores aprovados.

## 7. Onde os dados não podem ser armazenados

É proibido copiar conteúdo clínico, dado identificável, exportação de produção, captura de tela sensível, log clínico, token, senha ou chave de API para GitHub, Notion, Google Drive, iCloud ou qualquer ferramenta pessoal/não homologada.

Esses serviços só podem receber documentação não clínica, dados sintéticos ou agregados formalmente aprovados. Segredos ficam em gerenciador de segredos institucional.

## 8. Transferência internacional

**Há transferência internacional?** ☐ Não ☐ Sim  
**País/região:** ________________________________  
**Destinatário:** ________________________________  
**Mecanismo e salvaguardas aprovados:** ________________________________

Qualquer mudança relevante será avaliada antes de ativada e refletida neste aviso quando necessário.

## 9. Por quanto tempo guardamos

| Categoria | Prazo/critério | Motivo | Descarte |
|---|---|---|---|
| Cápsulas e conteúdo | __________ | __________ | __________ |
| Anexos | __________ | __________ | __________ |
| Auditoria | __________ | __________ | __________ |
| Sessão/convite | __________ | __________ | __________ |
| Telemetria | __________ | __________ | __________ |
| Backup | __________ | __________ | __________ |

Após o prazo aplicável, os dados serão eliminados, anonimizados ou preservados apenas quando houver obrigação ou exercício regular de direitos documentado.

## 10. Segurança e resposta a incidentes

Aplicamos controles proporcionais ao risco, tais como menor privilégio, MFA, criptografia, isolamento entre organizações, gestão de segredos, logs, backups e testes. Nenhum sistema elimina completamente os riscos.

**Canal para suspeita de incidente:** [CANAL]  
**Disponibilidade do canal:** [HORÁRIO/SLA]

Quando exigido, [CONTROLADOR] avaliará e comunicará incidentes aos titulares e à ANPD conforme as regras vigentes.

## 11. Seus direitos

Nos termos aplicáveis, o titular pode solicitar informações e exercer direitos como confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação quando cabível, portabilidade, informação sobre compartilhamento, oposição e revisão de decisões automatizadas.

**Canal:** [URL/E-MAIL/TELEFONE]  
**Como confirmar identidade:** [PROCEDIMENTO]  
**Prazo interno de atendimento:** [PRAZO]  
**Canal alternativo:** [CANAL]

Alguns pedidos podem exigir preservação de registros por obrigação legal, regulatória, segurança do paciente ou exercício regular de direitos. Explicaremos a decisão aplicável.

## 12. Cookies, notificações e telemetria

| Recurso | Uso | Conteúdo clínico? | Controle do usuário |
|---|---|---|---|
| Cookie/sessão essencial | __________ | Não por padrão | __________ |
| Telemetria técnica | __________ | Não por padrão | __________ |
| Notificação | Pendência/mudança | Não exibir em tela bloqueada por padrão | __________ |
| Outro | __________ | __________ | __________ |

Notificações devem ser discretas e não revelar nome, diagnóstico ou conduta em telas bloqueadas.

## 13. Atualizações deste aviso

Podemos atualizar o aviso por mudança legal, técnica ou operacional. A versão, a data e as alterações materiais serão informadas por [CANAL].

**Histórico de versões:** [LINK/LOCAL HOMOLOGADO]  
**Última alteração material:** ________________________________

## 14. Contato

**Controlador:** [NOME]  
**Encarregado/DPO:** [NOME OU FUNÇÃO]  
**E-mail:** [E-MAIL]  
**Endereço:** [ENDEREÇO]  
**Canal de suporte:** [CANAL]

## 15. Referências oficiais e documentos relacionados

- [Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD — Guia orientativo para definições dos agentes de tratamento e do encarregado](https://www.gov.br/anpd/pt-br/assuntos/noticias/nova-versao-do-guia-dos-agentes-de-tratamento)
- [ANPD — Regulamento de Comunicação de Incidente de Segurança](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca)
- Projeto: [LGPD_PRIVACY.md](LGPD_PRIVACY.md) e [RIPD_TEMPLATE.md](RIPD_TEMPLATE.md).

