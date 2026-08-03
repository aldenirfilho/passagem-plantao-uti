import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import test from "node:test";
import { MAX_ATTACHMENT_FILE_BYTES } from "../attachment-contract.mjs";
import { odtZip, officeZip, storedZip } from "./attachment-fixtures.mjs";
import {
  HANDOFF_SCHEMA,
  buildOpenAIRequest,
  createServer,
  extractOutputText,
  friendlyOpenAIError,
  parseEnvText,
  validateLocalApiRequest,
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

test("aceita somente extensões, MIME e assinaturas clínicas permitidas", () => {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).toString("base64");
  assert.equal(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "imagem.png", type: "image/png", data: `data:image/png;base64,${pngHeader}` }],
  }), "");
  assert.match(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "vetor.svg", type: "image/svg+xml", data: "data:image/svg+xml;base64,PHN2Zz4=" }],
  }), /formato não permitido/i);
  assert.match(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "pagina.html", type: "text/html", data: "data:text/html;base64,PGgxPng8L2gxPg==" }],
  }), /formato não permitido/i);
  assert.match(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "laudo.pdf", type: "application/pdf", data: "data:application/pdf;base64,AA==" }],
  }), /assinatura do arquivo/i);
  assert.match(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "laudo.pdf", type: "text/plain", data: "data:text/plain;base64,b2s=" }],
  }), /tipo e extensão/i);
});

test("servidor revalida bytes integrais e MIME genérico não contorna o contrato", () => {
  const dataUrl = (mime, bytes) => `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
  assert.equal(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "laudo.pdf", type: "application/octet-stream", data: dataUrl("application/octet-stream", "%PDF-1.7\n") }],
  }), "");
  assert.match(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "programa.pdf", type: "application/octet-stream", data: dataUrl("application/octet-stream", Buffer.from([0x4d, 0x5a, 0x90])) }],
  }), /executável/i);
  assert.match(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "elf.txt", type: "binary/octet-stream", data: dataUrl("", Buffer.from([0x7f, 0x45, 0x4c, 0x46])) }],
  }), /executável/i);
  assert.match(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "pagina.txt", type: "text/plain", data: dataUrl("text/plain", `${" ".repeat(5_000)}<svg></svg>`) }],
  }), /HTML\/SVG/i);
});

test("servidor exige base64 estritamente canônico", () => {
  for (const data of [
    "data:text/plain;base64,Zh==",
    "data:text/plain;base64,Zg=",
    "data:text/plain;base64,Zg==\n",
    "data:text/plain;base64,Zg==AAAA",
  ]) {
    assert.match(validateRenderPayload({
      clinicalText: "ok",
      attachments: [{ name: "nota.txt", type: "text/plain", data }],
    }), /base64|conteúdo do anexo inválido/i, data);
  }
});

test("servidor distingue Office/OpenDocument de ZIP arbitrário renomeado", () => {
  const dataUrl = (type, bytes) => `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  const docxType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  assert.equal(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "evolucao.docx", type: docxType, data: dataUrl(docxType, officeZip("docx")) }],
  }), "");
  assert.match(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "renomeado.docx", type: "application/octet-stream", data: dataUrl("application/octet-stream", storedZip([["nota.txt", "qualquer"]])) }],
  }), /ZIP renomeado|estrutura interna/i);

  const odtType = "application/vnd.oasis.opendocument.text";
  assert.equal(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "evolucao.odt", type: odtType, data: dataUrl(odtType, odtZip()) }],
  }), "");
  assert.match(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "renomeado.odt", type: odtType, data: dataUrl(odtType, odtZip("application/zip")) }],
  }), /ZIP renomeado|estrutura interna/i);
});

