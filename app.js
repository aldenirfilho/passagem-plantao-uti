const HANDOFF_LABELS = [
  "Identificação e contexto",
  "Diagnósticos e problemas ativos",
  "Últimas 24h / intercorrências",
  "Neurológico, sedação e dor",
  "Respiratório e via aérea",
  "Hemodinâmica, renal e metabólico",
  "Infecção, antimicrobianos e culturas",
  "Nutrição, dispositivos e profilaxias",
  "Plano e metas do próximo plantão",
  "Pendências, gatilhos e riscos",
];

const DB_NAME = "passagem_uti_v2";
const DB_VERSION = 1;
const STATE_KEY = "workspace";
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_ANALYSIS_SIZE = 22 * 1024 * 1024;
const MAX_CLINICAL_TEXT = 120_000;
const BATCH_CONCURRENCY = 3;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function localISODate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function newHandoff() {
  return HANDOFF_LABELS.map((label, index) => ({ number: index + 1, label, text: "" }));
}

function newReadback() {
  return {
    receiverName: "",
    receiverCrm: "",
    linesReviewed: false,
    risksReviewed: false,
    tasksUnderstood: false,
    confirmedAt: null,
    contentHash: "",
  };
}

function newBed(index) {
  return {
    id: `L${index}`,
    patientName: "",
    age: "",
    record: "",
    admission: "",
    acuity: "NÃO DEFINIDO",
    clinicalText: "",
    handoff: newHandoff(),
    checklist: [],
    timeline: [],
    readback: newReadback(),
    alerts: [],
    missing: [],
    aiAcuity: "",
    renderFingerprint: "",
    updatedAt: null,
  };
}

function newState() {
  return {
    version: 3,
    activeBedId: "L1",
    activeTab: "render",
    settings: {
      staffId: "",
      doctorName: "",
      crm: "",
      city: "",
      hospital: "",
      unit: "UTI 1",
      shift: "DIURNO",
      date: localISODate(),
    },
    beds: Array.from({ length: 10 }, (_, index) => newBed(index + 1)),
    savedAt: null,
  };
}

let state = newState();
let db;
let saveTimer;
let activeLoadingTimer;
let cancelRequested = false;
let analysisInProgress = false;
const activeRequestControllers = new Set();
let commandSelection = 0;
let visibleCommands = [];

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("kv")) database.createObjectStore("kv");
      if (!database.objectStoreNames.contains("files")) {
        const store = database.createObjectStore("files", { keyPath: "id" });
        store.createIndex("bedId", "bedId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadState() {
  const transaction = db.transaction("kv", "readonly");
  const saved = await requestToPromise(transaction.objectStore("kv").get(STATE_KEY));
  if (!saved || !Array.isArray(saved.beds)) return;

  state = {
    ...newState(),
    ...saved,
    version: 3,
    settings: { ...newState().settings, ...(saved.settings || {}) },
    beds: Array.from({ length: 10 }, (_, index) => ({
      ...newBed(index + 1),
      ...(saved.beds[index] || {}),
      handoff: HANDOFF_LABELS.map((label, lineIndex) => ({
        number: lineIndex + 1,
        label,
        text: saved.beds[index]?.handoff?.[lineIndex]?.text || "",
      })),
      checklist: Array.isArray(saved.beds[index]?.checklist)
        ? saved.beds[index].checklist.map((item) => ({ suggested: false, ...item }))
        : [],
      timeline: Array.isArray(saved.beds[index]?.timeline) ? saved.beds[index].timeline : [],
      readback: { ...newReadback(), ...(saved.beds[index]?.readback || {}) },
    })),
  };
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveState(), 300);
}

async function saveState() {
  clearTimeout(saveTimer);
  state.savedAt = new Date().toISOString();
  const transaction = db.transaction("kv", "readwrite");
  transaction.objectStore("kv").put(structuredClone(state), STATE_KEY);
  await transactionDone(transaction);
  updateSavedLabel();
}

function activeBed() {
  return state.beds.find((bed) => bed.id === state.activeBedId) || state.beds[0];
}

async function filesForBed(bedId) {
  const transaction = db.transaction("files", "readonly");
  const index = transaction.objectStore("files").index("bedId");
  return requestToPromise(index.getAll(IDBKeyRange.only(bedId)));
}

async function putFile(record) {
  const transaction = db.transaction("files", "readwrite");
  transaction.objectStore("files").put(record);
  return transactionDone(transaction);
}

async function deleteFile(id) {
  const transaction = db.transaction("files", "readwrite");
  transaction.objectStore("files").delete(id);
  return transactionDone(transaction);
}

async function deleteFilesForBed(bedId) {
  const files = await filesForBed(bedId);
  const transaction = db.transaction("files", "readwrite");
  const store = transaction.objectStore("files");
  files.forEach((file) => store.delete(file.id));
  return transactionDone(transaction);
}

function bedCharge(bed) {
  const completedLines = bed.handoff.filter((line) => line.text.trim()).length;
  let charge = 0;
  if (bed.patientName.trim()) charge += 12;
  if (bed.clinicalText.trim()) charge += 18;
  charge += completedLines * 6;
  if (bed.checklist.length) charge += 10;
  return Math.min(100, charge);
}

function pendingCount(bed) {
  return bed.checklist.filter((item) => !item.done && !item.suggested).length;
}

function bedHasData(bed) {
  return Boolean(
    bed.patientName.trim()
    || bed.clinicalText.trim()
    || bed.timeline.length
    || bed.handoff.some((line) => line.text.trim())
    || bed.checklist.length,
  );
}

function isReadbackConfirmed(bed) {
  return Boolean(bed.readback?.confirmedAt && bed.readback?.contentHash);
}

function invalidateReadback(bed) {
  if (!bed.readback) bed.readback = newReadback();
  bed.readback.confirmedAt = null;
  bed.readback.contentHash = "";
}

