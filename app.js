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
const MAX_ANALYSIS_SIZE = 28 * 1024 * 1024;

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
    alerts: [],
    missing: [],
    updatedAt: null,
  };
}

function newState() {
  return {
    version: 2,
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
    settings: { ...newState().settings, ...(saved.settings || {}) },
    beds: Array.from({ length: 10 }, (_, index) => ({
      ...newBed(index + 1),
      ...(saved.beds[index] || {}),
      handoff: HANDOFF_LABELS.map((label, lineIndex) => ({
        number: lineIndex + 1,
        label,
        text: saved.beds[index]?.handoff?.[lineIndex]?.text || "",
      })),
      checklist: Array.isArray(saved.beds[index]?.checklist) ? saved.beds[index].checklist : [],
    })),
  };
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 450);
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
  return bed.checklist.filter((item) => !item.done).length;
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
    button.setAttribute("role", "listitem");
    button.setAttribute("aria-label", `${bed.id}, ${bed.patientName || "vazio"}, ${charge}% preparado`);

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

  $("#metric-ready").textContent = state.beds.filter((bed) => bedCharge(bed) >= 80).length;
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
    row.className = `check-item${item.done ? " is-done" : ""}`;
    row.dataset.checkId = item.id;
    row.dataset.priority = item.priority;

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "check-toggle";
    toggle.checked = item.done;
    toggle.dataset.checkField = "done";
    toggle.setAttribute("aria-label", `Concluir ${item.text || "pendência"}`);

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

    row.append(toggle, text, priority, due, remove);
    container.append(row);
  });

  const done = bed.checklist.filter((item) => item.done).length;
  const total = bed.checklist.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  $("#check-progress-bar").style.width = `${percent}%`;
  $("#check-progress-label").textContent = `${done} de ${total} concluídas`;
  $("#check-count").textContent = String(pendingCount(bed));
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
  });
  bed.updatedAt = new Date().toISOString();
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

async function generateHandoff() {
  const bed = activeBed();
  const selectedFiles = (await filesForBed(bed.id)).filter((file) => file.selected !== false).slice(0, 8);
  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  if (!bed.clinicalText.trim() && !selectedFiles.length) {
    toast("Adicione texto clínico ou pelo menos um arquivo.", true);
    return;
  }
  if (totalSize > MAX_ANALYSIS_SIZE) {
    toast("Os anexos selecionados ultrapassam 28 MB. Desmarque alguns arquivos.", true);
    applyTab("vault");
    return;
  }

  showLoading(true);
  try {
    const attachments = await Promise.all(selectedFiles.map(async (file) => ({
      name: file.name,
      type: file.type,
      data: await fileToDataURL(file.blob),
    })));

    const response = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: { bed: bed.id, patientName: bed.patientName },
        clinicalText: bed.clinicalText,
        attachments,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Não foi possível renderizar o leito.");

    bed.patientName = bed.patientName || result.patient_name || "";
    bed.acuity = result.acuity || bed.acuity;
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
      if (!text || existing.has(text.toLocaleLowerCase("pt-BR"))) return;
      bed.checklist.push({
        id: crypto.randomUUID(),
        text,
        priority: suggestion.priority || "media",
        due: suggestion.due || "",
        done: false,
      });
    });

    bed.updatedAt = new Date().toISOString();
    await saveState();
    renderWorkspace();
    applyTab("render");
    toast(`${bed.id} renderizado: revise as 10 linhas antes da passagem.`);
  } catch (error) {
    toast(error.message || "Falha na renderização.", true);
  } finally {
    showLoading(false);
  }
}

function showLoading(show) {
  const overlay = $("#loading-overlay");
  overlay.hidden = !show;
  clearInterval(activeLoadingTimer);
  if (!show) return;

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
  const pending = bed.checklist.filter((item) => !item.done).map((item) => `☐ ${item.text}${item.due ? ` · ${item.due}` : ""}`);
  return [...header, "", ...lines, ...(pending.length ? ["", "PENDÊNCIAS:", ...pending] : [])].join("\n");
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
  const occupied = state.beds.filter((bed) => bed.patientName.trim() || bed.clinicalText.trim() || bed.handoff.some((line) => line.text.trim()));
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
    state.activeBedId = button.dataset.bedId;
    renderWorkspace();
    scheduleSave();
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
    event.target.closest(".handoff-line").classList.toggle("has-content", Boolean(event.target.value.trim()));
    $("#render-count").textContent = `${activeBed().handoff.filter((line) => line.text.trim()).length}/10`;
    renderBatteryRail();
    scheduleSave();
  });

  $("#add-check").addEventListener("click", () => addChecklistItem());
  $("#checklist-items").addEventListener("input", handleChecklistChange);
  $("#checklist-items").addEventListener("change", handleChecklistChange);
  $("#checklist-items").addEventListener("click", (event) => {
    const id = event.target.dataset.removeCheck;
    if (!id) return;
    activeBed().checklist = activeBed().checklist.filter((item) => item.id !== id);
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
    const transaction = db.transaction("files", "readwrite");
    const store = transaction.objectStore("files");
    const record = await requestToPromise(store.get(id));
    if (record) {
      record.selected = event.target.checked;
      store.put(record);
    }
    await transactionDone(transaction);
    await renderFiles();
  });

  $("#file-grid").addEventListener("click", async (event) => {
    const deleteId = event.target.dataset.deleteFile;
    const downloadId = event.target.dataset.downloadFile;
    if (deleteId) {
      await deleteFile(deleteId);
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

  $("#generate-handoff").addEventListener("click", generateHandoff);
  $("#copy-bed").addEventListener("click", copyActiveBed);
  $("#copy-all").addEventListener("click", copyAllBeds);
  $("#export-data").addEventListener("click", exportWorkspace);
  $("#print-bed").addEventListener("click", () => window.print());
  $("#clear-bed").addEventListener("click", clearActiveBed);
  window.addEventListener("beforeunload", () => clearTimeout(saveTimer));
}

function updateBedField(field, value) {
  const bed = activeBed();
  bed[field] = value;
  bed.updatedAt = new Date().toISOString();
  if (field === "patientName") {
    $("#active-bed-title").textContent = value || "Paciente não identificado";
    renderBatteryRail();
  }
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
