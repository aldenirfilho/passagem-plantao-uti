import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  acceptChecklistSuggestion,
  activityCompletionCount,
  assertClinicalIdentifiers,
  assumeShift,
  bedCharge,
  buildCapsule,
  buildPrintModel,
  clinicalActor,
  elapsedLabel,
  endShift,
  handoffText,
  hasPracticalPatientIdentifiers,
  isReadbackConfirmed,
  newState,
  opportunitiesForBed,
  opportunityDistribution,
  parseCapsuleText,
} from "../app.js";

const physician = (overrides = {}) => ({
  doctorName: "Médica Teste",
  crm: "CRM-CE 00001",
  specialty: "Medicina Intensiva",
  rqe: "RQE 00000",
  role: "PLANTONISTA",
  careMode: "UTI_OFICIAL",
  ...overrides,
});

test("assunção exige nome e CRM e registra entrada auditada", () => {
  const state = newState();
  assert.throws(() => assumeShift(state, physician({ doctorName: "" })), /nome completo e CRM/i);
  assert.throws(() => assumeShift(state, physician({ crm: "" })), /nome completo e CRM/i);

  const session = assumeShift(state, physician(), "2026-08-03T07:00:00.000Z");
  assert.equal(session.doctorName, "Médica Teste");
  assert.equal(session.startedAt, "2026-08-03T07:00:00.000Z");
  assert.equal(state.continuity.auditLog.at(-1).action, "SHIFT_ASSUMED");
});

test("próximo profissional transfere responsabilidade e o encerramento preserva histórico", () => {
  const state = newState();
  assumeShift(state, physician(), "2026-08-03T07:00:00.000Z");
  assumeShift(state, physician({ doctorName: "Médico Seguinte", crm: "CRM-CE 00002", role: "DIARISTA" }), "2026-08-03T19:00:00.000Z");

  assert.equal(state.continuity.sessions.length, 1);
  assert.equal(state.continuity.sessions[0].endReason, "TRANSFERIDO");
  assert.equal(state.continuity.activeShift.doctorName, "Médico Seguinte");
  assert.deepEqual(state.continuity.auditLog.map((event) => event.action), ["SHIFT_ASSUMED", "SHIFT_TRANSFERRED", "SHIFT_ASSUMED"]);

  const closed = endShift(state, "2026-08-04T07:00:00.000Z");
  assert.equal(closed.endReason, "ENCERRADO");
  assert.equal(state.continuity.activeShift, null);
  assert.equal(state.continuity.sessions.length, 2);
  assert.equal(state.continuity.auditLog.at(-1).action, "SHIFT_ENDED");
});

test("tempo é apenas duração informativa, sem score", () => {
  assert.equal(elapsedLabel("2026-08-03T07:00:00.000Z", "2026-08-03T09:35:00.000Z"), "2 h 35 min");
  assert.equal(elapsedLabel("2026-08-03T07:00:00.000Z", "2026-08-04T08:05:00.000Z"), "1 d 1 h 5 min");
});

test("oportunidades agregam lacunas, atividades, pendências e read-back sem ordenar leitos", () => {
  const state = newState();
  const bed = state.beds[0];
  bed.patientName = "Paciente Teste";
  bed.record = "PRONT-001";
  bed.handoff[0].text = "Contexto preenchido";
  bed.activities.evolutionDone = true;
  bed.checklist.push({ id: "p1", text: "Reavaliar", priority: "alta", due: "18h", done: false, suggested: false });
  bed.alerts = ["Alerta para revisão"];
  bed.missing = ["Lacuna para conferência"];

  assert.equal(activityCompletionCount(bed), 1);
  const row = opportunitiesForBed(bed);
  assert.equal(row.missingLines, 9);
  assert.equal(row.missingActivities.length, 2);
  assert.equal(row.activePending, 1);
  assert.equal(row.highPending, 1);
  assert.equal(row.alertCount, 1);
  assert.equal(row.missingCount, 1);
  assert.equal(row.readbackPending, true);
  assert.equal(row.total, 15);

  const distribution = opportunityDistribution(state.beds);
  assert.deepEqual(distribution.rows.map((item) => item.bedId), Array.from({ length: 10 }, (_, index) => `L${index + 1}`));
  assert.equal(distribution.registeredBeds, 1);
  assert.equal(distribution.complete, 0);
});

