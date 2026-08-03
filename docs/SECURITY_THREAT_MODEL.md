# Passagem UTI - Security Threat Model

**Método:** STRIDE + abuso de produto + riscos de IA  
**Status:** inicial; atualizar a cada mudança arquitetural

## 1. Escopo

Ativos protegidos:

- Dados clínicos e anexos.
- Identidade profissional, sessão e MFA.
- Cápsulas, versões, pendências e read-back.
- Chaves, tokens, certificados e KMS.
- Auditoria e evidências.
- Disponibilidade e integridade do serviço.
- Isolamento entre tenants.

## 2. Estado atual versus futuro

### ATUAL - LOCAL

- Servidor restrito a loopback e origem local.
- Chave fora do frontend.
- CSP e allowlist de arquivos públicos.
- Limites de texto/anexo e schema estruturado.
- IndexedDB como armazenamento local.

Riscos residuais: dispositivo compartilhado/comprometido, perfil de navegador, exportação manual, arquivo local da chave, ausência de autenticação e backup institucional.

### FUTURO - ONLINE

Adiciona superfície pública, identidade, multi-tenancy, banco, object storage, integrações e suporte. Exige controles abaixo antes de dados reais.

## 3. Diagrama de fluxo resumido

```text
Usuário -> navegador -> edge/WAF -> API autenticada -> serviços
                                      |-> banco clínico
                                      |-> object storage
                                      |-> audit store
                                      |-> AI gateway -> secret manager -> provedor
```

## 4. Ameaças STRIDE

| ID | Categoria | Ameaça | Impacto | Controles |
|---|---|---|---|---|
| T-01 | Spoofing | Roubo de sessão/conta | Acesso clínico indevido | MFA, tokens curtos, revogação, risco de sessão |
| T-02 | Tampering | Alterar cápsula/read-back | Integridade assistencial | Versionamento, assinatura/hash, audit append-only |
| T-03 | Repudiation | Negar exportação/alteração | Falha de accountability | Auditoria de autoria, tempo e contexto |
| T-04 | Information disclosure | IDOR/BOLA cross-tenant | Vazamento sensível | Backend authorization, RLS, testes negativos |
| T-05 | Information disclosure | PHI em logs/APM | Exposição silenciosa | Allowlist, redaction, scans e revisão |
| T-06 | Denial of service | Spam de render/Turbo | Indisponibilidade/custo | Rate limit, quotas, fila, circuit breaker |
| T-07 | Elevation | Plantonista vira coordenador | Controle indevido | RBAC, step-up auth, dual control |
| T-08 | Tampering | Upload malicioso | Malware/compromisso | MIME real, AV, quarentena, sandbox |
| T-09 | Disclosure | URL assinada reutilizada | Download indevido | TTL curto, escopo, one-time e auditoria |
| T-10 | Spoofing | Convite ad hoc encaminhado | Participante indevido | Convite nominativo + autenticação + expiração |
| T-11 | Disclosure | Segredo em Git/Notion/Drive | Comprometimento sistêmico | Secret manager, scanning, rotação e proibição |
| T-12 | Tampering/AI | Prompt injection em anexo | Saída manipulada | Tratar entrada como dado, system policy, schema |
| T-13 | AI | Resposta de versão errada | Erro clínico | Context binding e descarte seguro |
| T-14 | Supply chain | Dependência comprometida | Execução/acesso | Lockfile, SBOM, assinatura, scanning |
| T-15 | Insider | Suporte acessa conteúdo | Violação de finalidade | Sem acesso padrão, JIT, aprovação e auditoria |

## 5. Casos de abuso

- Coordenador tenta ver cápsula sem vínculo assistencial.
- Usuário enumera IDs de cápsulas de outra organização.
- Atacante força exportações em massa.
- Profissional usa plantão ad hoc para contornar controle institucional.
- Gestor exporta indicador nominal para punição.
- Desenvolvedor copia payload real para issue do GitHub/Notion.
- Operador envia backup para Drive/iCloud.
- Arquivo contém instrução para a IA ignorar regras.
- Atacante provoca chamadas caras ao Modo Turbo.

