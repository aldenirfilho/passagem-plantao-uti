import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assumeShift,
  buildPrintModel,
  newState,
  printableBeds,
} from "../app.js";

function printableState() {
  const state = newState();
  state.settings = {
    ...state.settings,
    hospital: "Hospital Teste",
    unit: "UTI 2",
    city: "Cidade / CE",
    date: "2026-08-03",
    shift: "DIURNO",
  };
  assumeShift(state, {
    doctorName: "Médica Teste",
    crm: "CRM-DEMO-A",
    specialty: "Medicina Intensiva",
    rqe: "RQE 00000",
    role: "PLANTONISTA",
    careMode: "UTI_OFICIAL",
  }, "2026-08-03T07:00:00.000Z");

  const l1 = state.beds[0];
  l1.patientName = "Paciente Fictício";
  l1.age = "67";
  l1.record = "PRONT-001";
  l1.admission = "2026-08-01";
  l1.acuity = "ATENÇÃO";
  l1.handoff.forEach((line, index) => { line.text = `Linha objetiva ${index + 1}`; });
  l1.activities.evolutionDone = true;
  l1.activities.prescriptionReviewed = true;
  l1.alerts = ["Revisar perfusão"];
  l1.missing = ["Diurese das últimas 6h"];
  l1.checklist.push(
    { id: "p1", text: "Reavaliar antes da visita", priority: "alta", due: "10:00", done: false, suggested: false },
    { id: "p2", text: "Item concluído", priority: "baixa", due: "", done: true, suggested: false },
    { id: "p3", text: "Sugestão não aceita", priority: "media", due: "", done: false, suggested: true },
  );
  l1.readback = {
    receiverName: "Médico Receptor",
    receiverCrm: "CRM-DEMO-B",
    linesReviewed: true,
    risksReviewed: true,
    tasksUnderstood: true,
    confirmedAt: "2026-08-03T18:50:00.000Z",
    contentHash: "a".repeat(64),
  };

  state.beds[2].patientName = "Outro Paciente Fictício";
  state.beds[2].record = "PRONT-003";
  state.beds[2].handoff[0].text = "Contexto do L3";
  return state;
}

test("impressão de plantão inclui somente leitos preenchidos, na ordem da UTI", () => {
  const state = printableState();
  assert.deepEqual(printableBeds(state, "shift").map((bed) => bed.id), ["L1", "L3"]);

  const model = buildPrintModel(state, "shift", "L1", "2026-08-03T19:00:00.000Z");
  assert.equal(model.mode, "shift");
  assert.deepEqual(model.beds.map((bed) => bed.id), ["L1", "L3"]);
  assert.equal(model.institution.hospital, "Hospital Teste");
  assert.equal(model.professional.doctorName, "Médica Teste");
  assert.equal(model.beds[0].handoff.length, 10);
});

test("modelo impresso contém atividades, somente pendências ativas e aceite", () => {
  const model = buildPrintModel(printableState(), "bed", "L1", "2026-08-03T19:00:00.000Z");
  const bed = model.beds[0];

  assert.deepEqual(bed.activities.map((item) => item.done), [true, true, false]);
  assert.deepEqual(bed.pending, [{ text: "Reavaliar antes da visita", priority: "alta", due: "10:00" }]);
  assert.equal(bed.acceptance.confirmed, true);
  assert.equal(bed.acceptance.receiverCrm, "CRM-DEMO-B");
  assert.equal(bed.acceptance.tasksUnderstood, true);
  assert.deepEqual(bed.alerts, ["Revisar perfusão"]);
  assert.deepEqual(bed.missing, ["Diurese das últimas 6h"]);
});

test("bloqueia impressão sem dados e modo desconhecido", () => {
  const empty = newState();
  assert.throws(() => printableBeds(empty, "bed", "L1"), /não contém dados/i);
  assert.throws(() => printableBeds(empty, "shift"), /nenhum leito contém dados/i);
  assert.throws(() => printableBeds(empty, "all"), /modo de impressão desconhecido/i);
});

test("texto potencialmente hostil permanece texto no modelo e o DOM de impressão não usa innerHTML", () => {
  const state = printableState();
  const hostile = '<img src=x onerror="globalThis.comprometido=true">';
  state.beds[0].patientName = hostile;
  state.beds[0].handoff[0].text = hostile;
  const model = buildPrintModel(state, "bed", "L1");
  assert.equal(model.beds[0].patientName, hostile);
  assert.equal(model.beds[0].handoff[0].text, hostile);

  const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const domBuilder = source.slice(source.indexOf("function createPrintNode"), source.indexOf("let previousPrintTitle"));
  assert.match(domBuilder, /\.textContent\s*=/);
  assert.match(domBuilder, /Sinalizações da IA · revisão médica obrigatória/);
  assert.match(domBuilder, /Alertas sinalizados pela IA/);
  assert.match(domBuilder, /Dados críticos ausentes sinalizados pela IA/);
  assert.doesNotMatch(domBuilder, /innerHTML|insertAdjacentHTML|document\.write/);
});

test("controles PDF/impressão, modos CSS e limpeza afterprint estão conectados", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /data-print-scope="bed"[^>]*>Leito · PDF \/ Imprimir/);
  assert.match(html, /data-print-scope="shift"[^>]*>Plantão · PDF \/ Imprimir/);
  assert.match(html, /id="print-document"/);
  assert.match(source, /openBrowserPrint\(printButton\.dataset\.printScope\)/);
  assert.match(source, /#print-bed[\s\S]{0,100}openBrowserPrint\("bed"\)/);
  assert.match(source, /addEventListener\("afterprint", cleanupPrintState\)/);
  assert.match(css, /html\[data-print-mode="bed"\]/);
  assert.match(css, /html\[data-print-mode="shift"\]/);
  assert.match(css, /body > #print-document/);
});