test("bateria representa completude e nunca chega a 100% com oportunidade ativa", () => {
  const state = newState();
  const bed = state.beds[0];
  bed.patientName = "Paciente Teste";
  bed.record = "PRONT-001";
  bed.clinicalText = "Material registrado";
  bed.handoff.forEach((line) => { line.text = "Linha preenchida"; });
  bed.activities = { evolutionDone: true, prescriptionReviewed: true, examsReviewed: true, updatedAt: null, updatedBy: "" };
  bed.readback = { receiverName: "Receptor", receiverCrm: "CRM 2", linesReviewed: true, risksReviewed: true, tasksUnderstood: true, confirmedAt: "2026-08-03T19:00:00.000Z", contentHash: "a".repeat(64) };
  assert.equal(bedCharge(bed), 100);

  for (const mutate of [
    () => { bed.alerts = ["Revisar perfusão"]; },
    () => { bed.alerts = []; bed.missing = ["Conferir diurese"]; },
    () => { bed.missing = []; bed.checklist = [{ id: "p1", text: "Reavaliar", priority: "media", due: "", done: false, suggested: false, source: "manual" }]; },
  ]) {
    mutate();
    assert.ok(bedCharge(bed) < 100);
    assert.ok(opportunitiesForBed(bed).total > 0);
    assert.equal(opportunityDistribution(state.beds).complete, 0);
  }

  const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /function radarScore\b/);
});

test("nome e prontuário/ID são obrigatórios para read-back e saídas clínicas", () => {
  const base = { id: "L1", patientName: "Paciente Teste", record: "", age: "", admission: "", clinicalText: "x", timeline: [], handoff: [], checklist: [], activities: {} };
  assert.equal(hasPracticalPatientIdentifiers({ ...base, record: "PRONT-1" }), true);
  assert.equal(hasPracticalPatientIdentifiers({ ...base, age: "67" }), false);
  assert.equal(hasPracticalPatientIdentifiers({ ...base, admission: "2026-08-01" }), false);
  assert.equal(hasPracticalPatientIdentifiers(base), false);
  assert.equal(hasPracticalPatientIdentifiers({ ...base, patientName: "", record: "PRONT-1" }), false);
  assert.equal(hasPracticalPatientIdentifiers({ ...base, patientName: "   ", age: "67" }), false);

  const state = newState();
  const bed = state.beds[0];
  bed.patientName = "Paciente sem segundo ID";
  bed.handoff.forEach((line) => { line.text = "Linha preenchida"; });
  bed.readback.confirmedAt = "2026-08-03T19:00:00.000Z";
  bed.readback.contentHash = "a".repeat(64);
  assert.equal(isReadbackConfirmed(bed), false);
  assert.throws(() => assertClinicalIdentifiers([bed], "exportar"), /dois identificadores.*L1/i);
  assert.throws(() => handoffText(bed, state.settings), /dois identificadores.*L1/i);
  assert.throws(() => buildCapsule(state, "bed", "L1"), /dois identificadores.*L1/i);
});