function localDateTimeValue(value = new Date()) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function renderBatteryRail() {
  const rail = $("#bed-rail");
  rail.replaceChildren();

  state.beds.forEach((bed) => {
    const charge = bedCharge(bed);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `battery-card${bed.id === state.activeBedId ? " is-active" : ""}`;
    button.dataset.bedId = bed.id;
    button.dataset.acuity = bed.acuity;
    button.dataset.received = String(isReadbackConfirmed(bed));
    button.setAttribute("role", "listitem");
    button.setAttribute("aria-label", `${bed.id}, ${bed.patientName || "vazio"}, ${charge}% preparado${isReadbackConfirmed(bed) ? ", recebido" : ""}`);

    const shell = document.createElement("span");
    shell.className = "battery-shell";
    const level = document.createElement("span");
    level.className = "battery-level";
    level.style.height = `${Math.max(5, charge)}%`;
    const label = document.createElement("span");
    label.className = "battery-label";
    label.innerHTML = `<strong>${bed.id}</strong><span>${charge}%</span>`;
    shell.append(level, label);

    const patient = document.createElement("span");
    patient.className = "battery-patient";
    patient.textContent = bed.patientName || "LEITO VAZIO";
    button.append(shell, patient);
    rail.append(button);
  });

  $("#metric-ready").textContent = state.beds.filter(isReadbackConfirmed).length;
  $("#metric-pending").textContent = state.beds.reduce((sum, bed) => sum + pendingCount(bed), 0);
  $("#metric-critical").textContent = state.beds.filter((bed) => bed.acuity === "CRÍTICO").length;
}

function renderSettings() {
  $$('[data-setting]').forEach((input) => {
    input.value = state.settings[input.dataset.setting] || "";
  });
}

function renderWorkspace() {
  const bed = activeBed();
  $("#active-bed-number").textContent = bed.id;
  $("#active-bed-title").textContent = bed.patientName || "Paciente não identificado";
  $("#active-bed-subtitle").textContent = bed.updatedAt
    ? `Atualizado em ${formatDateTime(bed.updatedAt)} · ${bedCharge(bed)}% preparado`
    : "Insira o material clínico para iniciar.";
  $("#bed-acuity").value = bed.acuity;
  $("#patient-name").value = bed.patientName;
  $("#patient-age").value = bed.age;
  $("#patient-record").value = bed.record;
  $("#patient-admission").value = bed.admission;
  $("#clinical-source").value = bed.clinicalText;
  $("#source-character-count").textContent = `${bed.clinicalText.length.toLocaleString("pt-BR")} caracteres`;

  renderHandoff();
  renderChecklist();
  renderAlerts();
  renderTimeline();
  renderReadback();
  applyTab(state.activeTab);
  void renderFiles();
  renderBatteryRail();
}

function renderHandoff() {
  const bed = activeBed();
  const list = $("#handoff-lines");
  list.replaceChildren();

  bed.handoff.forEach((line, index) => {
    const item = document.createElement("li");
    item.className = `handoff-line${line.text.trim() ? " has-content" : ""}`;

    const number = document.createElement("span");
    number.className = "handoff-line-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const label = document.createElement("span");
    label.className = "handoff-line-label";
    label.textContent = HANDOFF_LABELS[index];

    const textarea = document.createElement("textarea");
    textarea.dataset.lineIndex = String(index);
    textarea.rows = 2;
    textarea.value = line.text;
    textarea.placeholder = "Aguardando dados…";
    textarea.setAttribute("aria-label", `Linha ${index + 1}: ${HANDOFF_LABELS[index]}`);

    item.append(number, label, textarea);
    list.append(item);
  });

  $("#render-count").textContent = `${bed.handoff.filter((line) => line.text.trim()).length}/10`;
}

function renderAlerts() {
  const bed = activeBed();
  const area = $("#alerts-area");
  area.replaceChildren();

  if (bed.aiAcuity) {
    const suggestion = document.createElement("div");
    suggestion.className = "alert-card is-ai-suggestion";
    suggestion.textContent = `CLASSIFICAÇÃO SUGERIDA PELA IA · ${bed.aiAcuity} · confirme manualmente no campo Estado`;
    area.append(suggestion);
  }

  bed.alerts.forEach((text) => {
    const alert = document.createElement("div");
    alert.className = "alert-card";
    alert.textContent = `ALERTA · ${text}`;
    area.append(alert);
  });
  if (bed.missing.length) {
    const missing = document.createElement("div");
    missing.className = "alert-card is-missing";
    missing.textContent = `DADOS CRÍTICOS AUSENTES · ${bed.missing.join(" · ")}`;
    area.append(missing);
  }
}

function renderChecklist() {
  const bed = activeBed();
  const container = $("#checklist-items");
  container.replaceChildren();

  if (!bed.checklist.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<p><strong>Nenhuma pendência registrada.</strong><br />Adicione uma ação ou gere sugestões a partir do material clínico.</p>";
    container.append(empty);
  }

  bed.checklist.forEach((item) => {
    const row = document.createElement("div");
    row.className = `check-item${item.done ? " is-done" : ""}${item.suggested ? " is-suggestion" : ""}`;
    row.dataset.checkId = item.id;
    row.dataset.priority = item.priority;

    let firstControl;
    if (item.suggested) {
      const accept = document.createElement("button");
      accept.type = "button";
      accept.className = "suggestion-accept";
      accept.dataset.acceptCheck = item.id;
      accept.textContent = "✓";
      accept.title = "Aceitar sugestão da IA";
      accept.setAttribute("aria-label", `Aceitar sugestão ${item.text || "da IA"}`);
      firstControl = accept;
    } else {
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.className = "check-toggle";
      toggle.checked = item.done;
      toggle.dataset.checkField = "done";
      toggle.setAttribute("aria-label", `Concluir ${item.text || "pendência"}`);
      firstControl = toggle;
    }

    const text = document.createElement("input");
    text.className = "check-text";
    text.value = item.text;
    text.dataset.checkField = "text";
    text.placeholder = "Ação concreta";
    text.setAttribute("aria-label", "Descrição da pendência");

    const priority = document.createElement("select");
    priority.dataset.checkField = "priority";
    priority.setAttribute("aria-label", "Prioridade");
    [
      ["alta", "Alta"],
      ["media", "Média"],
      ["baixa", "Baixa"],
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = item.priority === value;
      priority.append(option);
    });

    const due = document.createElement("input");
    due.className = "check-due";
    due.value = item.due;
    due.dataset.checkField = "due";
    due.placeholder = "Quando?";
    due.setAttribute("aria-label", "Prazo ou gatilho");

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "check-remove";
    remove.dataset.removeCheck = item.id;
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Excluir pendência");

    row.append(firstControl, text, priority, due, remove);
    container.append(row);
  });

  const activeItems = bed.checklist.filter((item) => !item.suggested);
  const suggestions = bed.checklist.length - activeItems.length;
  const done = activeItems.filter((item) => item.done).length;
  const total = activeItems.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  $("#check-progress-bar").style.width = `${percent}%`;
  $("#check-progress-label").textContent = `${done} de ${total} concluídas${suggestions ? ` · ${suggestions} sugestão${suggestions === 1 ? "" : "ões"} aguardando aceite` : ""}`;
  $("#check-count").textContent = String(pendingCount(bed));
}

