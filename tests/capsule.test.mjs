import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CAPSULE_MAX_BYTES,
  CAPSULE_SCHEMA_ID,
  CAPSULE_SCHEMA_VERSION,
  appendLocalCapsuleImportAudit,
  attachmentBedIdsToClear,
  applyCapsuleToWorkspace,
  assumeShift,
  buildCapsule,
  capsuleContextMismatches,
  handoffMarkdown,
  handoffText,
  minimizedPatientName,
  minimizedRecordId,
  newState,
  parseCapsuleText,
  shiftMarkdown,
  shiftText,
  whatsappTextForBed,
} from "../app.js";

function populatedState() {
  const state = newState();
  state.settings = {
    ...state.settings,
    doctorName: "Médica Teste",
    crm: "CRM-CE 00001",
    hospital: "Hospital Teste",
    unit: "UTI 2",
    date: "2026-08-03",
  };
  const bed = state.beds[0];
  bed.patientName = "Paciente Teste";
  bed.age = "67";
  bed.record = "PRONT-1";
  bed.admission = "2026-08-01";
  bed.acuity = "ATENÇÃO";
  bed.clinicalText = "Texto clínico local.";
  bed.handoff.forEach((line, index) => { line.text = `Conteúdo objetivo ${index + 1}`; });
  bed.checklist.push({ id: "check-1", text: "Reavaliar às 18h", priority: "alta", due: "18:00", done: false, suggested: false });
  bed.timeline.push({ id: "event-1", type: "CONDUTA", text: "Conduta registrada", at: "2026-08-03T17:00:00.000Z", author: "Médica Teste" });
  bed.alerts = ["Revisar perfusão"];
  bed.missing = ["Diurese das últimas 6h"];
  bed.updatedAt = "2026-08-03T17:10:00.000Z";
  bed.readback = {
    receiverName: "Médico Receptor",
    receiverCrm: "CRM-CE 00002",
    linesReviewed: true,
    risksReviewed: true,
    tasksUnderstood: true,
    confirmedAt: "2026-08-03T17:15:00.000Z",
    contentHash: "a".repeat(64),
  };
  return state;
}

test("exporta Cápsula UTI v1 sem anexos, notificações ou segredos", () => {
  const state = populatedState();
  state.notifications.push({ title: "Evento local" });
  const capsule = buildCapsule(state, "bed", "L1");
  const serialized = JSON.stringify(capsule);

  assert.equal(capsule.schema, CAPSULE_SCHEMA_ID);
  assert.equal(capsule.schemaVersion, CAPSULE_SCHEMA_VERSION);
  assert.equal(capsule.mode, "bed");
  assert.equal(capsule.data.beds.length, 1);
  assert.equal(capsule.data.beds[0].handoff.length, 10);
  assert.doesNotMatch(serialized, /OPENAI_API_KEY|\.env|notifications|files|blob/i);
});

test("Cápsula de leito isola continuidade global e qualquer outro leito", () => {
  const state = populatedState();
  state.beds[1].patientName = "Paciente secreto de outro leito";
  state.beds[1].record = "PRONT-SEGREDO-L2";
  state.beds[1].clinicalText = "Detalhe exclusivo do L2";
  assumeShift(state, {
    doctorName: "Plantão anterior secreto",
    crm: "CRM-CE 10000",
    role: "PLANTONISTA",
    careMode: "AD_HOC",
  }, "2026-08-03T07:00:00.000Z");
  assumeShift(state, {
    doctorName: "Plantonista vigente",
    crm: "CRM-CE 10001",
    role: "PLANTONISTA",
    careMode: "UTI_OFICIAL",
  }, "2026-08-03T19:00:00.000Z");

  const capsule = buildCapsule(state, "bed", "L1");
  const serialized = JSON.stringify(capsule);
  assert.deepEqual(capsule.data.continuity, { activeShift: null, sessions: [], auditLog: [] });
  assert.doesNotMatch(serialized, /Paciente secreto|PRONT-SEGREDO|Detalhe exclusivo|Plantão anterior secreto/);

  const contaminated = structuredClone(capsule);
  contaminated.data.continuity.sessions.push({
    id: "external-session",
    doctorName: "Externo",
    crm: "CRM 9",
    specialty: "",
    rqe: "",
    role: "PLANTONISTA",
    careMode: "AD_HOC",
    startedAt: "2026-08-02T07:00:00.000Z",
    endedAt: "2026-08-02T19:00:00.000Z",
    endReason: "ENCERRADO",
  });
  assert.throws(() => parseCapsuleText(JSON.stringify(contaminated)), /Cápsula de leito não pode conter.*sessões/i);
});

