# Passagem UTI

Aplicativo local-first para transformar material clínico bruto em uma passagem de plantão estruturada para uma UTI adulta com dez leitos.

## O que a versão 3 entrega

- **10 baterias assistenciais:** L1 a L10 mostram o percentual de preparo de cada leito.
- **10 tópicos fixos:** o GPT organiza somente os fatos fornecidos e sinaliza dados ausentes.
- **Cofre local por leito:** PDFs, imagens, textos e documentos ficam no navegador usando IndexedDB.
- **Checklist editável:** pendências com prioridade, prazo/gatilho e status de conclusão.
- **Cabeçalho do plantão:** ID, nome, CRM, cidade, hospital, UTI, turno e data.
- **Saídas rápidas:** copiar um leito, copiar o plantão inteiro, imprimir e exportar JSON.
- **Chave protegida:** a chave da OpenAI fica no serviço local e nunca é enviada ao JavaScript do navegador.

### Cinco ferramentas novas para o plantonista

1. **Radar operacional:** reúne os leitos com dados e ordena por estado informado, alertas, lacunas e pendências — sem inferir deterioração clínica.
2. **Linha do tempo:** registra intercorrências, exames, condutas, procedimentos e contatos com data/hora; os eventos entram na próxima renderização.
3. **Read-back:** o médico receptor revisa as 10 linhas, alertas e pendências, informa nome/CRM e confirma o recebimento. Qualquer alteração posterior invalida o aceite.
4. **Ações rápidas (`⌘/Ctrl + K`):** troca de leito, cópia, arquivos, checklist, pendência alta, estado crítico e outras ações com poucos cliques.
5. **Modo Turbo:** renderiza os leitos com material em uma fila de até três requisições simultâneas, ignora entradas já processadas e permite cancelamento.

O modo Turbo reutiliza a mesma `OPENAI_API_KEY`; nenhuma segunda chave é necessária. Como cada leito novo pode gerar uma chamada cobrada pela API, o aplicativo mostra uma confirmação antes de iniciar o lote.

## Iniciar no Mac

Requisitos: macOS e Node.js 20 ou mais recente.

1. Descompacte o pacote da chave dentro de `Documentos`. O arquivo deve terminar neste caminho:

   ```text
   ~/Documents/API KEY/passagem-plantao-uti/.env
   ```

2. No Terminal, entre na pasta do aplicativo e execute:

   ```bash
   npm start
   ```

3. Abra [http://127.0.0.1:4173](http://127.0.0.1:4173).

Como alternativa, dê permissão de execução uma única vez e depois use o iniciador do Mac:

```bash
chmod +x start-mac.command
./start-mac.command
```

## Fluxo recomendado

1. Preencha a identificação do plantonista no topo.
2. Selecione uma bateria/leito.
3. Informe paciente e contexto; cole a evolução na seção **Renderizar**.
4. Adicione exames e imagens na seção **Exames & arquivos**.
5. Marque quais anexos entrarão na análise.
6. Clique em **Renderizar em 10 tópicos**.
7. Revise cada linha e aceite somente as sugestões de checklist que realmente se aplicam.
8. Registre atualizações na linha do tempo durante o turno.
9. Peça ao médico receptor para completar o read-back.
10. Copie ou imprima a passagem.

## Segurança clínica e privacidade

- A ferramenta é apoio à comunicação; não substitui prontuário, prescrição, avaliação à beira-leito ou julgamento médico.
- A saída deve ser revisada pelo médico antes da transmissão.
- O aplicativo não inventa deliberadamente dados: campos ausentes devem aparecer como `NÃO INFORMADO`.
- A classificação de estado produzida pela IA aparece somente como sugestão; ela não altera o estado definido pelo médico.
- Sugestões de checklist ficam inativas até um médico aceitá-las.
- Uma resposta da API é descartada se o conteúdo do leito mudar enquanto a análise estiver em andamento.
- Nenhum anexo é enviado ao GPT até o usuário clicar em **Renderizar**.
- Confirme a política institucional e as bases legais aplicáveis antes de usar dados identificáveis de pacientes.
- Não publique `.env`, chaves, exportações clínicas ou anexos no GitHub.

## Desenvolvimento

Não há dependências de produção. O servidor usa apenas APIs nativas do Node.js.

```bash
npm test
npm start
```

Variáveis opcionais:

| Variável | Finalidade | Padrão |
|---|---|---|
| `OPENAI_API_KEY` | Credencial da API | Lida também do cofre em Documentos |
| `OPENAI_ENV_FILE` | Caminho alternativo para o `.env` | Vazio |
| `OPENAI_MODEL` | Modelo da Responses API | `gpt-5.6` |
| `PORT` | Porta do serviço local | `4173` |
| `HOST` | Interface de rede | `127.0.0.1` |

## Arquitetura

- `index.html`, `styles.css`, `app.js`: interface responsiva, cinco ferramentas operacionais e persistência local.
- `assets/`: logotipo e ícones do aplicativo.
- `server.mjs`: servidor local, leitura segura da chave e integração com a Responses API.
- `tests/server.test.mjs`: contrato de dez tópicos, request multimodal e health check.

O backend usa Structured Outputs com JSON Schema estrito e envia arquivos diretamente como entradas multimodais da Responses API. O campo `store` é definido como `false` nas requisições do aplicativo.