## 6. Controles de identidade

- OIDC/OAuth2 com PKCE.
- MFA obrigatório e step-up em administração/exportação.
- Recuperação de conta resistente a takeover.
- Sessão curta, refresh rotativo, revogação e logout global.
- SCIM/SSO para B2B quando disponível.
- Desprovisionamento automático por desligamento/vínculo.

## 7. Autorização e tenant isolation

- Deny by default.
- Permissão avaliada no backend em toda requisição.
- Escopo derivado da sessão, nunca aceito do cliente sem validação.
- Testes de acesso horizontal e vertical.
- Cache, busca, fila, arquivo, relatório e backup respeitam tenant.
- Queries sem filtro de tenant falham em CI.

## 8. Segredos

- Secret manager + workload identity.
- Segredo nunca em código, `.env` distribuído, log, analytics ou documentação.
- Rotação periódica e emergencial.
- Acesso por ambiente e serviço mínimo.
- Secret scanning em pre-commit e CI.
- Detecção de vazamento aciona revogação, não apenas remoção do Git.

## 9. Proteção de dados

- TLS em trânsito; criptografia KMS em repouso.
- Backups criptografados e testados.
- Chaves separadas por ambiente e, quando necessário, tenant.
- Exportação com autorização, watermark opcional, expiração e auditoria.
- Sem PHI em CDN pública ou push.
- Mascaramento em suporte e ambientes não produtivos.

## 10. Segurança de API

- Schema estrito e limites de corpo/arquivo.
- Rate limit por usuário, tenant e endpoint.
- Idempotency key para mutações.
- Proteção CSRF quando cookies; CORS estrito.
- Headers de segurança e CSP.
- Paginação e limites de exportação.
- Erros não refletem mensagens internas ou do provedor.

## 11. Segurança de IA

- Anexo/texto são dados não confiáveis, nunca instruções.
- Prompt de sistema server-side e versionado.
- Schema estruturado e validação contextual.
- Redução de payload e timeout.
- Modelo/versão registrados por metadado.
- Sem ferramenta de ação clínica autônoma.
- Avaliação adversarial antes de mudança de modelo.

## 12. SDLC

- Branch protection e revisão obrigatória.
- SAST, dependency scan, secret scan e IaC scan.
- SBOM por release.
- Ambientes separados; dados sintéticos fora de produção.
- DAST e pentest antes do piloto.
- Patches críticos com SLA.
- Assinatura/proveniência de artefato.

## 13. Detecção e resposta

Alertas:

- Login anômalo e MFA repetido.
- Enumeração/negações de autorização.
- Exportação incomum.
- Acesso de suporte/JIT.
- Picos de IA e Turbo.
- Falha de integridade de auditoria.
- Malware em upload.

Resposta:

1. Conter sessão, chave, tenant ou feature.
2. Preservar evidência minimizada.
3. Acionar CSIRT, controlador, encarregado e safety officer.
4. Avaliar impacto clínico e privacidade em paralelo.
5. Comunicar conforme decisão formal.
6. Corrigir, restaurar e revisar threat model.

## 14. Testes mínimos antes do go-live

- IDOR/BOLA e privilege escalation.
- Cross-tenant em API, busca, cache, arquivos e exportações.
- Upload malicioso e content-type confusion.
- CSRF, XSS, CSP e session fixation.
- Rotação/revogação de segredos.
- Restore e ransomware tabletop.
- Prompt injection e resposta de paciente/leito errado.
- DoS/custo em IA e Turbo.
- Acesso de suporte e break-glass.

## 15. Critérios de aceitação

- Zero achado crítico/alto aberto sem aceite formal e compensação.
- Isolamento multi-tenant demonstrado automaticamente e por pentest.
- Nenhum segredo/PHI detectado em repositório ou telemetria.
- Incidente tabletop concluído com evidência.
- Owner e prazo para todo risco residual.

