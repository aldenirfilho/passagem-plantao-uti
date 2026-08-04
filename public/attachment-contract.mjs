export const MAX_ATTACHMENT_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_ATTACHMENT_TOTAL_BYTES = 22 * 1024 * 1024;
export const MAX_ATTACHMENT_COUNT = 8;
export const MAX_ATTACHMENT_DATA_URL_CHARS = Math.ceil(MAX_ATTACHMENT_FILE_BYTES / 3) * 4 + 160;

export const ATTACHMENT_MIME_TYPES = Object.freeze({
  png: Object.freeze(["image/png"]),
  jpg: Object.freeze(["image/jpeg", "image/jpg"]),
  jpeg: Object.freeze(["image/jpeg", "image/jpg"]),
  webp: Object.freeze(["image/webp"]),
  pdf: Object.freeze(["application/pdf"]),
  txt: Object.freeze(["text/plain"]),
  md: Object.freeze(["text/markdown", "text/x-markdown", "text/plain"]),
  json: Object.freeze(["application/json", "text/json", "text/plain"]),
  csv: Object.freeze(["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"]),
  doc: Object.freeze(["application/msword", "application/x-msword"]),
  docx: Object.freeze(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  rtf: Object.freeze(["application/rtf", "text/rtf"]),
  odt: Object.freeze(["application/vnd.oasis.opendocument.text"]),
  xls: Object.freeze(["application/vnd.ms-excel", "application/msexcel", "application/x-msexcel"]),
  xlsx: Object.freeze(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]),
  ppt: Object.freeze(["application/vnd.ms-powerpoint", "application/mspowerpoint", "application/x-mspowerpoint"]),
  pptx: Object.freeze(["application/vnd.openxmlformats-officedocument.presentationml.presentation"]),
});

export const GENERIC_ATTACHMENT_MIME_TYPES = Object.freeze([
  "",
  "application/octet-stream",
  "binary/octet-stream",
]);

const ALLOWED_EXTENSIONS = new Set(Object.keys(ATTACHMENT_MIME_TYPES));
const GENERIC_MIMES = new Set(GENERIC_ATTACHMENT_MIME_TYPES);
const TEXT_EXTENSIONS = new Set(["txt", "md", "json", "csv"]);
const OLE_EXTENSIONS = new Set(["doc", "xls", "ppt"]);
const OOXML_FOLDERS = Object.freeze({ docx: "word/", xlsx: "xl/", pptx: "ppt/" });
const ODT_MEDIA_TYPE = "application/vnd.oasis.opendocument.text";
const UTF8 = new TextDecoder("utf-8", { fatal: false });

export function normalizeAttachmentMime(value) {
  return typeof value === "string"
    ? value.split(";", 1)[0].trim().toLocaleLowerCase("en-US")
    : "";
}

export function attachmentExtension(name) {
  const normalized = typeof name === "string" ? name.trim().toLocaleLowerCase("en-US") : "";
  const match = normalized.match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function blocked(reason, details = {}) {
  return { ...details, ok: false, reason };
}

export function validateAttachmentMetadata(file = {}) {
  const extension = attachmentExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return blocked(
      "formato não permitido. Use PNG, JPEG, WebP, PDF, TXT/MD/JSON/CSV ou documentos Office/OpenDocument permitidos.",
      { extension, mime: "" },
    );
  }

  const declaredMime = normalizeAttachmentMime(file.type);
  const aliases = ATTACHMENT_MIME_TYPES[extension];
  if (!GENERIC_MIMES.has(declaredMime) && !aliases.includes(declaredMime)) {
    return blocked(`tipo e extensão do arquivo são incompatíveis (${declaredMime || "tipo desconhecido"} para .${extension}).`, {
      extension,
      mime: "",
    });
  }

  const reportedSize = Number(file.size);
  if (Number.isFinite(reportedSize) && reportedSize > MAX_ATTACHMENT_FILE_BYTES) {
    return blocked("arquivo maior que 15 MB.", { extension, mime: aliases[0], size: reportedSize });
  }

  return { ok: true, reason: "", extension, mime: aliases[0], size: Number.isFinite(reportedSize) ? reportedSize : null };
}

