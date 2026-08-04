# Cápsula UTI — especificação do formato v1

Status: estável para importação/exportação local no Passagem UTI v5.

A **Cápsula UTI** é um arquivo JSON portátil para transferir um leito ou um plantão com dez leitos entre instalações locais do aplicativo. A extensão obrigatória é `.capsula-uti.json`.

Ela não é prontuário, assinatura digital, integração hospitalar ou colaboração on-line. A transferência só acontece quando o usuário exporta o arquivo e o importa explicitamente em outra instalação.

## Contrato superior

```json
{
  "schema": "br.med.passagem-uti/capsula",
  "schemaVersion": 1,
  "appVersion": 5,
  "exportedAt": "2026-08-03T18:00:00.000Z",
  "mode": "bed",
  "data": {
    "settings": {
      "staffId": "",
      "doctorName": "",
      "crm": "",
      "city": "",
      "hospital": "",
      "unit": "UTI 1",
      "shift": "DIURNO",
      "date": "2026-08-03",
      "theme": "system",
      "specialty": "",
      "rqe": "",
      "role": "PLANTONISTA",
      "careMode": "AD_HOC"
    },
    "activeBedId": "L1",
    "beds": [],
    "continuity": {
      "activeShift": null,
      "sessions": [],
      "auditLog": []
    }
  }
}
```

`mode` aceita:

- `bed`: exatamente um leito; `activeBedId` deve ser o ID desse leito.
- `shift`: exatamente dez leitos, contendo `L1` a `L10` uma única vez.

Uma Cápsula `bed` sempre usa `continuity` vazio. Ela não pode carregar plantonista vigente, sessões, auditoria global ou qualquer detalhe de outro leito. Uma Cápsula `shift` pode transportar uma fotografia limitada de continuidade para leitura do arquivo, mas essa informação nunca é ativada nem tratada como autoria confiável durante a importação.

Cada leito carrega identificação, estado definido pelo médico, texto clínico, exatamente dez linhas ordenadas, checklist, linha do tempo, alertas e lacunas. Os rótulos das dez linhas são reconstruídos pelo aplicativo a partir do contrato interno; o texto importado não altera a ordem clínica.

Cada item de checklist contém `source`, com um dos valores `manual`, `ai` ou `coordination`. Uma sugestão gerada pela IA nasce com `source: "ai"`; aceitá-la ou editá-la muda seu estado operacional, mas não apaga essa proveniência. Alertas e lacunas também permanecem explicitamente rotulados como sinalizações da IA que exigem revisão médica.

## O que nunca entra na Cápsula

- chave da API ou conteúdo de `.env`;
- anexos binários, fotos, PDFs ou documentos do cofre local;
- notificações locais;
- scripts, HTML executável ou código de aplicação;
- credenciais, tokens ou dados do servidor.

O arquivo pode conter dados clínicos sensíveis em texto. O usuário deve revisar, desidentificar, armazenar e transmitir de acordo com a LGPD e a política institucional.

## Validação defensiva

- Tamanho máximo: **4 MiB**. O exportador valida a própria estrutura e o tamanho do JSON formatado antes de iniciar o download; o importador repete o limite antes da análise.
- Somente JSON analisado com `JSON.parse`; não são usados `eval`, importação de módulo, HTML dinâmico ou execução de conteúdo.
- `schema` e `schemaVersion` precisam corresponder exatamente à versão suportada.
- Campos desconhecidos na raiz e em `data` são rejeitados.
- Tipos, comprimentos, datas, enums, quantidades e ordem das dez linhas são validados.
- IDs de leito aceitos: `L1` a `L10`; duplicatas são rejeitadas.
- Texto clínico: até 120.000 caracteres por leito.
- Linha de passagem: até 20.000 caracteres por tópico.
- Checklist: até 200 itens por leito.
- Linha do tempo: até 500 eventos por leito.
- Alertas e lacunas: até 50 itens de cada tipo por leito.
- Aceites de read-back importados são invalidados. Nome e CRM do receptor podem ser preservados, mas a confirmação precisa ser refeita.
- Um novo read-back e qualquer saída clínica (copiar, TXT, Markdown, WhatsApp, PDF ou Cápsula) exigem **dois identificadores**: nome do paciente e prontuário/ID. Idade e data de admissão não substituem o identificador institucional.
- O `renderFingerprint` não é aceito como cache confiável e é reiniciado após a importação.
- Antes de habilitar a importação, a interface mostra modo, hospital, UTI, data e uma lista minimizada dos leitos. Nome aparece apenas por iniciais e o prontuário/ID apenas pelos quatro caracteres finais.
- A validação estrutural não autentica o arquivo: a prévia o declara **não assinado e não verificado**.

