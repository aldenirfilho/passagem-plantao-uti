# Continuidade UTI v5 · cockpit local-first

Status: implementado na versão `5.0.0-rc.1` como recurso local neste dispositivo. Não existe sincronização em tempo real nesta release.

## Resultado assistencial pretendido

O cockpit torna explícitos três elementos que costumam ficar dispersos na passagem de plantão:

1. quem está com a responsabilidade vigente;
2. o que foi registrado como concluído ou revisado em cada leito;
3. onde ainda existem oportunidades de continuidade.

A bateria de cada leito representa somente **completude e resolutividade registradas**. Tempo decorrido é informativo e não altera a carga. Não há ranking, placar, meta de velocidade ou comparação de profissionais.

## Fluxo do plantonista

1. Preencher nome completo, CRM, especialidade, RQE, papel e modo de adesão.
2. Selecionar **Assumir plantão**. Nome e CRM são obrigatórios.
3. Se já houver responsável, confirmar a transferência. A saída anterior e a nova entrada são registradas no histórico local.
4. Em cada leito, marcar manualmente:
   - evolução concluída;
   - prescrição revisada;
   - exames revisados.
5. Abrir **Oportunidades e histórico** para revisar os dez leitos em ordem fixa L1–L10.
6. Ao final, selecionar **Encerrar plantão**. Leitos, pendências e histórico permanecem no dispositivo para a próxima assunção.

Sem um plantonista vigente, o app bloqueia novos registros de atividade e linha do tempo. Conteúdo recebido por Cápsula mantém sua utilidade informativa, mas autores importados aparecem como **“Importado · não verificado”** até uma nova assunção local; isso evita atribuir responsabilidade profissional a uma identidade externa não autenticada.

## Modo coordenação

Um profissional vigente com papel `COORDENADOR` pode adicionar:

- **Nota de coordenação:** entra na linha do tempo do leito como `COORDENAÇÃO`;
- **Tarefa de coordenação:** entra no checklist com prioridade e prazo/gatilho editáveis.

Ambas registram nome, CRM, papel, data, leito e texto no log de auditoria local. A função não prescreve, não executa conduta e não atua em segundo plano.

## Como a completude da bateria é calculada

| Evidência registrada | Peso |
|---|---:|
| Identificação do paciente | 10% |
| Material clínico de origem | 10% |
| Cada uma das 10 linhas | 4% |
| Evolução concluída | 10% |
| Prescrição revisada | 10% |
| Exames revisados | 10% |
| Read-back confirmado | 10% |

Pendências ativas, gravidade e tempo decorrido não aumentam a bateria. Elas aparecem como contexto e oportunidades.

## Oportunidades e equidade

Para cada leito, o painel mostra:

- quantidade de linhas ausentes;
- atividades manuais ainda não registradas;
- pendências ativas e quantas têm prioridade alta;
- read-back pendente;
- ausência de dados no snapshot local.

O resumo mostra distribuição e faixa de lacunas somente para favorecer alocação equitativa de atenção. Os leitos nunca são ordenados por uma pontuação.

## Modelo local

```text
workspace
├── settings
│   ├── doctorName, crm, specialty, rqe
│   └── role, careMode
├── continuity
│   ├── activeShift
│   ├── sessions[0..100]
│   └── auditLog[0..500]
└── beds[10]
    ├── activities
    ├── handoff[10]
    ├── checklist
    └── timeline
```

O estado é salvo no IndexedDB do navegador. Dados antigos são migrados com defaults seguros; os novos campos são opcionais durante a leitura de Cápsulas v1 antigas.

## Cápsula UTI

A Cápsula exportada pode incluir:

- perfil e modo do plantão;
- fotografia de assunção, sessões encerradas e auditoria limitada, sempre descartada como fonte de vigência na importação;
- três atividades manuais por leito;
- autoria/data de tarefas de coordenação.

Ela continua excluindo anexos, blobs, notificações, chave de API e arquivos `.env`. Na importação, anexos dos leitos afetados são removidos, o read-back é invalidado e a vigência recebida é descartada por segurança.

## Limites desta release

- Não há backend, autenticação institucional, RBAC remoto ou presença multiusuário.
- Um coordenador em outro dispositivo não enxerga alterações automaticamente.
- O painel não monitora sinais vitais, alarmes, prontuário ou execução real de condutas.
- O histórico local não substitui trilha de auditoria institucional imutável.
- A vigência bloqueia novos eventos de timeline, atividades e coordenação; ela ainda não autoriza nem audita toda edição local de campo, anexo, checklist ou read-back.

Sincronização institucional futura exige autenticação forte, autorização por função, criptografia, trilha imutável, isolamento por hospital/UTI, governança LGPD, retenção e resposta a incidentes.

## Verificação

- testes unitários cobrem assunção, transferência, encerramento, oportunidades, atividades e Cápsula;
- fluxo real de navegador validou coordenador, tarefa, dez leitos e auditoria sem erros de console;
- auditoria automatizada de acessibilidade resultou em zero violações nos modos claro e escuro.