function bytePrefix(bytes, prefix) {
  if (bytes.length < prefix.length) return false;
  return prefix.every((value, index) => bytes[index] === value);
}

function isExecutable(bytes) {
  return bytePrefix(bytes, [0x4d, 0x5a])
    || bytePrefix(bytes, [0x7f, 0x45, 0x4c, 0x46])
    || bytePrefix(bytes, [0xfe, 0xed, 0xfa, 0xce])
    || bytePrefix(bytes, [0xce, 0xfa, 0xed, 0xfe])
    || bytePrefix(bytes, [0xfe, 0xed, 0xfa, 0xcf])
    || bytePrefix(bytes, [0xcf, 0xfa, 0xed, 0xfe])
    || bytePrefix(bytes, [0xca, 0xfe, 0xba, 0xbe])
    || bytePrefix(bytes, [0xbe, 0xba, 0xfe, 0xca])
    || bytePrefix(bytes, [0xca, 0xfe, 0xba, 0xbf])
    || bytePrefix(bytes, [0xbf, 0xba, 0xfe, 0xca]);
}

function decodedText(bytes) {
  return UTF8.decode(bytes).replace(/^\uFEFF/, "");
}

function hasLeadingHtmlOrSvg(bytes) {
  const text = decodedText(bytes).trimStart().toLocaleLowerCase("en-US");
  return /^(?:<!doctype\s+html\b|<html\b|<svg\b|<\?xml[\s\S]{0,4096}<svg\b)/.test(text);
}

function readU16LE(bytes, offset) {
  if (offset + 2 > bytes.length) return null;
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32LE(bytes, offset) {
  if (offset + 4 > bytes.length) return null;
  return (bytes[offset]
    | (bytes[offset + 1] << 8)
    | (bytes[offset + 2] << 16)
    | (bytes[offset + 3] << 24)) >>> 0;
}

function bytesEqualText(bytes, text) {
  if (bytes.length !== text.length) return false;
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

function zipCentralEntries(bytes) {
  const minimumOffset = Math.max(0, bytes.length - 65_557);
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (readU32LE(bytes, offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) return [];

  const diskNumber = readU16LE(bytes, endOffset + 4);
  const centralDisk = readU16LE(bytes, endOffset + 6);
  const diskEntries = readU16LE(bytes, endOffset + 8);
  const totalEntries = readU16LE(bytes, endOffset + 10);
  const centralSize = readU32LE(bytes, endOffset + 12);
  const centralOffset = readU32LE(bytes, endOffset + 16);
  const commentLength = readU16LE(bytes, endOffset + 20);
  if ([diskNumber, centralDisk, diskEntries, totalEntries, centralSize, centralOffset, commentLength].some((value) => value === null)) return [];
  if (diskNumber !== 0 || centralDisk !== 0 || diskEntries !== totalEntries || !totalEntries || totalEntries > 1_024) return [];
  if (endOffset + 22 + commentLength !== bytes.length || centralOffset + centralSize !== endOffset) return [];

  const entries = [];
  let offset = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > endOffset || readU32LE(bytes, offset) !== 0x02014b50) return [];
    const flags = readU16LE(bytes, offset + 8);
    const method = readU16LE(bytes, offset + 10);
    const compressedSize = readU32LE(bytes, offset + 20);
    const nameLength = readU16LE(bytes, offset + 28);
    const extraLength = readU16LE(bytes, offset + 30);
    const entryCommentLength = readU16LE(bytes, offset + 32);
    const localOffset = readU32LE(bytes, offset + 42);
    if ([flags, method, compressedSize, nameLength, extraLength, entryCommentLength, localOffset].some((value) => value === null)) return [];
    const entryLength = 46 + nameLength + extraLength + entryCommentLength;
    if (entryLength < 46 || offset + entryLength > endOffset || (flags & 0x01) !== 0) return [];
    const name = UTF8.decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
      .replace(/\\/g, "/")
      .toLocaleLowerCase("en-US");
    if (!name || name.includes("\u0000") || localOffset + 30 > centralOffset) return [];
    entries.push({ name, flags, method, compressedSize, localOffset });
    offset += entryLength;
  }
  return offset === endOffset ? entries : [];
}

function storedZipEntry(bytes, entry) {
  const offset = entry?.localOffset;
  if (!Number.isInteger(offset) || readU32LE(bytes, offset) !== 0x04034b50 || entry.method !== 0) return null;
  const nameLength = readU16LE(bytes, offset + 26);
  const extraLength = readU16LE(bytes, offset + 28);
  if (nameLength === null || extraLength === null) return null;
  const nameStart = offset + 30;
  const dataStart = nameStart + nameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataStart > bytes.length || dataEnd > bytes.length) return null;
  const localName = UTF8.decode(bytes.subarray(nameStart, nameStart + nameLength))
    .replace(/\\/g, "/")
    .toLocaleLowerCase("en-US");
  return localName === entry.name ? bytes.subarray(dataStart, dataEnd) : null;
}