## Identidade, autoria e continuidade

Quando existe `continuity.activeShift`, esse perfil vigente é a fonte única de identidade para TXT, Markdown, WhatsApp, PDF, Cápsula e novos registros de linha do tempo, atividade ou coordenação. `settings` é usado somente como fallback quando nenhum plantonista está vigente.

Todos esses perfis são autodeclarados localmente. O aplicativo não verifica identidade, CRM, RQE, vínculo, papel de Coordenador nem autorização institucional.

Nenhuma importação transfere responsabilidade profissional. Tanto em `merge` quanto em `replace`, `activeShift` termina como `null` e uma nova assunção explícita é obrigatória. Continuidade e auditoria recebidas do arquivo nunca são ativadas. O único evento novo de importação é `CAPSULE_IMPORTED`, criado localmente com o ator capturado no dispositivo antes da importação.

Autores recebidos dentro de checklist, linha do tempo ou coordenação aparecem como **“Importado · não verificado”**. O app bloqueia novos eventos e atividades até que um profissional assuma explicitamente o plantão local. Uma sugestão aceita da IA continua exibindo **“ORIGEM IA”**; aceite operacional não converte proveniência em autoria humana.

## Estratégias de importação

### Mesclar

Substitui integralmente somente os leitos presentes na Cápsula. **Todos os anexos locais associados aos leitos importados são removidos**, evitando que exames de um paciente anterior permaneçam ligados ao novo conteúdo. Os outros leitos, seus anexos, as configurações e as notificações locais são preservados.

Em Cápsulas `bed` e `shift`, o cabeçalho global atual não é sobrescrito. Hospital, UTI e data são comparados; se os dois lados informarem valores diferentes, a mesclagem é bloqueada. As sessões encerradas e a auditoria históricas locais são preservadas, a vigência local é encerrada e toda continuidade recebida é descartada.

### Substituir

Cria um novo estado clínico local a partir da Cápsula. Os demais leitos, notificações e todos os anexos do plantão local anterior são apagados. Hospital, UTI, cidade, data e turno vêm do arquivo; identidade profissional autodeclarada e preferência de tema permanecem locais. Vigência, sessões e auditoria do arquivo são descartadas. A gravação do novo estado e a limpeza dos anexos ocorrem na mesma transação local.

As duas estratégias exigem seleção explícita, prévia minimizada e confirmação do usuário. A confirmação repete que o arquivo não é assinado/verificado e que uma nova assunção será necessária.

## Completude e oportunidades

A bateria expressa completude documental/operacional registrada; não mede velocidade, qualidade individual ou desempenho. Enquanto houver pendência ativa, alerta da IA ou dado crítico ausente sinalizado pela IA, a bateria não pode mostrar 100%. Esses itens também entram no painel de oportunidades e impedem que o leito seja classificado como “sem lacunas”.

## Compatibilidade

Um importador deve rejeitar uma versão de schema desconhecida, em vez de tentar adivinhar sua estrutura. Uma evolução incompatível deverá usar `schemaVersion: 2` e documentar sua migração. Campos novos compatíveis só podem ser introduzidos numa revisão futura da especificação e do validador.