test("servidor valida assinaturas de Office legado e RTF", () => {
  const dataUrl = (type, bytes) => `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]);
  assert.equal(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "antigo.doc", type: "application/msword", data: dataUrl("application/msword", ole) }],
  }), "");
  assert.match(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "falso.doc", type: "application/msword", data: dataUrl("application/msword", "texto") }],
  }), /assinatura do arquivo/i);
  assert.equal(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "nota.rtf", type: "application/rtf", data: dataUrl("application/rtf", "{\\rtf1 conteúdo}") }],
  }), "");
  assert.match(validateRenderPayload({
    clinicalText: "ok",
    attachments: [{ name: "falso.rtf", type: "application/rtf", data: dataUrl("application/rtf", "texto") }],
  }), /assinatura do arquivo/i);
});

test("servidor aplica 15 MiB por arquivo e 22 MiB no conjunto pelos bytes decodificados", () => {
  const pdf = (size) => {
    const bytes = Buffer.alloc(size, 0x20);
    bytes.write("%PDF-", 0, "ascii");
    return { name: "laudo.pdf", type: "application/pdf", data: `data:application/pdf;base64,${bytes.toString("base64")}` };
  };
  assert.match(validateRenderPayload({ clinicalText: "ok", attachments: [pdf(MAX_ATTACHMENT_FILE_BYTES + 1)] }), /15 MB|maior/i);
  const elevenMiB = 11 * 1024 * 1024;
  assert.equal(validateRenderPayload({ clinicalText: "ok", attachments: [pdf(elevenMiB), pdf(elevenMiB)] }), "");
  assert.match(validateRenderPayload({ clinicalText: "ok", attachments: [pdf(elevenMiB), pdf(elevenMiB + 1)] }), /22 MB|total/i);
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

test("protege a mesma chave contra chamadas de páginas externas", () => {
  assert.deepEqual(validateLocalApiRequest({ headers: { host: "127.0.0.1:4173", "content-type": "text/plain" } }), {
    status: 415,
    error: "A API local aceita somente JSON.",
  });
  assert.equal(validateLocalApiRequest({
    headers: { host: "127.0.0.1:4173", origin: "http://127.0.0.1:4173", "content-type": "application/json; charset=utf-8" },
  }), null);
  assert.equal(validateLocalApiRequest({
    headers: { host: "127.0.0.1:4173", origin: "https://pagina-maliciosa.example", "content-type": "application/json" },
  })?.status, 403);
  assert.equal(validateLocalApiRequest({
    headers: { host: "pagina-maliciosa.example", origin: "http://pagina-maliciosa.example", "content-type": "application/json" },
  })?.status, 403);
});

test("o processo principal permanece fixo no loopback", () => {
  const source = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");
  assert.match(source, /const HOST = "127\.0\.0\.1";/);
  assert.doesNotMatch(source, /process\.env\.HOST/);
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

  for (const pathname of ["/.env", "/.env.local", "/.env.example", "/server.mjs", "/package.json", "/tests/server.test.mjs"]) {
    const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
    assert.equal(response.status, 404, pathname);
  }
});

test("servidor publica cockpit, ícones locais e tutorial ilustrado", async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const expected = [
    ["/", "text/html"],
    ["/tutorial.html", "text/html"],
    ["/tutorial.css", "text/css"],
    ["/attachment-contract.mjs", "text/javascript"],
    ["/assets/icons.svg", "image/svg+xml"],
    ["/assets/logo-passagem-uti-aero.png", "image/png"],
    ["/assets/tutorial/cockpit-plantonista-v5.webp", "image/webp"],
    ["/assets/tutorial/central-coordenador-v5.webp", "image/webp"],
    ["/assets/tutorial/capsula-uti-v5.webp", "image/webp"],
    ["/output/pdf/Tutorial_Ilustrado_Passagem_UTI_v5.pdf", "application/pdf"],
  ];
  for (const [pathname, type] of expected) {
    const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
    assert.equal(response.status, 200, pathname);
    assert.match(response.headers.get("content-type") || "", new RegExp(type.replace("+", "\\+")), pathname);
  }
});

test("URL percentualmente malformada retorna 400 sem derrubar o servidor", async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const status = await new Promise((resolve, reject) => {
    const request = http.get({ hostname: "127.0.0.1", port, path: "/%ZZ" }, (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    request.on("error", reject);
  });
  assert.equal(status, 400);
  const health = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(health.status, 200);
});
