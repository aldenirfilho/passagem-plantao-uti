# Como reproduzir o QA de navegador

O fluxo documentado em [QA_REPORT_V5.md](QA_REPORT_V5.md) possui um runner rastreável e totalmente sintético.

## Preparação

```bash
npm ci
```

As três dependências de desenvolvimento estão pinadas em `package.json` e `package-lock.json`: Chromium serverless, Puppeteer Core e axe-core. Nenhuma dependência é usada pelo servidor de produção local. Use `npm install` apenas ao atualizar deliberadamente o lockfile.

## Executar

```bash
npm test
npm run test:e2e
```

O segundo comando:

- inicia o servidor em loopback e porta aleatória;
- usa uma chave sintética e intercepta `/api/render`, portanto não chama a OpenAI;
- cria dois leitos e identidades claramente fictícios;
- testa continuidade, dez linhas, atividades, coordenação, WhatsApp cancelado e impressão;
- executa axe em oportunidades, tema escuro, transferência, mobile e tutorial;
- valida overflow, console, imagens, âncoras e PDF temporário;
- remove o diretório temporário ao terminar.

O processo retorna código diferente de zero se qualquer assert falhar. Capturas oficiais da RC permanecem em `docs/assets/screenshots/` e usam somente dados sintéticos.