function renderTimeline() {
  const bed = activeBed();
  const list = $("#timeline-list");
  list.replaceChildren();
  if (!$("#timeline-at").value) $("#timeline-at").value = localDateTimeValue();

  const events = [...bed.timeline].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  if (!events.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<p><strong>Nenhuma atualização registrada.</strong><br />Use esta linha do tempo para o que mudou depois da evolução.</p>";
    list.append(empty);
    return;
  }

  events.forEach((event) => {
    const row = document.createElement("article");
    row.className = "timeline-event";
    row.dataset.eventId = event.id;

    const meta = document.createElement("div");
    meta.className = "timeline-event-meta";
    const type = document.createElement("strong");
    type.textContent = event.type;
    const time = document.createElement("span");
    time.textContent = formatDateTime(event.at);
    meta.append(type, time);

    const text = document.createElement("p");
    text.className = "timeline-event-text";
    text.textContent = event.text;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "timeline-remove";
    remove.dataset.removeEvent = event.id;
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Excluir atualização");

    row.append(meta, text, remove);
    list.append(row);
  });
}

function renderReadback() {
  const readback = activeBed().readback || newReadback();
  $("#receiver-name").value = readback.receiverName || "";
  $("#receiver-crm").value = readback.receiverCrm || "";
  $$('[data-readback-field]').forEach((input) => {
    input.checked = Boolean(readback[input.dataset.readbackField]);
  });

  const status = $("#readback-status");
  const confirmed = Boolean(readback.confirmedAt);
  status.classList.toggle("is-confirmed", confirmed);
  status.textContent = confirmed ? `Confirmado em ${formatDateTime(readback.confirmedAt)}` : "Ainda não confirmado";
}

async function renderFiles() {
  const requestedBedId = state.activeBedId;
  const files = (await filesForBed(requestedBedId)).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  if (requestedBedId !== state.activeBedId) return;

  const grid = $("#file-grid");
  grid.replaceChildren();

  if (!files.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<p><strong>O cofre deste leito está vazio.</strong><br />As imagens e os documentos ficam armazenados localmente.</p>";
    grid.append(empty);
  }

  files.forEach((file) => {
    const card = document.createElement("article");
    card.className = "file-card";

    const preview = document.createElement("div");
    preview.className = "file-preview";
    if (file.type.startsWith("image/")) {
      const image = document.createElement("img");
      const objectUrl = URL.createObjectURL(file.blob);
      image.src = objectUrl;
      image.alt = "Prévia do exame";
      image.onload = () => URL.revokeObjectURL(objectUrl);
      preview.append(image);
    } else {
      preview.textContent = fileExtension(file.name);
    }

    const info = document.createElement("div");
    info.className = "file-info";
    const name = document.createElement("strong");
    name.textContent = file.name;
    const meta = document.createElement("span");
    meta.textContent = `${formatBytes(file.size)} · ${formatDateTime(file.addedAt)}`;
    const selectLabel = document.createElement("label");
    selectLabel.className = "file-select";
    const select = document.createElement("input");
    select.type = "checkbox";
    select.checked = file.selected !== false;
    select.dataset.selectFile = file.id;
    selectLabel.append(select, document.createTextNode("Incluir na análise GPT"));
    info.append(name, meta, selectLabel);

    const controls = document.createElement("div");
    controls.className = "file-controls";
    const download = document.createElement("button");
    download.type = "button";
    download.dataset.downloadFile = file.id;
    download.title = "Baixar arquivo";
    download.textContent = "⇩";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.deleteFile = file.id;
    remove.title = "Excluir arquivo";
    remove.textContent = "×";
    controls.append(download, remove);

    card.append(preview, info, controls);
    grid.append(card);
  });

  const selected = files.filter((file) => file.selected !== false);
  $("#vault-total-files").textContent = String(files.length);
  $("#vault-total-size").textContent = formatBytes(files.reduce((sum, file) => sum + file.size, 0));
  $("#vault-selected-files").textContent = String(selected.length);
  $("#file-count").textContent = String(files.length);
  $("#generate-caption").textContent = `Texto + ${selected.length} anexo${selected.length === 1 ? "" : "s"} selecionado${selected.length === 1 ? "" : "s"}`;
}

function applyTab(tabName) {
  const known = ["render", "vault", "checklist"];
  const tab = known.includes(tabName) ? tabName : "render";
  state.activeTab = tab;

  $$(".tab").forEach((button) => {
    const isActive = button.dataset.tab === tab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  known.forEach((name) => {
    const panel = $(`#tab-${name}`);
    const isActive = name === tab;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });
}

async function addFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  const bedId = state.activeBedId;

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      toast(`${file.name}: arquivo maior que 15 MB.`, true);
      continue;
    }
    await putFile({
      id: crypto.randomUUID(),
      bedId,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      lastModified: file.lastModified,
      blob: file,
      selected: true,
      addedAt: new Date().toISOString(),
    });
  }

  const bed = state.beds.find((candidate) => candidate.id === bedId);
  if (bed) {
    bed.updatedAt = new Date().toISOString();
    invalidateReadback(bed);
    scheduleSave();
  }

  await renderFiles();
  renderBatteryRail();
  toast(`${files.length} arquivo${files.length === 1 ? " adicionado" : "s adicionados"} ao ${bedId}.`);
}

function addChecklistItem(seed = {}) {
  const bed = activeBed();
  bed.checklist.push({
    id: crypto.randomUUID(),
    text: seed.text || "",
    priority: seed.priority || "media",
    due: seed.due || "",
    done: false,
    suggested: Boolean(seed.suggested),
  });
  bed.updatedAt = new Date().toISOString();
  invalidateReadback(bed);
  renderChecklist();
  renderBatteryRail();
  scheduleSave();
}

function fileToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function analysisTextForBed(bed) {
  const timeline = [...bed.timeline]
    .sort((a, b) => String(a.at).localeCompare(String(b.at)))
    .map((event) => `[${formatDateTime(event.at)}] ${event.type}: ${event.text}`);
  return [
    bed.clinicalText.trim(),
    timeline.length ? `ATUALIZAÇÕES CRONOLÓGICAS DO PLANTÃO:\n${timeline.join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
}

async function prepareBedAnalysis(bed) {
  const selectedFiles = (await filesForBed(bed.id)).filter((file) => file.selected !== false);
  if (selectedFiles.length > 8) throw new Error(`${bed.id}: selecione no máximo 8 anexos.`);
  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_ANALYSIS_SIZE) {
    throw new Error(`${bed.id}: anexos acima de 22 MB; desmarque alguns arquivos.`);
  }

  const clinicalText = analysisTextForBed(bed);
  if (clinicalText.length > MAX_CLINICAL_TEXT) {
    throw new Error(`${bed.id}: texto acima de 120.000 caracteres; divida o material antes de enviar.`);
  }
  if (!clinicalText && !selectedFiles.length) throw new Error(`${bed.id}: adicione texto ou pelo menos um arquivo.`);

  const fingerprint = await sha256(JSON.stringify({
    bed: bed.id,
    patientName: bed.patientName,
    age: bed.age,
    record: bed.record,
    admission: bed.admission,
    medicalAcuity: bed.acuity,
    clinicalText,
    files: selectedFiles.map(({ id, name, type, size, lastModified }) => ({ id, name, type, size, lastModified })),
  }));
  return { selectedFiles, clinicalText, fingerprint };
}

function applyAiResult(bed, result, fingerprint) {
  bed.patientName = bed.patientName || result.patient_name || "";
  bed.aiAcuity = result.acuity || "";
  bed.handoff = HANDOFF_LABELS.map((label, index) => ({
    number: index + 1,
    label,
    text: String(result.handoff?.[index]?.text || "").trim(),
  }));
  bed.alerts = Array.isArray(result.safety_alerts) ? result.safety_alerts.slice(0, 8) : [];
  bed.missing = Array.isArray(result.missing_critical_data) ? result.missing_critical_data.slice(0, 12) : [];

  const existing = new Set(bed.checklist.map((item) => item.text.trim().toLocaleLowerCase("pt-BR")));
  (result.checklist_suggestions || []).slice(0, 12).forEach((suggestion) => {
    const text = String(suggestion.text || "").trim();
    const key = text.toLocaleLowerCase("pt-BR");
    if (!text || existing.has(key)) return;
    existing.add(key);
    bed.checklist.push({
      id: crypto.randomUUID(),
      text,
      priority: suggestion.priority || "media",
      due: suggestion.due || "",
      done: false,
      suggested: true,
    });
  });

  bed.renderFingerprint = fingerprint;
  bed.updatedAt = new Date().toISOString();
  invalidateReadback(bed);
}

async function renderBedWithAI(bed, { force = false } = {}) {
  const sourceVersion = bed.updatedAt;
  const prepared = await prepareBedAnalysis(bed);
  const alreadyRendered = bed.renderFingerprint === prepared.fingerprint
    && bed.handoff.every((line) => line.text.trim());
  if (alreadyRendered && !force) return { status: "skipped" };

  const attachments = await Promise.all(prepared.selectedFiles.map(async (file) => ({
    name: file.name,
    type: file.type,
    data: await fileToDataURL(file.blob),
  })));
  if (cancelRequested) throw Object.assign(new Error("Renderização cancelada."), { name: "AbortError" });
  if (bed.updatedAt !== sourceVersion) {
    throw new Error(`${bed.id}: o conteúdo mudou antes do envio; a análise foi cancelada.`);
  }

  const controller = new AbortController();
  activeRequestControllers.add(controller);
  try {
    const response = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: {
          bed: bed.id,
          patientName: bed.patientName,
          age: bed.age,
          record: bed.record,
          admission: bed.admission,
          medicalAcuity: bed.acuity,
        },
        clinicalText: prepared.clinicalText,
        attachments,
      }),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Não foi possível renderizar ${bed.id}.`);
    if (bed.updatedAt !== sourceVersion) {
      throw new Error(`${bed.id}: o conteúdo mudou durante a análise; a resposta antiga foi descartada.`);
    }
    applyAiResult(bed, result, prepared.fingerprint);
    return { status: "rendered" };
  } finally {
    activeRequestControllers.delete(controller);
  }
}

async function generateHandoff({ force = false } = {}) {
  if (analysisInProgress) return toast("Já existe uma análise em andamento.", true);
  const bed = activeBed();
  analysisInProgress = true;
  cancelRequested = false;
  showLoading(true);
  try {
    let outcome = await renderBedWithAI(bed, { force });
    if (outcome.status === "skipped") {
      showLoading(false);
      const rerender = window.confirm("Nada mudou desde a última renderização. Deseja consumir uma nova análise mesmo assim?");
      if (!rerender) return;
      showLoading(true);
      outcome = await renderBedWithAI(bed, { force: true });
    }
    await saveState();
    renderWorkspace();
    applyTab("render");
    toast(`${bed.id} renderizado: revise as 10 linhas e aceite as sugestões necessárias.`);
  } catch (error) {
    const message = error.name === "AbortError" ? "Renderização cancelada." : error.message || "Falha na renderização.";
    toast(message, error.name !== "AbortError");
  } finally {
    showLoading(false);
    analysisInProgress = false;
  }
}

async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runner() {
    while (!cancelRequested) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = { status: error.name === "AbortError" ? "cancelled" : "failed", error };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runner()));
  return results;
}

async function renderAllBeds() {
  if (analysisInProgress) return toast("Já existe uma análise em andamento.", true);
  let eligibility;
  try {
    eligibility = await Promise.all(state.beds.map(async (bed) => {
      if (analysisTextForBed(bed)) return true;
      return (await filesForBed(bed.id)).some((file) => file.selected !== false);
    }));
  } catch {
    return toast("Não foi possível ler o cofre local para iniciar o modo Turbo.", true);
  }
  const beds = state.beds.filter((_, index) => eligibility[index]);
  if (!beds.length) return toast("Nenhum leito possui material para renderizar.", true);
  if (!window.confirm(`O modo Turbo analisará até ${beds.length} leito${beds.length === 1 ? "" : "s"} usando a mesma chave da API, com no máximo ${BATCH_CONCURRENCY} requisições simultâneas. Continuar?`)) return;

  analysisInProgress = true;
  cancelRequested = false;
  let completed = 0;
  showLoading(true, {
    title: "Modo Turbo nos leitos ocupados",
    description: `0 de ${beds.length} processados · entradas sem alteração serão ignoradas`,
  });

  try {
    const results = await runPool(beds, BATCH_CONCURRENCY, async (bed) => {
      try {
        return await renderBedWithAI(bed);
      } finally {
        completed += 1;
        updateLoading("Modo Turbo nos leitos ocupados", `${completed} de ${beds.length} processados · último: ${bed.id}`);
      }
    });

    await saveState();
    renderWorkspace();
    const rendered = results.filter((result) => result?.status === "rendered").length;
    const skipped = results.filter((result) => result?.status === "skipped").length;
    const failed = results.filter((result) => result?.status === "failed").length;
    const cancelled = cancelRequested || results.some((result) => result?.status === "cancelled");
    toast(
      cancelled
        ? `Turbo cancelado · ${rendered} concluído${rendered === 1 ? "" : "s"}.`
        : `Turbo finalizado · ${rendered} novo${rendered === 1 ? "" : "s"}, ${skipped} sem mudanças${failed ? `, ${failed} com falha` : ""}.`,
      Boolean(failed),
    );
  } catch (error) {
    toast(error.message || "O modo Turbo não pôde ser concluído.", true);
  } finally {
    showLoading(false);
    analysisInProgress = false;
  }
}

