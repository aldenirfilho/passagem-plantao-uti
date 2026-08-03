import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { createServer } from "../server.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const axeSource = await readFile(path.join(ROOT, "node_modules", "axe-core", "axe.min.js"), "utf8");
const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "passagem-uti-qa-"));
process.env.OPENAI_API_KEY = "synthetic-test-key";

const server = createServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

const browser = await puppeteer.launch({
  args: [...chromium.args, "--no-sandbox"],
  defaultViewport: { width: 1440, height: 1100, deviceScaleFactor: 1 },
  executablePath: await chromium.executablePath(),
  headless: "shell",
});

async function axeViolations(page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    const report = await axe.run(document, { resultTypes: ["violations"] });
    return report.violations.map(({ id, impact, help, nodes }) => ({
      id,
      impact,
      help,
      targets: nodes.slice(0, 5).map((node) => node.target.join(" ")),
    }));
  });
}

async function replace(page, selector, value) {
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type(selector, value);
}

async function settleThemeTransition() {
  await new Promise((resolve) => setTimeout(resolve, 250));
}

async function validateApp() {
  const page = await browser.newPage();
  page.setDefaultTimeout(10_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.url().endsWith("/api/render") && request.method() === "POST") {
      void request.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          patient_name: "Paciente Fictício A",
          bed: "L1",
          acuity: "ATENÇÃO",
          handoff: Array.from({ length: 10 }, (_, index) => ({
            number: index + 1,
            label: `Tópico ${index + 1}`,
            text: `Informação clínica sintética da linha ${index + 1}.`,
          })),
          checklist_suggestions: [{ text: "Reavaliar parâmetro sintético", priority: "alta", due: "18h" }],
          safety_alerts: ["Alerta exclusivamente sintético"],
          missing_critical_data: ["Dado sintético não informado"],
        }),
      });
      return;
    }
    void request.continue();
  });

  await page.goto(baseUrl, { waitUntil: "networkidle0" });
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase("passagem_uti_v2");
      request.onsuccess = request.onerror = request.onblocked = resolve;
    });
  });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".battery-card");
  await page.evaluate(() => {
    window.__qaConfirmations = [];
    window.__qaPrintCalled = false;
    window.confirm = (message) => {
      window.__qaConfirmations.push(String(message));
      return false;
    };
    window.print = () => { window.__qaPrintCalled = true; };
  });

  await replace(page, '[data-setting="doctorName"]', "Dra. Helena Demo");
  await replace(page, '[data-setting="crm"]', "CRM-XX 00000");
  await replace(page, '[data-setting="specialty"]', "Medicina Intensiva");
  await replace(page, '[data-setting="rqe"]', "RQE 00000");
  await replace(page, '[data-setting="city"]', "Cidade Fictícia / BR");
  await replace(page, '[data-setting="hospital"]', "Hospital Demonstração");
  await replace(page, '[data-setting="unit"]', "UTI Adulto 1");
  await page.select('[data-setting="role"]', "COORDENADOR");
  await page.select('[data-setting="careMode"]', "UTI_OFICIAL");
  await page.click("#assume-shift");
  await page.waitForFunction(() => document.querySelector("#continuity-title")?.textContent === "Dra. Helena Demo");

  await replace(page, "#patient-name", "Paciente Fictício A");
  await replace(page, "#patient-age", "67");
  await replace(page, "#patient-record", "DEMO-001");
  await replace(page, "#clinical-source", "Caso exclusivamente sintético para teste reproduzível.");
  await page.click("#generate-handoff");
  await page.waitForFunction(() => document.querySelector("#render-count")?.textContent === "10/10");
  for (const selector of [
    '[data-activity-field="evolutionDone"]',
    '[data-activity-field="prescriptionReviewed"]',
    '[data-activity-field="examsReviewed"]',
  ]) await page.click(selector);
  await page.click("#tab-button-checklist");
  await page.click(".check-item.is-suggestion[data-priority='alta'] .suggestion-accept");

  await page.click('[data-bed-id="L2"]');
  await replace(page, "#patient-name", "Paciente Fictício B");
  await replace(page, "#patient-record", "DEMO-002");
  await page.click("#tab-button-render");
  await replace(page, "#handoff-lines textarea", "Contexto sintético do segundo leito.");
  await page.click('[data-bed-id="L1"]');

  await page.click("#open-opportunities");
  await page.waitForSelector("#opportunity-dialog[open]");
  await page.select("#coordination-kind", "TASK");
  await page.type("#coordination-text", "Confirmar reconciliação sintética antes da visita.");
  await page.type("#coordination-due", "antes da visita");
  await page.click('#coordination-form button[type="submit"]');
  assert.deepEqual(await axeViolations(page), [], "axe: diálogo de oportunidades");
  await page.click('[data-close-dialog="opportunity-dialog"]');

  await page.select("#theme-select", "dark");
  await settleThemeTransition();
  assert.deepEqual(await axeViolations(page), [], "axe: tema escuro");
  await page.click("#export-data");
  await page.waitForSelector("#transfer-dialog[open]");
  assert.deepEqual(await axeViolations(page), [], "axe: central de transferência");
  await page.click('[data-whatsapp-scope="bed"]');
  const confirmation = await page.evaluate(() => window.__qaConfirmations.at(-1));
  assert.match(confirmation, /serviço externo/i);

  await page.click('[data-print-scope="shift"]');
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.deepEqual(await page.evaluate(() => ({
    called: window.__qaPrintCalled,
    mode: document.documentElement.dataset.printMode,
    articles: document.querySelectorAll("#print-document .print-bed-sheet").length,
    injectedImages: document.querySelectorAll("#print-document img").length,
  })), { called: true, mode: "shift", articles: 2, injectedImages: 0 });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  assert.deepEqual(await page.evaluate(() => ({
    mode: document.documentElement.dataset.printMode || null,
    articles: document.querySelectorAll("#print-document .print-bed-sheet").length,
  })), { mode: null, articles: 0 });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.select("#theme-select", "light");
  await settleThemeTransition();
  assert.deepEqual(await axeViolations(page), [], "axe: viewport móvel");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, "overflow móvel");
  assert.equal(errors.length, 0, `erros de navegador: ${errors.join(" | ")}`);
  await page.close();
  return { renderedLines: 10, occupiedBeds: 2, axeStates: 4, consoleErrors: 0 };
}