test("faz round-trip validado e invalida read-back importado", () => {
  const capsule = buildCapsule(populatedState(), "bed", "L1");
  const validated = parseCapsuleText(JSON.stringify(capsule));
  const bed = validated.data.beds[0];

  assert.equal(bed.patientName, "Paciente Teste");
  assert.equal(bed.handoff[9].number, 10);
  assert.equal(bed.readback.receiverName, "Médico Receptor");
  assert.equal(bed.readback.confirmedAt, null);
  assert.equal(bed.readback.contentHash, "");
  assert.equal(bed.renderFingerprint, "");
});

test("rejeita schema futuro, campos superiores desconhecidos e dez linhas incompletas", () => {
  const base = buildCapsule(populatedState(), "bed", "L1");
  assert.throws(() => parseCapsuleText(JSON.stringify({ ...base, schemaVersion: 2 })), /versão de schema incompatível/i);
  assert.throws(() => parseCapsuleText(JSON.stringify({ ...base, executar: "alert(1)" })), /campos desconhecidos/i);

  const incomplete = structuredClone(base);
  incomplete.data.beds[0].handoff.pop();
  assert.throws(() => parseCapsuleText(JSON.stringify(incomplete)), /exatamente 10 linhas/i);
});

test("rejeita plantão com leito duplicado e arquivo acima de 4 MiB", () => {
  const capsule = buildCapsule(populatedState(), "shift", "L1");
  capsule.data.beds[1].id = "L1";
  assert.throws(() => parseCapsuleText(JSON.stringify(capsule)), /duplicados/i);
  assert.throws(() => parseCapsuleText(" ".repeat(CAPSULE_MAX_BYTES + 1)), /limite de 4 MiB/i);
});

test("rejeita datas inexistentes e IDs internos duplicados", () => {
  const invalidDate = buildCapsule(populatedState(), "bed", "L1");
  invalidDate.data.settings.date = "2026-02-31";
  assert.throws(() => parseCapsuleText(JSON.stringify(invalidDate)), /data inexistente/i);

  const duplicateItems = buildCapsule(populatedState(), "bed", "L1");
  duplicateItems.data.beds[0].checklist.push({
    ...duplicateItems.data.beds[0].checklist[0],
    text: "Outro item com o mesmo ID",
  });
  assert.throws(() => parseCapsuleText(JSON.stringify(duplicateItems)), /checklist contém IDs duplicados/i);
});

test("conteúdo potencialmente hostil permanece texto inerte", () => {
  const capsule = buildCapsule(populatedState(), "bed", "L1");
  capsule.data.beds[0].handoff[0].text = "<img src=x onerror=globalThis.comprometido=true>";
  const validated = parseCapsuleText(JSON.stringify(capsule));

  assert.equal(validated.data.beds[0].handoff[0].text, "<img src=x onerror=globalThis.comprometido=true>");
  assert.equal(globalThis.comprometido, undefined);
});

test("mesclar preserva outros leitos e substituir cria plantão limpo", () => {
  const current = newState();
  current.settings = {
    ...current.settings,
    doctorName: "Médico do contexto local",
    hospital: "Hospital Teste",
    unit: "UTI 2",
    date: "2026-08-03",
  };
  current.beds[1].patientName = "Paciente local L2";
  current.notifications = [{ id: "n1", title: "Notificação local" }];

  const imported = parseCapsuleText(JSON.stringify(buildCapsule(populatedState(), "bed", "L1")));
  const merged = applyCapsuleToWorkspace(current, imported, "merge");
  assert.equal(merged.beds[0].patientName, "Paciente Teste");
  assert.equal(merged.beds[1].patientName, "Paciente local L2");
  assert.equal(merged.notifications.length, 1);
  assert.equal(merged.settings.doctorName, "Médico do contexto local");

  const replaced = applyCapsuleToWorkspace(current, imported, "replace");
  assert.equal(replaced.beds[0].patientName, "Paciente Teste");
  assert.equal(replaced.beds[1].patientName, "");
  assert.equal(replaced.notifications.length, 0);
  assert.equal(replaced.settings.doctorName, "Médico do contexto local");
});

test("bloqueia merge de leito em hospital, UTI ou data incompatível", () => {
  const current = newState();
  current.settings = { ...current.settings, hospital: "Outro Hospital", unit: "UTI 2", date: "2026-08-03" };
  const imported = parseCapsuleText(JSON.stringify(buildCapsule(populatedState(), "bed", "L1")));

  assert.deepEqual(capsuleContextMismatches(current.settings, imported.data.settings), ["hospital"]);
  assert.throws(() => applyCapsuleToWorkspace(current, imported, "merge"), /outro contexto.*hospital/i);
});

