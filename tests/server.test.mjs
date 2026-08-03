import assert from "node:assert/strict";
import test from "node:test";
import {
  HANDOFF_SCHEMA,
  buildOpenAIRequest,
  createServer,
  extractOutputText,
  friendlyOpenAIError,
  parseEnvText,
  validateRenderPayload,
  validateStructuredHandoff,
} from "../server.mjs";

test("interpreta arquivo .env sem revelar ou deformar o valor", () => {
  assert.deepEqual(parseEnvText("# comentário\nOPENAI_API_KEY='segredo-teste'\nexport OPENAI_MODEL=gpt-5.6\n"), {
    OPENAI_API_KEY: "segredo-teste",
    OPENAI_MODEL: "gpt-5.6",
  });
});

test("contrato clínico exige exatamente dez tópicos", () => {
  const handoff = HANDOFF_SCHEMA.properties.handoff;
  assert.equal(handoff.minItems, 10);
  assert.equal(handoff.maxItems, 10);
  assert.equal(HANDOFF_SCHEMA.additionalProperties, false);
});

test("monta requisição multimodal com schema estrito e sem armazenamento remoto", () => {
  const request = buildOpenAIRequest({
    context: { bed: "L3", patientName: "Paciente teste", age: "67", medicalAcuity: "ATENÇÃO" },
    clinicalText: "Sepse documentada; noradrenalina em desmame.",
    attachments: [
      { name: "tc.png", type: "image/png", data: "data:image/png;base64,AA==" },
      { name: "evolucao.pdf", type: "application/pdf", data: "data:application/pdf;base64,AA==" },
    ],
  });

  assert.equal(request.store, false);
  assert.equal(request.text.format.strict, true);
  assert.equal(request.text.format.name, "uti_handoff");
  const userContent = request.input[1].content;
  assert.equal(userContent[1].type, "input_image");
  assert.equal(userContent[2].type, "input_file");
  assert.match(userContent[0].text, /LEITO: L3/);
  assert.match(userContent[0].text, /IDADE: 67/);
  assert.match(userContent[0].text, /ESTADO DEFINIDO PELO MÉDICO: ATENÇÃO/);
});

test("extrai texto do formato bruto da Responses API", () => {
  const response = {
    output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }],
  };
  assert.equal(extractOutputText(response), '{"ok":true}');
});

test("traduz ausência de cota sem expor detalhes da credencial", () => {
  const message = friendlyOpenAIError(429, { error: { code: "insufficient_quota" } });
  assert.match(message, /sem saldo ou cota/i);
  assert.doesNotMatch(message, /sk-/i);
});

test("não reflete mensagem bruta do provedor no navegador", () => {
  const message = friendlyOpenAIError(400, { error: { message: "sentinela-secreta-do-provedor" } });
  assert.doesNotMatch(message, /sentinela-secreta/i);
  assert.match(message, /recusou/i);
});

test("rejeita truncamento silencioso e anexos codificados fora do limite", () => {
  assert.match(validateRenderPayload({ clinicalText: "x".repeat(120_001), attachments: [] }), /ultrapassa/i);
  assert.match(
    validateRenderPayload({ clinicalText: "ok", attachments: [{ name: "laudo.pdf", data: "inválido" }] }),
    /conteúdo do anexo inválido/i,
  );
});

test("descarta resposta com tópicos fora de ordem ou de outro leito", () => {
  const structured = {
    bed: "L3",
    handoff: Array.from({ length: 10 }, (_, index) => ({ number: index + 1 })),
  };
  assert.equal(validateStructuredHandoff(structured, "L3"), "");
  structured.handoff[4].number = 8;
  assert.match(validateStructuredHandoff(structured, "L3"), /fora da ordem/i);
  structured.handoff[4].number = 5;
  assert.match(validateStructuredHandoff(structured, "L4"), /outro leito/i);
});

test("servidor expõe health check sem depender de chamada externa", async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(typeof body.aiConfigured, "boolean");
});

test("servidor nunca publica chave, código interno ou testes", async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  for (const pathname of ["/.env", "/.env.local", "/server.mjs", "/package.json", "/tests/server.test.mjs"]) {
    const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
    assert.equal(response.status, 404, pathname);
  }
});