function validateZipContainer(bytes, extension) {
  if (!bytePrefix(bytes, [0x50, 0x4b, 0x03, 0x04])) return false;
  const entries = zipCentralEntries(bytes);
  if (!entries.length) return false;
  const names = entries.map((entry) => entry.name);

  if (extension === "odt") {
    const entry = entries.find((candidate) => candidate.name === "mimetype");
    if (!entry) return false;
    const mimetype = storedZipEntry(bytes, entry);
    return Boolean(mimetype && bytesEqualText(mimetype, ODT_MEDIA_TYPE));
  }

  const folder = OOXML_FOLDERS[extension];
  return names.includes("[content_types].xml") && names.some((name) => name.startsWith(folder));
}

function toUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

export function validateAttachmentBytes(file = {}) {
  const metadata = validateAttachmentMetadata(file);
  if (!metadata.ok) return metadata;
  const bytes = toUint8Array(file.bytes);
  if (!bytes) return blocked("conteúdo binário do anexo ausente ou inválido.", metadata);
  if (!bytes.byteLength) return blocked("arquivo vazio.", { ...metadata, size: 0 });
  if (bytes.byteLength > MAX_ATTACHMENT_FILE_BYTES) {
    return blocked("arquivo maior que 15 MB.", { ...metadata, size: bytes.byteLength });
  }
  if (isExecutable(bytes)) {
    return blocked("conteúdo executável detectado e bloqueado.", { ...metadata, size: bytes.byteLength });
  }
  if (hasLeadingHtmlOrSvg(bytes)) {
    return blocked("conteúdo HTML/SVG detectado e bloqueado.", { ...metadata, size: bytes.byteLength });
  }

  let signatureOk = true;
  if (metadata.extension === "png") {
    signatureOk = bytePrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  } else if (["jpg", "jpeg"].includes(metadata.extension)) {
    signatureOk = bytePrefix(bytes, [0xff, 0xd8, 0xff]);
  } else if (metadata.extension === "webp") {
    signatureOk = bytePrefix(bytes, [0x52, 0x49, 0x46, 0x46])
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  } else if (metadata.extension === "pdf") {
    signatureOk = bytePrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  } else if (OLE_EXTENSIONS.has(metadata.extension)) {
    signatureOk = bytePrefix(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  } else if (metadata.extension === "rtf") {
    signatureOk = /^\s*\{\\rtf(?:\d|[\\\s])/i.test(decodedText(bytes));
  } else if (Object.hasOwn(OOXML_FOLDERS, metadata.extension) || metadata.extension === "odt") {
    signatureOk = validateZipContainer(bytes, metadata.extension);
  } else if (TEXT_EXTENSIONS.has(metadata.extension)) {
    signatureOk = true;
  }

  if (!signatureOk) {
    const container = Object.hasOwn(OOXML_FOLDERS, metadata.extension) || metadata.extension === "odt";
    return blocked(
      container
        ? `estrutura interna incompatível com .${metadata.extension}; ZIP renomeado ou documento inválido bloqueado.`
        : `assinatura do arquivo incompatível com .${metadata.extension}; assinatura interna inválida.`,
      { ...metadata, size: bytes.byteLength },
    );
  }
  return { ...metadata, ok: true, reason: "", size: bytes.byteLength };
}

function encodeBase64(bytes) {
  if (typeof globalThis.Buffer === "function") return globalThis.Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return globalThis.btoa(binary);
}

export function decodeCanonicalBase64(value) {
  if (typeof value !== "string" || value.length % 4 !== 0) {
    return blocked("conteúdo base64 inválido ou não canônico.");
  }
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const contentLength = value.length - padding;
  if ((padding === 2 && contentLength % 4 !== 2) || (padding === 1 && contentLength % 4 !== 3)) {
    return blocked("conteúdo base64 inválido ou não canônico.");
  }
  for (let index = 0; index < contentLength; index += 1) {
    const code = value.charCodeAt(index);
    const valid = (code >= 0x41 && code <= 0x5a)
      || (code >= 0x61 && code <= 0x7a)
      || (code >= 0x30 && code <= 0x39)
      || code === 0x2b
      || code === 0x2f;
    if (!valid) return blocked("conteúdo base64 inválido ou não canônico.");
  }
  for (let index = contentLength; index < value.length; index += 1) {
    if (value[index] !== "=") return blocked("conteúdo base64 inválido ou não canônico.");
  }
  try {
    let bytes;
    if (typeof globalThis.Buffer === "function") {
      bytes = new Uint8Array(globalThis.Buffer.from(value, "base64"));
    } else {
      const binary = globalThis.atob(value);
      bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    }
    if (encodeBase64(bytes) !== value) return blocked("conteúdo base64 inválido ou não canônico.");
    return { ok: true, reason: "", bytes };
  } catch {
    return blocked("conteúdo base64 inválido ou não canônico.");
  }
}

export function validateAttachmentDataUrl(file = {}) {
  const metadata = validateAttachmentMetadata(file);
  if (!metadata.ok) return metadata;
  const data = typeof file.data === "string" ? file.data : "";
  if (!data || data.length > MAX_ATTACHMENT_DATA_URL_CHARS) {
    return blocked(data ? "anexo codificado maior que o limite aceito." : "conteúdo do anexo inválido.", metadata);
  }
  const marker = ";base64,";
  const markerOffset = data.indexOf(marker, 5);
  if (!data.startsWith("data:") || markerOffset < 5 || data.indexOf(marker, markerOffset + marker.length) !== -1) {
    return blocked("conteúdo do anexo inválido.", metadata);
  }
  const rawEncodedMime = data.slice(5, markerOffset);
  if (rawEncodedMime.includes(",") || rawEncodedMime.includes(";")) return blocked("conteúdo do anexo inválido.", metadata);
  const encodedBase64 = data.slice(markerOffset + marker.length);

  const encodedMime = normalizeAttachmentMime(rawEncodedMime);
  const aliases = ATTACHMENT_MIME_TYPES[metadata.extension];
  if (!GENERIC_MIMES.has(encodedMime) && !aliases.includes(encodedMime)) {
    return blocked("tipo declarado e conteúdo do anexo são incompatíveis.", metadata);
  }

  const decoded = decodeCanonicalBase64(encodedBase64);
  if (!decoded.ok) return blocked(decoded.reason, metadata);
  const validated = validateAttachmentBytes({
    name: file.name,
    type: metadata.mime,
    size: decoded.bytes.byteLength,
    bytes: decoded.bytes,
  });
  if (!validated.ok) return validated;
  return { ...validated, dataMime: encodedMime, base64: encodedBase64, bytes: decoded.bytes };
}

export async function validateAttachmentFile(file = {}) {
  const metadata = validateAttachmentMetadata(file);
  if (!metadata.ok) return metadata;
  const blob = file?.blob instanceof Blob ? file.blob : file instanceof Blob ? file : null;
  if (!blob) return blocked("conteúdo binário do anexo ausente ou inválido.", metadata);
  if (blob.size > MAX_ATTACHMENT_FILE_BYTES) {
    return blocked("arquivo maior que 15 MB.", { ...metadata, size: blob.size });
  }
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return validateAttachmentBytes({ name: file.name, type: file.type, size: bytes.byteLength, bytes });
  } catch {
    return blocked("não foi possível ler o arquivo por completo.", metadata);
  }
}