function updateLoading(title, description) {
  $("#loading-title").textContent = title;
  $("#loading-description").textContent = description;
}

function showLoading(show, copy = {}) {
  const overlay = $("#loading-overlay");
  overlay.hidden = !show;
  $("#generate-handoff").disabled = show;
  $("#render-all").disabled = show;
  clearInterval(activeLoadingTimer);
  if (!show) return;

  updateLoading(copy.title || "Construindo as 10 linhas…", copy.description || "Extraindo fatos, separando riscos e convertendo o plano em execução.");

  const steps = $$(".loading-steps span", overlay);
  let index = 0;
  activeLoadingTimer = setInterval(() => {
    steps.forEach((step, stepIndex) => step.classList.toggle("is-active", stepIndex === index));
    index = (index + 1) % steps.length;
  }, 900);
}

function handoffText(bed) {
  const header = [
    `PASSAGEM DE PLANTÃO · ${state.settings.unit || "UTI"}`,
    `${bed.id} · ${bed.patientName || "PACIENTE NÃO IDENTIFICADO"}${bed.age ? ` · ${bed.age} ANOS` : ""} · ${bed.acuity}`,
  ];
  const lines = bed.handoff.map((line, index) => `${index + 1}. ${HANDOFF_LABELS[index].toUpperCase()}: ${line.text.trim() || "NÃO INFORMADO"}`);
  const pending = bed.checklist
    .filter((item) => !item.done && !item.suggested)
    .map((item) => `☐ ${item.text}${item.due ? ` · ${item.due}` : ""}`);
  const timeline = [...bed.timeline]
    .sort((a, b) => String(a.at).localeCompare(String(b.at)))
    .slice(-8)
    .map((event) => `• ${formatDateTime(event.at)} · ${event.type}: ${event.text}`);
  const receipt = isReadbackConfirmed(bed)
    ? [`RECEBIDO POR: ${bed.readback.receiverName} · ${bed.readback.receiverCrm} · ${formatDateTime(bed.readback.confirmedAt)}`]
    : [];
  return [
    ...header,
    "",
    ...lines,
    ...(timeline.length ? ["", "ATUALIZAÇÕES DO PLANTÃO:", ...timeline] : []),
    ...(pending.length ? ["", "PENDÊNCIAS:", ...pending] : []),
    ...(receipt.length ? ["", ...receipt] : []),
  ].join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

async function copyActiveBed() {
  await copyText(handoffText(activeBed()));
  toast(`${activeBed().id} copiado para a área de transferência.`);
}

async function copyAllBeds() {
  const occupied = state.beds.filter(bedHasData);
  if (!occupied.length) return toast("Nenhum leito contém dados para copiar.", true);

  const heading = [
    `PASSAGEM DE PLANTÃO · ${state.settings.hospital || "HOSPITAL NÃO INFORMADO"} · ${state.settings.unit || "UTI"}`,
    `${state.settings.date || "DATA NÃO INFORMADA"} · ${state.settings.shift || "TURNO NÃO INFORMADO"}`,
    `MÉDICO: ${state.settings.doctorName || "NÃO INFORMADO"} · ${state.settings.crm || "CRM NÃO INFORMADO"}`,
  ].join("\n");
  await copyText(`${heading}\n\n${occupied.map(handoffText).join("\n\n────────────────────\n\n")}`);
  toast(`${occupied.length} leito${occupied.length === 1 ? " copiado" : "s copiados"}.`);
}

async function exportWorkspace() {
  const fileMetadata = {};
  for (const bed of state.beds) {
    fileMetadata[bed.id] = (await filesForBed(bed.id)).map(({ id, name, type, size, addedAt, selected }) => ({
      id, name, type, size, addedAt, selected,
    }));
  }

  const payload = JSON.stringify({ ...state, files: fileMetadata, exportedAt: new Date().toISOString() }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `passagem-uti-${state.settings.date || localISODate()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Plantão exportado em JSON, sem copiar o conteúdo dos anexos.");
}

function addTimelineEvent() {
  const text = $("#timeline-text").value.trim();
  const rawAt = $("#timeline-at").value;
  if (!text) return toast("Descreva a atualização antes de registrar.", true);
  const parsedAt = new Date(rawAt);
  if (!rawAt || Number.isNaN(parsedAt.getTime())) return toast("Informe uma data e hora válidas.", true);

  const bed = activeBed();
  bed.timeline.push({
    id: crypto.randomUUID(),
    type: $("#timeline-type").value,
    text,
    at: parsedAt.toISOString(),
    author: state.settings.doctorName || "",
  });
  bed.updatedAt = new Date().toISOString();
  invalidateReadback(bed);
  $("#timeline-text").value = "";
  $("#timeline-at").value = localDateTimeValue();
  renderTimeline();
  renderBatteryRail();
  renderShiftRadar();
  scheduleSave();
  toast(`Atualização registrada no ${bed.id}.`);
}

function readbackMaterial(bed) {
  return JSON.stringify({
    patientName: bed.patientName,
    record: bed.record,
    acuity: bed.acuity,
    handoff: bed.handoff.map((line) => line.text),
    alerts: bed.alerts,
    missing: bed.missing,
    checklist: bed.checklist.filter((item) => !item.suggested).map(({ text, priority, due, done }) => ({ text, priority, due, done })),
    timeline: bed.timeline,
  });
}

async function confirmReadback() {
  const bed = activeBed();
  const readback = bed.readback;
  if (!bed.handoff.every((line) => line.text.trim())) return toast("Complete e revise as 10 linhas antes do aceite.", true);
  if (!readback.receiverName.trim() || !readback.receiverCrm.trim()) return toast("Informe nome e CRM do médico receptor.", true);
  if (!readback.linesReviewed || !readback.risksReviewed || !readback.tasksUnderstood) {
    return toast("Confirme os três itens do read-back.", true);
  }

  const sourceVersion = bed.updatedAt;
  const contentHash = await sha256(readbackMaterial(bed));
  if (bed.updatedAt !== sourceVersion || activeBed().id !== bed.id) {
    return toast("O leito mudou durante a confirmação; revise novamente.", true);
  }
  readback.contentHash = contentHash;
  readback.confirmedAt = new Date().toISOString();
  bed.updatedAt = new Date().toISOString();
  await saveState();
  renderReadback();
  renderBatteryRail();
  renderShiftRadar();
  toast(`${bed.id} recebido e confirmado por ${readback.receiverName}.`);
}

function radarScore(bed) {
  const acuity = { "CRÍTICO": 4, "ATENÇÃO": 3, "NÃO DEFINIDO": 2, "ESTÁVEL": 1 }[bed.acuity] || 0;
  const highPending = bed.checklist.filter((item) => !item.done && !item.suggested && item.priority === "alta").length;
  return acuity * 10_000 + bed.alerts.length * 1_000 + bed.missing.length * 100 + highPending * 10 + pendingCount(bed);
}

function renderShiftRadar() {
  const dialog = $("#radar-dialog");
  if (!dialog?.open) return;
  const beds = state.beds.filter(bedHasData).sort((a, b) => radarScore(b) - radarScore(a));
  const summary = $("#radar-summary");
  summary.replaceChildren();
  [
    [beds.length, "leitos com dados"],
    [beds.filter((bed) => bed.acuity === "CRÍTICO").length, "críticos informados"],
    [beds.reduce((sum, bed) => sum + bed.alerts.length + bed.missing.length, 0), "alertas e lacunas"],
    [beds.reduce((sum, bed) => sum + pendingCount(bed), 0), "pendências ativas"],
  ].forEach(([value, label]) => {
    const card = document.createElement("div");
    const number = document.createElement("strong");
    number.textContent = String(value);
    const caption = document.createElement("span");
    caption.textContent = label;
    card.append(number, caption);
    summary.append(card);
  });

  const list = $("#radar-list");
  list.replaceChildren();
  if (!beds.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<p><strong>Radar sem sinais registrados.</strong><br />Preencha um leito para começar.</p>";
    list.append(empty);
    return;
  }

  beds.forEach((bed) => {
    const card = document.createElement("article");
    card.className = "radar-card";
    card.dataset.acuity = bed.acuity;

    const bedNumber = document.createElement("div");
    bedNumber.className = "radar-bed";
    bedNumber.textContent = bed.id;

    const patient = document.createElement("div");
    patient.className = "radar-patient";
    const patientName = document.createElement("strong");
    patientName.textContent = bed.patientName || "Paciente não identificado";
    const patientMeta = document.createElement("span");
    patientMeta.textContent = `${bed.acuity} · bateria ${bedCharge(bed)}%${isReadbackConfirmed(bed) ? " · recebido" : ""}`;
    patient.append(patientName, patientMeta);

    const signals = document.createElement("div");
    signals.className = "radar-signals";
    const signalTitle = document.createElement("strong");
    const high = bed.checklist.filter((item) => !item.done && !item.suggested && item.priority === "alta").length;
    signalTitle.textContent = `${bed.alerts.length} alerta${bed.alerts.length === 1 ? "" : "s"} · ${bed.missing.length} lacuna${bed.missing.length === 1 ? "" : "s"} · ${pendingCount(bed)} pendência${pendingCount(bed) === 1 ? "" : "s"}`;
    const signalText = document.createElement("span");
    signalText.textContent = high ? `${high} pendência${high === 1 ? "" : "s"} de prioridade alta` : "Sem pendência alta registrada";
    signals.append(signalTitle, signalText);

    const open = document.createElement("button");
    open.type = "button";
    open.className = "radar-open-bed";
    open.dataset.radarBed = bed.id;
    open.textContent = "Abrir";

    card.append(bedNumber, patient, signals, open);
    list.append(card);
  });
}

function openRadar() {
  const dialog = $("#radar-dialog");
  if (!dialog.open) dialog.showModal();
  renderShiftRadar();
}

function navigateToBed(bedId, tab = "render") {
  state.activeBedId = bedId;
  state.activeTab = tab;
  renderWorkspace();
  scheduleSave();
  $("#workspace").scrollIntoView({ behavior: "smooth", block: "start" });
}

function commandCatalog() {
  const bed = activeBed();
  const commands = [
    { id: "radar", icon: "◉", label: "Abrir radar do plantão", detail: "Prioridades dos 10 leitos", keywords: "radar prioridade risco", run: openRadar },
    { id: "render", icon: "✦", label: `Renderizar ${bed.id}`, detail: "Gerar as 10 linhas", keywords: "gpt ia gerar", run: () => void generateHandoff() },
    { id: "copy", icon: "⧉", label: `Copiar ${bed.id}`, detail: "Passagem pronta para colar", keywords: "copiar clipboard", run: () => void copyActiveBed() },
    { id: "files", icon: "▣", label: `Abrir arquivos do ${bed.id}`, detail: "Exames e documentos", keywords: "pdf foto exames anexo", run: () => { applyTab("vault"); $("#workspace").scrollIntoView({ behavior: "smooth" }); } },
    { id: "checklist", icon: "✓", label: `Abrir checklist do ${bed.id}`, detail: "Pendências e read-back", keywords: "tarefas pendencias aceite", run: () => { applyTab("checklist"); $("#workspace").scrollIntoView({ behavior: "smooth" }); } },
    { id: "event", icon: "+", label: `Registrar intercorrência no ${bed.id}`, detail: "Abrir linha do tempo", keywords: "evento exame conduta contato", run: () => { applyTab("render"); $("#timeline-type").value = "INTERCORRÊNCIA"; $("#timeline-text").focus(); } },
    { id: "high-task", icon: "!", label: `Criar pendência alta no ${bed.id}`, detail: "Ação prioritária editável", keywords: "tarefa urgente alta", run: () => { addChecklistItem({ priority: "alta" }); applyTab("checklist"); setTimeout(() => $(".check-item:last-child .check-text")?.focus(), 0); } },
    { id: "critical", icon: "▲", label: `Marcar ${bed.id} como crítico`, detail: "Classificação médica manual", keywords: "critico estado gravidade", run: () => { updateBedField("acuity", "CRÍTICO"); $("#bed-acuity").value = "CRÍTICO"; renderBatteryRail(); } },
    { id: "turbo", icon: "⚡", label: "Turbo: renderizar leitos ocupados", detail: "Até 3 análises simultâneas", keywords: "lote todos velocidade", run: () => void renderAllBeds() },
  ];
  state.beds.forEach((candidate) => commands.push({
    id: `bed-${candidate.id}`,
    icon: candidate.id,
    label: `Ir para ${candidate.id}`,
    detail: candidate.patientName || "Leito vazio",
    keywords: `${candidate.id} leito paciente ${candidate.patientName}`,
    run: () => navigateToBed(candidate.id),
  }));
  return commands;
}

function normalizedSearch(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function renderCommandList(query = "") {
  const needle = normalizedSearch(query.trim());
  visibleCommands = commandCatalog().filter((command) => normalizedSearch(`${command.label} ${command.detail} ${command.keywords}`).includes(needle));
  commandSelection = Math.min(commandSelection, Math.max(0, visibleCommands.length - 1));
  const list = $("#command-list");
  list.replaceChildren();

  visibleCommands.forEach((command, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `command-item${index === commandSelection ? " is-selected" : ""}`;
    button.dataset.commandId = command.id;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === commandSelection));

    const icon = document.createElement("span");
    icon.className = "command-icon";
    icon.textContent = command.icon;
    const copy = document.createElement("span");
    copy.className = "command-copy";
    const label = document.createElement("strong");
    label.textContent = command.label;
    const detail = document.createElement("span");
    detail.textContent = command.detail;
    copy.append(label, detail);
    const key = document.createElement("span");
    key.className = "command-key";
    key.textContent = index === commandSelection ? "Enter" : "";
    button.append(icon, copy, key);
    list.append(button);
  });
}

function openCommands() {
  const dialog = $("#command-dialog");
  $("#command-search").value = "";
  commandSelection = 0;
  renderCommandList();
  if (!dialog.open) dialog.showModal();
  setTimeout(() => $("#command-search").focus(), 0);
}

function executeCommand(id) {
  const command = commandCatalog().find((candidate) => candidate.id === id);
  if (!command) return;
  $("#command-dialog").close();
  command.run();
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function fileExtension(name) {
  const extension = name.split(".").pop();
  return extension && extension !== name ? extension.slice(0, 5).toUpperCase() : "FILE";
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function updateSavedLabel() {
  $("#last-saved").textContent = state.savedAt ? `Salvo localmente em ${formatDateTime(state.savedAt)}` : "Ainda não salvo";
}

function toast(message, isError = false) {
  const element = document.createElement("div");
  element.className = `toast${isError ? " is-error" : ""}`;
  element.textContent = message;
  $("#toast-region").append(element);
  setTimeout(() => element.remove(), 4500);
}

async function checkApi() {
  const indicator = $("#api-status");
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const health = await response.json();
    indicator.className = `connection-pill ${health.aiConfigured ? "is-ready" : "is-error"}`;
    $("span:last-child", indicator).textContent = health.aiConfigured ? `GPT pronto · ${health.model}` : "Chave não encontrada";
  } catch {
    indicator.className = "connection-pill is-error";
    $("span:last-child", indicator).textContent = "Servidor local indisponível";
  }
}

function bindEvents() {
  $("#identity-form").addEventListener("input", (event) => {
    const field = event.target.dataset.setting;
    if (!field) return;
    state.settings[field] = event.target.value;
    scheduleSave();
  });

  $("#bed-rail").addEventListener("click", (event) => {
    const button = event.target.closest("[data-bed-id]");
    if (!button) return;
    navigateToBed(button.dataset.bedId, state.activeTab);
  });

  $(".tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    applyTab(button.dataset.tab);
    scheduleSave();
  });

  $("#patient-name").addEventListener("input", (event) => updateBedField("patientName", event.target.value));
  $("#patient-age").addEventListener("input", (event) => updateBedField("age", event.target.value));
  $("#patient-record").addEventListener("input", (event) => updateBedField("record", event.target.value));
  $("#patient-admission").addEventListener("input", (event) => updateBedField("admission", event.target.value));
  $("#bed-acuity").addEventListener("change", (event) => {
    updateBedField("acuity", event.target.value);
    renderBatteryRail();
  });
  $("#clinical-source").addEventListener("input", (event) => {
    updateBedField("clinicalText", event.target.value);
    $("#source-character-count").textContent = `${event.target.value.length.toLocaleString("pt-BR")} caracteres`;
  });

  $("#handoff-lines").addEventListener("input", (event) => {
    if (!event.target.matches("[data-line-index]")) return;
    const index = Number(event.target.dataset.lineIndex);
    activeBed().handoff[index].text = event.target.value;
    activeBed().updatedAt = new Date().toISOString();
    invalidateReadback(activeBed());
    event.target.closest(".handoff-line").classList.toggle("has-content", Boolean(event.target.value.trim()));
    $("#render-count").textContent = `${activeBed().handoff.filter((line) => line.text.trim()).length}/10`;
    renderBatteryRail();
    scheduleSave();
  });

  $("#add-check").addEventListener("click", () => addChecklistItem());
  $("#checklist-items").addEventListener("input", handleChecklistChange);
  $("#checklist-items").addEventListener("change", handleChecklistChange);
  $("#checklist-items").addEventListener("click", (event) => {
    const acceptId = event.target.dataset.acceptCheck;
    if (acceptId) {
      const item = activeBed().checklist.find((candidate) => candidate.id === acceptId);
      if (!item) return;
      item.suggested = false;
      activeBed().updatedAt = new Date().toISOString();
      invalidateReadback(activeBed());
      renderChecklist();
      renderBatteryRail();
      scheduleSave();
      toast("Sugestão aceita como pendência ativa.");
      return;
    }
    const id = event.target.dataset.removeCheck;
    if (!id) return;
    activeBed().checklist = activeBed().checklist.filter((item) => item.id !== id);
    activeBed().updatedAt = new Date().toISOString();
    invalidateReadback(activeBed());
    renderChecklist();
    renderBatteryRail();
    scheduleSave();
  });

  $("#file-input").addEventListener("change", (event) => {
    void addFiles(event.target.files);
    event.target.value = "";
  });

  const dropZone = $("#drop-zone");
  ["dragenter", "dragover"].forEach((name) => dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  }));
  ["dragleave", "drop"].forEach((name) => dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  }));
  dropZone.addEventListener("drop", (event) => void addFiles(event.dataTransfer.files));

  $("#file-grid").addEventListener("change", async (event) => {
    const id = event.target.dataset.selectFile;
    if (!id) return;
    let affectedBedId = state.activeBedId;
    const transaction = db.transaction("files", "readwrite");
    const store = transaction.objectStore("files");
    const record = await requestToPromise(store.get(id));
    if (record) {
      affectedBedId = record.bedId;
      record.selected = event.target.checked;
      store.put(record);
    }
    await transactionDone(transaction);
    const affectedBed = state.beds.find((bed) => bed.id === affectedBedId);
    if (affectedBed) {
      affectedBed.updatedAt = new Date().toISOString();
      invalidateReadback(affectedBed);
    }
    scheduleSave();
    await renderFiles();
  });

  $("#file-grid").addEventListener("click", async (event) => {
    const deleteId = event.target.dataset.deleteFile;
    const downloadId = event.target.dataset.downloadFile;
    const affectedBedId = state.activeBedId;
    if (deleteId) {
      await deleteFile(deleteId);
      const affectedBed = state.beds.find((bed) => bed.id === affectedBedId);
      if (affectedBed) {
        affectedBed.updatedAt = new Date().toISOString();
        invalidateReadback(affectedBed);
      }
      scheduleSave();
      await renderFiles();
      renderBatteryRail();
    }
    if (downloadId) {
      const transaction = db.transaction("files", "readonly");
      const record = await requestToPromise(transaction.objectStore("files").get(downloadId));
      if (!record) return;
      const url = URL.createObjectURL(record.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = record.name;
      link.click();
      URL.revokeObjectURL(url);
    }
  });

  $("#timeline-form").addEventListener("submit", (event) => {
    event.preventDefault();
    addTimelineEvent();
  });
  $("#timeline-list").addEventListener("click", (event) => {
    const id = event.target.dataset.removeEvent;
    if (!id) return;
    const bed = activeBed();
    bed.timeline = bed.timeline.filter((item) => item.id !== id);
    bed.updatedAt = new Date().toISOString();
    invalidateReadback(bed);
    renderTimeline();
    renderBatteryRail();
    renderShiftRadar();
    scheduleSave();
  });

  $("#receiver-name").addEventListener("input", (event) => updateReadbackField("receiverName", event.target.value));
  $("#receiver-crm").addEventListener("input", (event) => updateReadbackField("receiverCrm", event.target.value));
  $$('[data-readback-field]').forEach((input) => input.addEventListener("change", (event) => {
    updateReadbackField(event.target.dataset.readbackField, event.target.checked);
  }));
  $("#confirm-readback").addEventListener("click", () => void confirmReadback());

  $("#open-radar").addEventListener("click", openRadar);
  $("#open-commands").addEventListener("click", openCommands);
  $("#render-all").addEventListener("click", () => void renderAllBeds());
  $("#radar-list").addEventListener("click", (event) => {
    const bedId = event.target.dataset.radarBed;
    if (!bedId) return;
    $("#radar-dialog").close();
    navigateToBed(bedId);
  });
  $$('[data-close-dialog]').forEach((button) => button.addEventListener("click", () => {
    $(`#${button.dataset.closeDialog}`).close();
  }));
  $$(".app-dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));

  $("#command-search").addEventListener("input", (event) => {
    commandSelection = 0;
    renderCommandList(event.target.value);
  });
  $("#command-search").addEventListener("keydown", (event) => {
    if (!visibleCommands.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      commandSelection = (commandSelection + direction + visibleCommands.length) % visibleCommands.length;
      renderCommandList(event.currentTarget.value);
      $(".command-item.is-selected")?.scrollIntoView({ block: "nearest" });
    }
    if (event.key === "Enter") {
      event.preventDefault();
      executeCommand(visibleCommands[commandSelection].id);
    }
  });
  $("#command-list").addEventListener("click", (event) => {
    const item = event.target.closest("[data-command-id]");
    if (item) executeCommand(item.dataset.commandId);
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase("pt-BR") === "k") {
      event.preventDefault();
      openCommands();
    }
  });

  $("#cancel-loading").addEventListener("click", () => {
    cancelRequested = true;
    activeRequestControllers.forEach((controller) => controller.abort());
    $("#loading-description").textContent = "Cancelando solicitações em andamento…";
  });

  $("#generate-handoff").addEventListener("click", () => void generateHandoff());
  $("#copy-bed").addEventListener("click", copyActiveBed);
  $("#copy-all").addEventListener("click", copyAllBeds);
  $("#export-data").addEventListener("click", exportWorkspace);
  $("#print-bed").addEventListener("click", () => window.print());
  $("#clear-bed").addEventListener("click", clearActiveBed);
  window.addEventListener("pagehide", () => void saveState());
}

