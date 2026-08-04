# NEXUS CARE · UTI

PWA local-first para continuidade assistencial e passagem de plantão em UTI adulta, com 10 leitos, Turbo Local sem API e PDFs estruturados.

## Marca pública

- Nome: **NEXUS CARE**
- Descrição: **Continuidade Assistencial em UTI**
- Endereço neutro planejado: `https://nexus-care-uti.vercel.app`
- Endereço de contingência: `https://aldenirfilho.github.io/passagem-plantao-uti/`

## Publicação

- Fonte estática: `public/`
- Build de marca: `npm run build`
- Saída publicada: `dist/`
- GitHub Pages: `.github/workflows/pages.yml`
- Vercel: `vercel.json`

## PDFs

- Leito ativo, versão padrão
- Leito ativo, versão completa
- 10 leitos, versão padrão
- 10 leitos, versão completa

## Compatibilidade de dados

Os identificadores internos de armazenamento e da Cápsula UTI foram preservados para evitar perda de dados ou quebra de compatibilidade após a mudança de marca.

## Segurança

Não incluir dados de pacientes, chaves, `.env` ou documentos clínicos no repositório. Uso assistencial real depende de validação institucional, LGPD e governança clínica.
