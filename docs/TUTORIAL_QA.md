# QA do tutorial ilustrado v5

**Artefatos auditados:** `tutorial.html` e `tutorial.css`  
**Estado:** aprovado no arquivo local; versões WebP otimizadas foram adicionadas à allowlist explícita de `server.mjs`  
**Dados:** somente exemplos sintéticos  
**PDF final:** `output/pdf/Tutorial_Ilustrado_Passagem_UTI_v5.pdf`

## Resultado executivo

O tutorial v4 foi substituído por um manual v5 autossuficiente, em português brasileiro, com hierarquia Turbo TEMI Premium e leitura de baixa fricção. A trilha básica começa com um mapa de 60 segundos e avança da instalação à transferência do plantão.

O texto separa de forma visível:

- **LOCAL AGORA:** um navegador/perfil, persistência local, plantonista vigente no dispositivo, coordenação local e Cápsula UTI manual.
- **ONLINE FUTURO:** autenticação, RBAC, multi-tenancy, auditoria institucional, cápsula viva, sincronização e intervenção remota ainda não implementadas.

## Cobertura funcional conferida

- [x] mapa operacional de 60 segundos;
- [x] instalação no macOS com Node.js 20 ou superior;
- [x] chave em pasta privada e arquivo `.env` oculto;
- [x] rotação obrigatória da chave que circulou no ZIP;
- [x] perfil vigente com nome, especialidade, CRM, RQE, papel, modo, entrada e saída;
- [x] assumir, transferir e encerrar o plantão local;
- [x] tempo informativo sem associação a desempenho;
- [x] dez baterias L1–L10 e distinção entre completude e gravidade;
- [x] dez linhas clínicas na ordem fixa do produto;
- [x] texto, PDF, imagem, documentos e limites por análise;
- [x] checklist editável, sugestões da IA, timeline e atividades do leito;
- [x] read-back e invalidação após alteração/importação;
- [x] oportunidades/equidade sem ranking ou placar;
- [x] nota e tarefa do coordenador com autoria local;
- [x] Central, Radar, ações rápidas, Modo Turbo e temas claro/escuro/sistema;
- [x] TXT, Markdown, impressão/PDF e WhatsApp com confirmação;
- [x] Cápsula UTI de leito/plantão, extensão e limite de 4 MiB;
- [x] importação por Mesclar ou Substituir, com efeitos sobre anexos;
- [x] proibição de chave, anexos e dados clínicos em GitHub, Notion, Drive e iCloud;
- [x] privacidade/LGPD, limites clínicos e gates para piloto;
- [x] solução de problemas e checklist final.

## Validações executadas

### HTML e segurança de conteúdo

Comando:

```bash
/tmp/passagem-htmlvalidate/node_modules/.bin/html-validate tutorial.html
```

Resultado: **0 erros e 0 avisos**.

Verificações adicionais:

- [x] nenhum `style=` inline;
- [x] nenhum script inline;
- [x] nenhum `onclick` ou URL `javascript:`;
- [x] nenhum link interno apontando para ID ausente;
- [x] nenhum resquício de título/link v4;
- [x] nenhum valor de chave ou padrão de segredo no tutorial;
- [x] chaves e dados clínicos reais não foram usados em exemplos.

### Renderização e acessibilidade automatizada

O tutorial foi aberto diretamente pelo Chromium headless com Puppeteer e analisado com axe-core.

| Verificação | Resultado |
|---|---:|
| Seções principais | 16 |
| Itens de solução de problemas | 8 |
| Imagens locais carregadas | 4 de 4 |
| Overflow horizontal em 1440 px | não |
| Overflow horizontal em 390 px | não |
| Estilos inline | 0 |
| Scripts inline | 0 |
| Erros do navegador | 0 |
| Violações axe-core | 0 |

As imagens conferidas foram:

- `assets/logo-passagem-uti-aero.png`;
- `assets/tutorial/cockpit-plantonista-v5.webp`;
- `assets/tutorial/central-coordenador-v5.webp`;
- `assets/tutorial/capsula-uti-v5.webp`.

As três imagens de produto aparecem sempre com legenda **CONCEITO**, informando que não são capturas do aplicativo em execução.

### Responsividade e impressão

- [x] desktop 1440 × 1000 sem overflow horizontal;
- [x] mobile 390 × 844 sem overflow horizontal;
- [x] cabeçalho reduzido no mobile;
- [x] grades colapsam para uma ou duas colunas conforme a largura;
- [x] foco visível e link “Pular para o conteúdo”;
- [x] `prefers-reduced-motion` respeitado;
- [x] CSS de impressão com `@page` A4 e contraste claro;
- [x] teste temporário de impressão renderizado pelo Chromium;
- [x] PDF temporário permaneceu fora do repositório.

O PDF definitivo foi gerado pelo Chromium em A4, com 17 páginas, PDF marcado, sem JavaScript e aproximadamente 2,9 MB. Todas as páginas foram renderizadas em PNG e inspecionadas em três folhas de contato. Uma primeira passagem revelou o link de salto repetido e títulos órfãos; o CSS de impressão foi corrigido e o PDF foi regenerado. A segunda inspeção confirmou ausência desses defeitos, sem páginas vazias, imagens deformadas, cortes materiais ou texto sobreposto.

## Integração HTTP

O servidor usa uma allowlist explícita. As versões de distribuição adicionadas a `PUBLIC_PATHS` são:

```text
/assets/tutorial/cockpit-plantonista-v5.webp
/assets/tutorial/central-coordenador-v5.webp
/assets/tutorial/capsula-uti-v5.webp
```

Checagem final executada:

1. [x] iniciar servidor local isolado;
2. [x] abrir `/tutorial.html` e confirmar HTTP 200;
3. [x] confirmar as quatro imagens carregadas;
4. [x] repetir axe-core e responsividade;
5. [x] gerar o PDF A4 definitivo;
6. [x] inspecionar as 17 páginas e corrigir órfãs/repetições;
7. [x] preservar os PNG de origem como conceitos e distribuir WebP otimizados no tutorial.

## Critério de aceite final

O tutorial estará pronto para o pacote de release quando:

- as três imagens conceituais responderem HTTP 200;
- não houver erro no console, overflow, link quebrado ou violação axe;
- o PDF final for inspecionado página a página;
- todos os exemplos permanecerem sintéticos;
- a versão distribuída não contiver `.env`, chave, Cápsula clínica ou anexos reais.

## Checkpoint Turbo TEMI

`VERSÃO v5 RC | HTML + CSS + PDF PRODUZIDOS | HTTP/HTML/AXE/RESPONSIVO/IMPRESSÃO VALIDADOS | WEBP/ALLOWLIST INTEGRADOS | 17/17 PÁGINAS INSPECIONADAS | FONTE CANÔNICA: tutorial.html`