test("bloqueia também merge de plantão em hospital, UTI ou data incompatível", () => {
  const source = populatedState();
  const imported = parseCapsuleText(JSON.stringify(buildCapsule(source, "shift", "L1")));
  const current = newState();
  current.settings = { ...current.settings, hospital: "Hospital Teste", unit: "UTI 9", date: "2026-08-03" };
  assert.throws(() => applyCapsuleToWorkspace(current, imported, "merge"), /outro contexto.*UTI/i);
});

test("importação nunca confia em vigência/auditoria externa e registra apenas evento local", () => {
  const external = populatedState();
  external.beds[0].checklist.push({
    id: "coord-importada",
    text: "Conferir intervenção",
    priority: "alta",
    due: "antes da visita",
    done: false,
    suggested: false,
    source: "coordination",
    createdAt: "2026-08-03T07:30:00.000Z",
    authorName: "Coordenação externa",
    authorCrm: "CRM-EX 998",
  });
  assumeShift(external, {
    doctorName: "Pessoa externa",
    crm: "CRM-EX 999",
    role: "COORDENADOR",
    careMode: "UTI_OFICIAL",
  }, "2026-08-03T07:00:00.000Z");
  const capsule = parseCapsuleText(JSON.stringify(buildCapsule(external, "shift", "L1")));

  const current = newState();
  current.settings = { ...current.settings, doctorName: "Pessoa local", crm: "CRM-CE 123", hospital: "Hospital Teste", unit: "UTI 2", date: "2026-08-03" };
  assumeShift(current, {
    doctorName: "Histórico local",
    crm: "CRM-CE 122",
    role: "PLANTONISTA",
    careMode: "AD_HOC",
  }, "2026-08-02T19:00:00.000Z");
  assumeShift(current, {
    doctorName: "Pessoa local",
    crm: "CRM-CE 123",
    role: "PLANTONISTA",
    careMode: "AD_HOC",
  }, "2026-08-03T07:00:00.000Z");
  const localSessions = structuredClone(current.continuity.sessions);
  const localAudit = structuredClone(current.continuity.auditLog);
  const localActor = structuredClone(current.continuity.activeShift);

  const merged = applyCapsuleToWorkspace(current, capsule, "merge");
  assert.equal(merged.continuity.activeShift, null);
  assert.deepEqual(merged.continuity.sessions, localSessions);
  assert.deepEqual(merged.continuity.auditLog, localAudit);
  assert.doesNotMatch(JSON.stringify(merged.continuity), /Pessoa externa|CRM-EX 999/);
  assert.equal(merged.beds[0].timeline[0].author, "Importado · não verificado · Médica Teste");
  assert.equal(merged.beds[0].checklist[1].authorName, "Importado · não verificado · Coordenação externa");
  appendLocalCapsuleImportAudit(merged, capsule, "merge", localActor, "2026-08-03T08:00:00.000Z");
  assert.equal(merged.continuity.auditLog.at(-1).action, "CAPSULE_IMPORTED");
  assert.equal(merged.continuity.auditLog.at(-1).actor.doctorName, "Pessoa local");

  const replaced = applyCapsuleToWorkspace(current, capsule, "replace");
  assert.deepEqual(replaced.continuity, { activeShift: null, sessions: [], auditLog: [] });
  assert.equal(replaced.settings.doctorName, "Pessoa local");
  assert.doesNotMatch(JSON.stringify(replaced.continuity), /Pessoa externa|CRM-EX 999/);
  assert.equal(replaced.beds[0].timeline[0].author, "Importado · não verificado · Médica Teste");
  assert.equal(replaced.beds[0].checklist[1].authorName, "Importado · não verificado · Coordenação externa");
});

test("autorias importadas aparecem como não verificadas sem duplicar o marcador", () => {
  const source = populatedState();
  source.beds[0].timeline[0].author = "Importado · não verificado · Autoria anterior";
  source.beds[0].checklist.push({
    id: "coord-ja-marcada",
    text: "Revisar tarefa externa",
    priority: "media",
    due: "",
    done: false,
    suggested: false,
    source: "coordination",
    createdAt: "2026-08-03T07:30:00.000Z",
    authorName: "Importado · não verificado · Coordenação anterior",
    authorCrm: "CRM-EX 997",
  });
  const capsule = parseCapsuleText(JSON.stringify(buildCapsule(source, "bed", "L1")));
  const current = newState();
  current.settings = { ...current.settings, hospital: "Hospital Teste", unit: "UTI 2", date: "2026-08-03" };
  const merged = applyCapsuleToWorkspace(current, capsule, "merge");

  assert.equal(merged.beds[0].timeline[0].author, "Importado · não verificado · Autoria anterior");
  assert.equal(merged.beds[0].checklist[1].authorName, "Importado · não verificado · Coordenação anterior");
});

