import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateAttachmentFile, validateAttachmentMetadata } from "../app.js";
import {
  ATTACHMENT_MIME_TYPES,
  GENERIC_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_FILE_BYTES,
  validateAttachmentBytes,
} from "../attachment-contract.mjs";
import { odtZip, officeZip, storedZip } from "./attachment-fixtures.mjs";

const allowedMetadata = [
  ["exame.png", "image/png"],
  ["exame.jpg", "image/jpeg"],
  ["exame.jpeg", "image/jpeg"],
  ["exame.webp", "image/webp"],
  ["laudo.pdf", "application/pdf"],
  ["nota.txt", "text/plain"],
  ["nota.md", "text/markdown"],
  ["dados.json", "application/json"],
  ["dados.csv", "text/csv"],
  ["documento.doc", "application/msword"],
  ["documento.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["documento.rtf", "application/rtf"],
  ["documento.odt", "application/vnd.oasis.opendocument.text"],
  ["planilha.xls", "application/vnd.ms-excel"],
  ["planilha.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["slides.ppt", "application/vnd.ms-powerpoint"],
  ["slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
];

test("allowlist do frontend corresponde aos formatos clínicos declarados", () => {
  allowedMetadata.forEach(([name, type]) => assert.equal(validateAttachmentMetadata({ name, type }).ok, true, name));
  assert.equal(validateAttachmentMetadata({ name: "LAUDO.PDF", type: "" }).ok, true);
  assert.equal(validateAttachmentMetadata({ name: "laudo.pdf", type: "application/octet-stream" }).ok, true);
  assert.equal(validateAttachmentMetadata({ name: "nota.md", type: "text/x-markdown" }).ok, true);
  assert.equal(validateAttachmentMetadata({ name: "dados.csv", type: "application/vnd.ms-excel" }).ok, true);
  assert.deepEqual(GENERIC_ATTACHMENT_MIME_TYPES, ["", "application/octet-stream", "binary/octet-stream"]);
  assert.equal(ATTACHMENT_MIME_TYPES.docx[0], "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
});

test("bloqueia SVG, HTML, executáveis, extensões arbitrárias e MIME incompatível", () => {
  const blocked = [
    ["imagem.svg", "image/svg+xml"],
    ["pagina.html", "text/html"],
    ["programa.exe", "application/octet-stream"],
    ["arquivo.bin", "application/octet-stream"],
    ["laudo.pdf", "text/html"],
    ["laudo.pdf.exe", "application/pdf"],
  ];
  blocked.forEach(([name, type]) => assert.equal(validateAttachmentMetadata({ name, type }).ok, false, name));
});

test("inspeciona assinatura antes do IndexedDB e antes do envio", async () => {
  const file = (name, type, bytes) => ({ name, type, blob: new Blob([bytes], { type }) });
  assert.equal((await validateAttachmentFile(file("laudo.pdf", "application/pdf", "%PDF-1.7\n"))).ok, true);
  assert.equal((await validateAttachmentFile(file("nota.txt", "text/plain", "evolução clínica"))).ok, true);
  assert.match((await validateAttachmentFile(file("imagem.png", "image/png", "<svg xmlns='http://www.w3.org/2000/svg'>"))).reason, /HTML\/SVG/i);
  assert.match((await validateAttachmentFile(file("pagina.pdf", "application/pdf", "<!doctype html><html>"))).reason, /HTML\/SVG/i);
  assert.match((await validateAttachmentFile(file("programa.txt", "text/plain", new Uint8Array([0x4d, 0x5a, 0x90, 0x00])))).reason, /executável/i);
  assert.match((await validateAttachmentFile(file("falso.pdf", "application/pdf", "texto comum"))).reason, /assinatura interna/i);
  assert.match(
    (await validateAttachmentFile(file("oculto.txt", "text/plain", `${" ".repeat(5_000)}<!doctype html><html>`))).reason,
    /HTML\/SVG/i,
  );
  assert.match(
    (await validateAttachmentFile(file("mach-o.txt", "text/plain", new Uint8Array([0xca, 0xfe, 0xba, 0xbe, 0x00])))).reason,
    /executável/i,
  );

  const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const addFilesSource = source.slice(source.indexOf("async function addFiles"), source.indexOf("function addChecklistItem"));
  const prepareSource = source.slice(source.indexOf("async function prepareBedAnalysis"), source.indexOf("function applyAiResult"));
  assert.match(addFilesSource, /await validateAttachmentFile\(file\)[\s\S]*await putFile/);
  assert.match(prepareSource, /await validateAttachmentFile\(file\)/);
  assert.doesNotMatch(source, /blob\.slice\(0,\s*4_096\)/);
});

test("valida contêineres Office/OpenDocument completos e rejeita ZIP apenas renomeado", async () => {
  const file = (name, type, bytes) => ({ name, type, blob: new Blob([bytes], { type }) });
  const types = {
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  for (const [extension, type] of Object.entries(types)) {
    assert.equal((await validateAttachmentFile(file(`documento.${extension}`, type, officeZip(extension)))).ok, true, extension);
    assert.match(
      (await validateAttachmentFile(file(`renomeado.${extension}`, type, storedZip([["nota.txt", "não é Office"]])))).reason,
      /ZIP renomeado|estrutura interna/i,
      extension,
    );
  }
  assert.equal((await validateAttachmentFile(file("texto.odt", "application/vnd.oasis.opendocument.text", odtZip()))).ok, true);
  assert.match(
    (await validateAttachmentFile(file("falso.odt", "application/vnd.oasis.opendocument.text", odtZip("application/zip")))).reason,
    /ZIP renomeado|estrutura interna/i,
  );
});

test("aplica limite pelo conteúdo integral, não por metadado ou prefixo", () => {
  const oversized = new Uint8Array(MAX_ATTACHMENT_FILE_BYTES + 1);
  oversized.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
  const result = validateAttachmentBytes({
    name: "grande.pdf",
    type: "application/pdf",
    size: 1,
    bytes: oversized,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /15 MB/i);
});

test("app e servidor importam o mesmo contrato, sem allowlists paralelas", () => {
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const server = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");
  assert.match(app, /from "\.\/attachment-contract\.mjs"/);
  assert.match(server, /from "\.\/attachment-contract\.mjs"/);
  assert.doesNotMatch(app, /const ATTACHMENT_MIME_TYPES/);
  assert.doesNotMatch(server, /ATTACHMENT_TYPES_BY_EXTENSION/);
});

test("accept de anexos não usa image/* nem oferece formatos ativos", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const input = html.match(/id="file-input"[\s\S]*?accept="([^"]+)"/)?.[1] || "";
  for (const extension of [".png", ".jpg", ".jpeg", ".webp", ".pdf", ".txt", ".md", ".json", ".csv", ".doc", ".docx", ".rtf", ".odt", ".xls", ".xlsx", ".ppt", ".pptx"]) {
    assert.match(input, new RegExp(`(?:^|,)\\${extension}(?:,|$)`), extension);
  }
  assert.doesNotMatch(input, /image\/\*|\.svg|\.html?|\.exe/i);
});
