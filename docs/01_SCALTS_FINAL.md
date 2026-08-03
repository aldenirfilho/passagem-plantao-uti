# SCALTS final — Passagem UTI v5 RC1

**Data:** 03/08/2026  
**Versão:** `5.0.0-rc.1`  
**Checkpoint:** candidato técnico local-first, exclusivamente sintético

## S — Situação

O projeto transforma uma passagem de plantão de UTI adulta em dez leitos, dez linhas estruturadas, execução local, transferência controlada e continuidade de responsabilidade. O build atual funciona em um dispositivo/navegador. A colaboração online multiusuário permanece arquitetura futura.

O arquivo ZIP recebido continha credencial e metadados, não o código do aplicativo. Ele foi mantido fora do repositório, dos espelhos e da release. A credencial deve ser rotacionada antes de piloto ou produção.

## C — Cobertura

Coberto e implementado localmente:

- 10 baterias L1–L10 e 10 linhas fixas por leito;
- texto, PDF, imagem e documentos como entrada selecionada;
- IA via servidor local, schema estrito e `store: false`;
- anexos no IndexedDB, checklist, timeline, read-back, Radar e Central;
- plantonista vigente, papéis, modos oficial/ad hoc, transferência e encerramento;
- atividades manuais e oportunidades sem velocidade, ranking ou placar;
- coordenação local com nota/tarefa auditada;
- TXT, Markdown, impressão/Salvar em PDF e WhatsApp confirmado;
- Cápsula UTI versionada, validada, mesclável/substituível e sem anexos/segredos;
- temas claro/escuro/sistema, interface responsiva e tutorial ilustrado;
- documentação de produto, negócio, arquitetura, segurança clínica, LGPD, RIPD, ameaça, piloto, métricas e lançamento.

Planejado, não implementado:

- autenticação institucional, MFA, organizações, multi-tenancy e RBAC central;
- sincronização em tempo real, resolução de conflitos e auditoria imutável;
- anexos em nuvem, backup/restore institucional e painel remoto;
- integrações com prontuário, mensageria ou produção.

## A — Aprendizagem e validação

Este é um produto de software, não uma sessão de estudo. Portanto, rendimento C0–C4, acurácia do aluno, confiança e perfil metacognitivo são **não aplicáveis**; nenhum domínio do usuário foi inferido.

Validação observável do artefato:

- 63/63 testes Node aprovados;
- fluxo real no Chromium com dois leitos sintéticos e 10/10 linhas;
- zero erros de console;
- zero violações axe nos seis estados automatizados avaliados;
- impressão com dois leitos, DOM seguro e limpeza após `afterprint`;
- tutorial com 16 seções, quatro imagens carregadas e zero links internos ausentes;
- PDF A4 com 17/17 páginas inspecionadas.

## L — Lacunas

Bloqueios antes de qualquer uso com paciente real:

- rotacionar a chave exposta no ZIP;
- concluir safety case, RIPD/RoPA, base legal, contratos, retenção e avaliação regulatória;
- realizar teste independente de segurança, privacidade, fatores humanos e validação clínica;
- definir controlador/operador, DPO, incidentes, suporte, SLA e rollback;
- implementar e provar identidade, autorização, isolamento e auditoria da versão online;
- escolher licença e revisar marca/propriedade intelectual antes de monetização.

Apple Notes/iCloud não possuem conector gravável disponível nesta sessão; foi produzido um guia de organização manual sem dados clínicos nem segredos.

## T — Trajetória

| Marco | Ação |
|---|---|
| D0 | publicar RC1 em PR draft, Drive/Notion/Library e entregar pacote seguro |
| D1 | revisar feedback técnico e repetir suíte/varredura de segredos |
| D7 | executar piloto sintético com perfis Plantonista/Coordenador/Diarista |
| D14 | fechar perigos, usabilidade, métricas não punitivas e decisões de arquitetura |
| D30 | decidir go/no-go para homologação institucional; dados reais continuam bloqueados sem gates |

## S — Saídas

### Produzido e validado

- aplicativo local v5 RC1;
- tutorial HTML e PDF ilustrado;
- 3 conceitos visuais 16:9 e 5 capturas reais sintéticas;
- logotipo aeroespacial e ativos de marca;
- 30 documentos Markdown/YAML em `docs/`, além do README;
- suíte com 63 testes e runner E2E/axe reproduzível;
- gerador de release sanitizada e checksum.

### Inventário visual

- `CARD-D`: 2 conceitos de cockpit/painel;
- `CARD-M`: 1 ecossistema da Cápsula + 1 marca;
- `SCREEN-QA`: 5 capturas reais verificadas;
- total final: 9 peças visuais principais, além das versões WebP de distribuição.

### Arquivamento

- GitHub: publicação na branch/PR draft pendente do commit final;
- Google Drive: estrutura criada; lote final pendente;
- Notion: página de produto pendente;
- ChatGPT Library: pasta criada; lote final pendente;
- Notes/iCloud: importação manual pendente por indisponibilidade de conector gravável;
- credencial e material clínico: deliberadamente não arquivados.

## Veredito SCALTS

**RC1 tecnicamente demonstrável com dados sintéticos. Instável/incompleta para produção clínica e colaboração online. Próxima órbita: governança institucional + piloto sintético independente.**