async function validateTutorial() {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await page.goto(`${baseUrl}/tutorial.html`, { waitUntil: "networkidle0" });
  assert.equal(response.status(), 200);
  const desktop = await page.evaluate(() => ({
    sections: document.querySelectorAll("main section").length,
    imagesLoaded: [...document.images].every((item) => item.complete && item.naturalWidth > 0),
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    missingTargets: [...document.querySelectorAll('a[href^="#"]')]
      .map((link) => link.getAttribute("href"))
      .filter((href) => href !== "#" && !document.querySelector(href)),
  }));
  assert.equal(desktop.sections, 16);
  assert.equal(desktop.imagesLoaded, true);
  assert.equal(desktop.overflow, false);
  assert.deepEqual(desktop.missingTargets, []);
  assert.deepEqual(await axeViolations(page), [], "axe: tutorial desktop");

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, "overflow tutorial móvel");
  assert.deepEqual(await axeViolations(page), [], "axe: tutorial móvel");

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.emulateMediaType("print");
  const pdfPath = path.join(temporaryDirectory, "tutorial-v5-qa.pdf");
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true, preferCSSPageSize: true });
  assert.ok((await stat(pdfPath)).size > 100_000, "PDF temporário vazio ou incompleto");
  assert.equal(errors.length, 0, `erros no tutorial: ${errors.join(" | ")}`);
  await page.close();
  return { sections: 16, imagesLoaded: 4, axeStates: 2, pdfGenerated: true };
}

try {
  const app = await validateApp();
  const tutorial = await validateTutorial();
  console.log(JSON.stringify({ ok: true, app, tutorial }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(temporaryDirectory, { recursive: true, force: true });
}
