# Passagem UTI v5.2

Aplicativo PWA para passagem de plantão em UTI adulta, com 10 leitos, funcionamento online e local-first, além de exportação estruturada em PDF.

## Recursos

- PWA responsivo para Mac, iPhone e iPad.
- Modo Turbo Local sem nova API.
- Armazenamento local no navegador.
- Passagem estruturada em 10 tópicos por leito.
- PDF padrão e completo por leito.
- PDF padrão e completo dos 10 leitos.
- Exportação TXT, Markdown, WhatsApp e Cápsula UTI.
- Radar, checklist, timeline e read-back.

## Publicação no GitHub Pages

O workflow extrai automaticamente o pacote localizado em `release/passagem-uti-v5.2-pages.zip` e publica seu conteúdo no GitHub Pages.

Após mesclar a branch de release em `main`, abra **Settings → Pages** e escolha **GitHub Actions** como fonte de publicação.

URL esperada:

`https://aldenirfilho.github.io/passagem-plantao-uti/`

## Segurança

Nunca adicione dados clínicos, chaves de API, arquivos `.env` ou documentos de pacientes ao repositório. O código pode ser público, mas o conteúdo assistencial deve permanecer no navegador autorizado.

Esta aplicação não substitui prontuário eletrônico, julgamento médico ou read-back verbal. O uso com dados reais requer validação institucional, governança, segurança e adequação à LGPD.
