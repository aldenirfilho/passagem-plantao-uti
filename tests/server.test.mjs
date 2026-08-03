import assert from "node:assert/strict";
import test from "node:test";
import {
  HANDOFF_SCHEMA,
  buildOpenAIRequest,
  createServer,
  extractOutputText,
  friendlyOpenAIError,
  parseEnvText,
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
    context: { bed: "L3", patientName: "Paciente teste" },
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