function updateBedField(field, value) {
  const bed = activeBed();
  bed[field] = value;
  bed.updatedAt = new Date().toISOString();
  invalidateReadback(bed);
  if (field === "patientName") {
    $("#active-bed-title").textContent = value || "Paciente não identificado";
    renderBatteryRail();
  }
  scheduleSave();
}

function updateReadbackField(field, value) {
  const bed = activeBed();
  if (!bed.readback) bed.readback = newReadback();
  bed.readback[field] = value;
  bed.readback.confirmedAt = null;
  bed.readback.contentHash = "";
  bed.updatedAt = new Date().toISOString();
  renderReadback();
  renderBatteryRail();
  scheduleSave();
}

function handleChecklistChange(event) {
  const row = event.target.closest("[data-check-id]");
  const field = event.target.dataset.checkField;
  if (!row || !field) return;
  const item = activeBed().checklist.find((candidate) => candidate.id === row.dataset.checkId);
  if (!item) return;
  item[field] = field === "done" ? event.target.checked : event.target.value;
  activeBed().updatedAt = new Date().toISOString();
  invalidateReadback(activeBed());
  if (field === "done" || field === "priority") renderChecklist();
  renderBatteryRail();
  scheduleSave();
}

async function clearActiveBed() {
  const bed = activeBed();
  const confirmed = window.confirm(`Limpar todos os dados e arquivos do ${bed.id}? Esta ação não pode ser desfeita.`);
  if (!confirmed) return;
  const index = state.beds.findIndex((candidate) => candidate.id === bed.id);
  await deleteFilesForBed(bed.id);
  state.beds[index] = newBed(index + 1);
  await saveState();
  renderWorkspace();
  toast(`${bed.id} foi limpo.`);
}

async function init() {
  try {
    db = await openDatabase();
    await loadState();
    bindEvents();
    renderSettings();
    renderWorkspace();
    updateSavedLabel();
    await checkApi();
  } catch (error) {
    console.error(error);
    toast("Não foi possível iniciar o armazenamento local.", true);
  }
}

void init();