test("plantonista vigente centraliza autoria clínica; settings é apenas fallback", () => {
  const state = newState();
  state.settings = { ...state.settings, doctorName: "Perfil editável", crm: "CRM 000", hospital: "Hospital Teste", unit: "UTI 2", date: "2026-08-03" };
  const bed = state.beds[0];
  bed.patientName = "Paciente Teste";
  bed.record = "PRONT-1";
  bed.handoff.forEach((line) => { line.text = "Linha preenchida"; });
  assumeShift(state, physician({ doctorName: "Plantonista vigente", crm: "CRM 111" }), "2026-08-03T07:00:00.000Z");

  const actor = clinicalActor(state);
  assert.equal(actor.doctorName, "Plantonista vigente");
  const output = handoffText(bed, state.settings, actor);
  assert.match(output, /RESPONSÁVEL: PLANTONISTA VIGENTE · CRM 111/i);
  assert.doesNotMatch(output, /Perfil editável/);
  assert.equal(buildCapsule(state, "shift", "L1").data.settings.doctorName, "Plantonista vigente");
  assert.equal(buildPrintModel(state, "bed", "L1").professional.doctorName, "Plantonista vigente");

  endShift(state, "2026-08-03T19:00:00.000Z");
  assert.equal(clinicalActor(state).doctorName, "Perfil editável");
  assert.equal(buildPrintModel(state, "bed", "L1").professional.doctorName, "Perfil editável");

  const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const timeline = source.slice(source.indexOf("function addTimelineEvent"), source.indexOf("function readbackMaterial"));
  const activity = source.slice(source.indexOf("function updateBedActivity"), source.indexOf("function coordinationAuthor"));
  assert.match(timeline, /requireActiveShift\(state[\s\S]*clinicalActorLabel\(actor\)/);
  assert.match(activity, /requireActiveShift\(state/);
});

test("sugestão da IA mantém proveniência após aceite e round-trip da Cápsula", () => {
  const state = newState();
  const bed = state.beds[0];
  bed.patientName = "Paciente Teste";
  bed.record = "PRONT-1";
  bed.checklist.push({ id: "ai-1", text: "Conferir dado", priority: "media", due: "", done: false, suggested: true, source: "ai" });
  const accepted = acceptChecklistSuggestion(bed, "ai-1");
  assert.equal(accepted.suggested, false);
  assert.equal(accepted.source, "ai");
  const validated = parseCapsuleText(JSON.stringify(buildCapsule(state, "shift", "L1")));
  assert.equal(validated.data.beds[0].checklist[0].source, "ai");
  assert.equal(validated.data.beds[0].checklist[0].suggested, false);

  const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const aiResult = source.slice(source.indexOf("function applyAiResult"), source.indexOf("async function renderBedWithAI"));
  assert.match(aiResult, /suggested:\s*true,[\s\S]{0,80}source:\s*"ai"/);
  const checklistRenderer = source.slice(source.indexOf("function renderChecklist"), source.indexOf("function renderTimeline"));
  assert.match(checklistRenderer, /item\.source === "ai"[\s\S]{0,260}textContent = "ORIGEM IA"/);
  assert.match(checklistRenderer, /row\.append\(firstControl, textStack, priority, due, remove\)/);

  const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.check-origin\.is-ai\s*\{/);
});

test("linha do tempo e atividades manuais exigem plantão vigente e restauram a UI ao bloquear", () => {
  const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const timeline = source.slice(source.indexOf("function addTimelineEvent"), source.indexOf("function readbackMaterial"));
  const activity = source.slice(source.indexOf("function updateBedActivity"), source.indexOf("function coordinationAuthor"));

  assert.ok(timeline.indexOf("requireActiveShift(state") < timeline.indexOf("bed.timeline.push"));
  assert.match(timeline, /requireActiveShift\(state, "registrar uma atualização com autoria"\)/);
  assert.match(timeline, /catch \(error\)[\s\S]{0,180}renderTimeline\(\)[\s\S]{0,180}renderContinuityProfile\(\)[\s\S]{0,180}toast\(error\.message, true\)/);
  assert.ok(activity.indexOf("requireActiveShift(state") < activity.indexOf("bed.activities[field]"));
  assert.match(activity, /requireActiveShift\(state, "alterar uma atividade manual do leito"\)/);
  assert.match(activity, /catch \(error\)[\s\S]{0,180}renderBedActivities\(\)[\s\S]{0,180}renderContinuityProfile\(\)[\s\S]{0,180}toast\(error\.message, true\)/);
});

test("checklist de coordenação importado exibe autoria não verificada", () => {
  const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const checklistRenderer = source.slice(source.indexOf("function renderChecklist"), source.indexOf("function renderTimeline"));
  assert.match(checklistRenderer, /item\.authorName[\s\S]{0,160}IMPORTED_UNVERIFIED_LABEL/);
  assert.match(checklistRenderer, /origin\.textContent = `COORDENAÇÃO · \$\{item\.authorName/);

  const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.check-origin\.is-imported\s*\{/);
});

test("Cápsula preserva continuidade, atividades e autoria de coordenação sem anexos ou notificações", () => {
  const state = newState();
  assumeShift(state, physician({ role: "COORDENADOR" }), "2026-08-03T07:00:00.000Z");
  const bed = state.beds[0];
  bed.patientName = "Paciente Teste";
  bed.record = "PRONT-001";
  bed.activities = {
    evolutionDone: true,
    prescriptionReviewed: true,
    examsReviewed: false,
    updatedAt: "2026-08-03T08:00:00.000Z",
    updatedBy: "Médica Teste · CRM-CE 00001",
  };
  bed.checklist.push({
    id: "coord-task-1",
    text: "Conferir pendência operacional",
    priority: "media",
    due: "antes da visita",
    done: false,
    suggested: false,
    source: "coordination",
    createdAt: "2026-08-03T08:05:00.000Z",
    authorName: "Médica Teste",
    authorCrm: "CRM-CE 00001",
  });
  state.notifications.push({ title: "Não exportar" });

  const serialized = JSON.stringify(buildCapsule(state, "shift", "L1"));
  const validated = parseCapsuleText(serialized);
  assert.equal(validated.data.continuity.activeShift.role, "COORDENADOR");
  assert.equal(validated.data.beds[0].activities.prescriptionReviewed, true);
  assert.equal(validated.data.beds[0].checklist[0].source, "coordination");
  assert.equal(validated.data.beds[0].checklist[0].authorCrm, "CRM-CE 00001");
  assert.doesNotMatch(serialized, /notifications|OPENAI_API_KEY|blob|attachments/i);
});

test("valida tipos e limites dos novos campos da Cápsula", () => {
  const state = newState();
  assumeShift(state, physician(), "2026-08-03T07:00:00.000Z");
  const invalidActivity = buildCapsule(state, "shift", "L1");
  invalidActivity.data.beds[0].activities.examsReviewed = "sim";
  assert.throws(() => parseCapsuleText(JSON.stringify(invalidActivity)), /exames revisados.*verdadeiro ou falso/i);

  const invalidRole = buildCapsule(state, "shift", "L1");
  invalidRole.data.continuity.activeShift.role = "ADMIN";
  assert.throws(() => parseCapsuleText(JSON.stringify(invalidRole)), /papel não reconhecido/i);
});

test("mantém compatibilidade com Cápsula v1 anterior aos campos de continuidade", () => {
  const legacy = buildCapsule(newState(), "shift", "L1");
  delete legacy.data.continuity;
  for (const field of ["specialty", "rqe", "role", "careMode"]) delete legacy.data.settings[field];
  legacy.data.beds.forEach((bed) => {
    delete bed.activities;
    bed.checklist.forEach((item) => {
      for (const field of ["source", "createdAt", "authorName", "authorCrm"]) delete item[field];
    });
  });

  const validated = parseCapsuleText(JSON.stringify(legacy));
  assert.equal(validated.data.continuity.activeShift, null);
  assert.equal(validated.data.settings.role, "PLANTONISTA");
  assert.equal(validated.data.settings.careMode, "AD_HOC");
  assert.equal(validated.data.beds[0].activities.evolutionDone, false);
});

test("controles de continuidade estão presentes e possuem bindings", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  for (const id of ["assume-shift", "end-shift", "open-opportunities", "opportunity-dialog", "coordination-form"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), id);
    assert.match(source, new RegExp(`#${id}`), id);
  }
  for (const field of ["evolutionDone", "prescriptionReviewed", "examsReviewed"]) {
    assert.match(html, new RegExp(`data-activity-field=["']${field}["']`), field);
  }
});