test("define os leitos cujos anexos devem ser removidos na importação", () => {
  const bedCapsule = parseCapsuleText(JSON.stringify(buildCapsule(populatedState(), "bed", "L1")));
  const shiftCapsule = parseCapsuleText(JSON.stringify(buildCapsule(populatedState(), "shift", "L1")));

  assert.deepEqual(attachmentBedIdsToClear(bedCapsule, "merge"), ["L1"]);
  assert.deepEqual(attachmentBedIdsToClear(shiftCapsule, "merge"), Array.from({ length: 10 }, (_, index) => `L${index + 1}`));
  assert.deepEqual(attachmentBedIdsToClear(bedCapsule, "replace"), Array.from({ length: 10 }, (_, index) => `L${index + 1}`));
});

test("gera TXT, Markdown e mensagem WhatsApp com as dez linhas", () => {
  const state = populatedState();
  const bed = state.beds[0];
  const txt = handoffText(bed, state.settings);
  const markdown = handoffMarkdown(bed, state.settings);
  const fullTxt = shiftText(state.settings, state.beds);
  const fullMarkdown = shiftMarkdown(state.settings, state.beds);
  const whatsapp = whatsappTextForBed(bed, state.settings);

  assert.match(txt, /10\. PENDÊNCIAS, GATILHOS E RISCOS:/);
  assert.match(markdown, /### Dez linhas executáveis/);
  assert.match(fullTxt, /HOSPITAL TESTE/i);
  assert.match(fullMarkdown, /^# Passagem de Plantão UTI/m);
  assert.match(whatsapp, /\*10\. Pendências, gatilhos e riscos:\*/);
  for (const content of [txt, markdown, fullTxt, fullMarkdown, whatsapp]) {
    assert.match(content, /Revisar perfusão/i);
    assert.match(content, /Diurese das últimas 6h/i);
    assert.match(content, /sinaliza(?:ções|dos).*IA|IA.*sinalizad/i);
    assert.match(content, /revisão médica obrigatória/i);
  }
  assert.match(txt, /PRONTUÁRIO\/ID: PRONT-1/i);
  assert.match(whatsapp, /Prontuário\/ID: PRONT-1/i);
  assert.doesNotMatch(whatsapp, /wa\.me|https:\/\//i);
});

test("a prévia de importação é obrigatória, minimizada e não usa HTML clínico", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(html, /id="capsule-preview"[^>]*hidden/);
  assert.match(html, /Arquivo não assinado e não verificado/i);
  assert.match(source, /renderCapsulePreview\(capsule\)[\s\S]{0,180}selectedCapsule[\s\S]{0,180}disabled = false/);
  assert.match(source, /minimizedPatientName\(bed\.patientName\)/);
  assert.match(source, /minimizedRecordId\(bed\.record\)/);
  const previewBuilder = source.slice(source.indexOf("function renderCapsulePreview"), source.indexOf("async function inspectCapsuleFile"));
  assert.match(previewBuilder, /textContent/);
  assert.doesNotMatch(previewBuilder, /innerHTML|insertAdjacentHTML|document\.write/);
  assert.equal(minimizedPatientName("Maria da Silva"), "M. D. S.");
  assert.equal(minimizedRecordId("DEMO-000000"), "••••0000");
  assert.doesNotMatch(minimizedPatientName("Maria da Silva"), /Maria|Silva/);
});

test("buildCapsule valida a própria saída e recusa download acima de 4 MiB", () => {
  const state = newState();
  state.settings = { ...state.settings, hospital: "Hospital Teste", unit: "UTI 2", date: "2026-08-03" };
  state.beds.forEach((bed, index) => {
    bed.patientName = `Paciente ${index + 1}`;
    bed.record = `PRONT-${index + 1}`;
    bed.clinicalText = "C".repeat(120_000);
    bed.handoff.forEach((line) => { line.text = "H".repeat(20_000); });
    bed.alerts = Array.from({ length: 50 }, () => "A".repeat(1_000));
    bed.missing = Array.from({ length: 50 }, () => "M".repeat(1_000));
  });
  assert.throws(() => buildCapsule(state, "shift", "L1"), /ultrapassa o limite de 4 MiB/i);
});

test("todos os controles da central de transferência possuem bindings", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

  for (const id of ["export-data", "transfer-dialog", "capsule-file-input", "import-capsule"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), id);
    assert.match(source, new RegExp(`#${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), id);
  }
  for (const hook of ["data-export-scope", "data-export-format", "data-whatsapp-scope", "data-export-capsule"]) {
    assert.match(html, new RegExp(hook), hook);
    const datasetProperty = hook.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    assert.match(source, new RegExp(`dataset\\.${datasetProperty}`), hook);
  }
  assert.match(source, /clearImportedBedFiles\(transaction,/);
});
