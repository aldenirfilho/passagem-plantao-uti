# Passagem UTI v5.2 - publicação online HTTPS

Esta pasta é a versão pública estática do aplicativo. Ela funciona por HTTPS em iPhone, iPad e computador, sem API e sem servidor clínico.

## O que permanece local

- dados dos leitos;
- anexos adicionados ao cofre;
- checklist, timeline, read-back e notificações;
- PDFs preparados pelo navegador.

A hospedagem entrega apenas HTML, CSS, JavaScript, imagens e o PWA. Ela não sincroniza pacientes entre dispositivos e não envia dados para a hospedagem.

## Implantação mais simples

1. Compacte ou selecione todo o conteúdo desta pasta.
2. Envie a pasta para Vercel Drop, Netlify Drop ou Cloudflare Pages Direct Upload.
3. Abra a URL HTTPS criada.
4. No iPhone, Safari > Compartilhar > Adicionar à Tela de Início.

## PDF dentro do aplicativo

Central Exportar > escolha um dos quatro modelos:

- Leito - PDF padrão;
- Leito - PDF completo;
- 10 leitos - PDF padrão;
- 10 leitos - PDF completo.

No diálogo do navegador escolha Salvar como PDF. No iPhone, use Imprimir, amplie a prévia com dois dedos e depois Compartilhar > Salvar em Arquivos.

## Segurança

- Não há `.env`, chave API, servidor Node, testes ou dados clínicos nesta pasta.
- `robots.txt` solicita que buscadores não indexem o site.
- Os arquivos de configuração adicionam cabeçalhos de segurança quando a plataforma os suporta.
- Para pacientes reais, use domínio privado/institucional, controle de acesso, política LGPD, validação clínica e governança local.
