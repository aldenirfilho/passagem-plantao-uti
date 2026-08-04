import {
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENT_TOTAL_BYTES,
  validateAttachmentFile,
  validateAttachmentMetadata,
} from "./attachment-contract.mjs";

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
const MAX_CLINICAL_TEXT = 120_000;
const BATCH_CONCURRENCY = 3;
const MAX_NOTIFICATIONS = 200;
const CAPSULE_SCHEMA_ID = "br.med.passagem-uti/capsula";
const CAPSULE_SCHEMA_VERSION = 1;
const CAPSULE_MAX_BYTES = 4 * 1024 * 1024;
const MAX_WHATSAPP_TEXT = 20_000;
const MAX_CONTINUITY_SESSIONS = 100;
const MAX_AUDIT_EVENTS = 500;
const MAX_COORDINATION_TEXT = 600;
const IMPORTED_UNVERIFIED_LABEL = "Importado · não verificado";
const VALID_THEMES = new Set(["system", "light", "dark"]);
const VALID_NOTIFICATION_SEVERITIES = new Set(["info", "attention", "success", "error"]);
const VALID_ACUITIES = new Set(["NÃO DEFINIDO", "ESTÁVEL", "ATENÇÃO", "CRÍTICO"]);
const VALID_PRIORITIES = new Set(["baixa", "media", "alta"]);
const VALID_TIMELINE_TYPES = new Set(["INTERCORRÊNCIA", "EXAME", "CONDUTA", "PROCEDIMENTO", "CONTATO", "COORDENAÇÃO"]);
const VALID_ROLES = new Set(["PLANTONISTA", "COORDENADOR", "DIARISTA"]);
const VALID_CARE_MODES = new Set(["UTI_OFICIAL", "AD_HOC"]);
const VALID_AUDIT_ACTIONS = new Set([
  "SHIFT_ASSUMED",
  "SHIFT_ENDED",
  "SHIFT_TRANSFERRED",
  "BED_ACTIVITY_CHANGED",
  "COORDINATION_NOTE",
  "COORDINATION_TASK",
  "CAPSULE_IMPORTED",
]);

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

function newActivities() {
  return {
    evolutionDone: false,
    prescriptionReviewed: false,
    examsReviewed: false,
    updatedAt: null,
    updatedBy: "",
  };
}

function newContinuity() {
  return {
    activeShift: null,
    sessions: [],
    auditLog: [],
  };
}

function clippedText(value, max) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function safeIsoOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function randomId(prefix) {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

function normalizeProfile(profile = {}) {
  return {
    doctorName: clippedText(profile.doctorName, 240).trim(),
    crm: clippedText(profile.crm, 80).trim(),
    specialty: clippedText(profile.specialty, 160).trim(),
    rqe: clippedText(profile.rqe, 80).trim(),
    role: VALID_ROLES.has(profile.role) ? profile.role : "PLANTONISTA",
    careMode: VALID_CARE_MODES.has(profile.careMode) ? profile.careMode : "AD_HOC",
  };
}

function requireActiveShift(workspace, action = "registrar esta ação") {
  const active = workspace?.continuity?.activeShift;
  if (!active) throw new Error(`Assuma o plantão antes de ${action}.`);
  return active;
}

function importedUnverifiedAuthor(value) {
  const author = clippedText(value, 240).trim();
  if (author.toLocaleLowerCase("pt-BR").startsWith(IMPORTED_UNVERIFIED_LABEL.toLocaleLowerCase("pt-BR"))) return author;
  return `${IMPORTED_UNVERIFIED_LABEL}${author ? ` · ${author}` : ""}`.slice(0, 240);
}

function markImportedBedProvenance(value) {
  const bed = structuredClone(value);
  bed.timeline = Array.isArray(bed.timeline)
    ? bed.timeline.map((event) => ({ ...event, author: importedUnverifiedAuthor(event?.author) }))
    : [];
  bed.checklist = Array.isArray(bed.checklist)
    ? bed.checklist.map((item) => item?.source === "coordination"
      ? { ...item, authorName: importedUnverifiedAuthor(item.authorName) }
      : item)
    : [];
  return bed;
}

function normalizeShiftSession(session) {
  if (!session || typeof session !== "object") return null;
  const profile = normalizeProfile(session);
  const startedAt = safeIsoOrNull(session.startedAt);
  if (!profile.doctorName || !profile.crm || !startedAt) return null;
  const endedAt = safeIsoOrNull(session.endedAt);
  return {
    id: clippedText(session.id, 100) || randomId("shift"),
    ...profile,
    startedAt,
    endedAt: endedAt && new Date(endedAt) >= new Date(startedAt) ? endedAt : null,
    endReason: ["ENCERRADO", "TRANSFERIDO"].includes(session.endReason) ? session.endReason : null,
  };
}

function normalizeAuditEvent(event) {
  if (!event || typeof event !== "object" || !VALID_AUDIT_ACTIONS.has(event.action)) return null;
  const at = safeIsoOrNull(event.at);
  if (!at) return null;
  return {
    id: clippedText(event.id, 100) || randomId("audit"),
    action: event.action,
    at,
    actor: normalizeProfile(event.actor),
    bedId: /^L(?:10|[1-9])$/.test(String(event.bedId || "")) ? String(event.bedId) : null,
    detail: clippedText(event.detail, MAX_COORDINATION_TEXT),
  };
}

function normalizeContinuity(value) {
  const source = value && typeof value === "object" ? value : {};
  const sessions = Array.isArray(source.sessions)
    ? source.sessions.map(normalizeShiftSession).filter((session) => Boolean(session?.endedAt)).slice(-MAX_CONTINUITY_SESSIONS)
    : [];
  const activeShift = normalizeShiftSession(source.activeShift);
  if (activeShift) {
    activeShift.endedAt = null;
    activeShift.endReason = null;
  }
  return {
    activeShift,
    sessions,
    auditLog: Array.isArray(source.auditLog)
      ? source.auditLog.map(normalizeAuditEvent).filter(Boolean).slice(-MAX_AUDIT_EVENTS)
      : [],
  };
}

function appendContinuityAudit(continuity, input) {
  const event = normalizeAuditEvent({ id: randomId("audit"), at: new Date().toISOString(), ...input });
  if (!event) return null;
  continuity.auditLog.push(event);
  continuity.auditLog = continuity.auditLog.slice(-MAX_AUDIT_EVENTS);
  return event;
}

function assumeShift(workspace, profile, at = new Date().toISOString()) {
  const normalized = normalizeProfile(profile);
  if (!normalized.doctorName || !normalized.crm) throw new Error("Informe nome completo e CRM para assumir o plantão.");
  const assumedAt = safeIsoOrNull(at);
  if (!assumedAt) throw new Error("Data de entrada inválida.");
  if (!workspace.continuity) workspace.continuity = newContinuity();
  workspace.continuity = normalizeContinuity(workspace.continuity);

  const previous = workspace.continuity.activeShift;
  if (previous && normalizedContextValue(previous.crm) === normalizedContextValue(normalized.crm)
    && normalizedContextValue(previous.doctorName) === normalizedContextValue(normalized.doctorName)) {
    throw new Error("Este profissional já é o plantonista vigente.");
  }
  if (previous && new Date(assumedAt) < new Date(previous.startedAt)) throw new Error("A nova entrada não pode ser anterior ao início do plantão vigente.");
  if (previous) {
    const closed = { ...previous, endedAt: assumedAt, endReason: "TRANSFERIDO" };
    workspace.continuity.sessions.push(closed);
    appendContinuityAudit(workspace.continuity, {
      action: "SHIFT_TRANSFERRED",
      at: assumedAt,
      actor: previous,
      detail: `Responsabilidade transferida para ${normalized.doctorName} · ${normalized.crm}.`,
    });
  }

  const session = {
    id: randomId("shift"),
    ...normalized,
    startedAt: assumedAt,
    endedAt: null,
    endReason: null,
  };
  workspace.continuity.activeShift = session;
  workspace.continuity.sessions = workspace.continuity.sessions.slice(-MAX_CONTINUITY_SESSIONS);
  appendContinuityAudit(workspace.continuity, {
    action: "SHIFT_ASSUMED",
    at: assumedAt,
    actor: session,
    detail: previous ? "Plantão assumido após transferência local." : "Plantão assumido neste dispositivo.",
  });
  return session;
}

function endShift(workspace, at = new Date().toISOString()) {
  if (!workspace.continuity) workspace.continuity = newContinuity();
  workspace.continuity = normalizeContinuity(workspace.continuity);
  const active = workspace.continuity.activeShift;
  if (!active) throw new Error("Não há plantonista vigente para encerrar.");
  const endedAt = safeIsoOrNull(at);
  if (!endedAt || new Date(endedAt) < new Date(active.startedAt)) throw new Error("Data de saída inválida.");
  const closed = { ...active, endedAt, endReason: "ENCERRADO" };
  workspace.continuity.sessions.push(closed);
  workspace.continuity.sessions = workspace.continuity.sessions.slice(-MAX_CONTINUITY_SESSIONS);
  workspace.continuity.activeShift = null;
  appendContinuityAudit(workspace.continuity, {
    action: "SHIFT_ENDED",
    at: endedAt,
    actor: active,
    detail: "Plantão encerrado manualmente neste dispositivo.",
  });
  return closed;
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
    activities: newActivities(),
    alerts: [],
    missing: [],
    aiAcuity: "",
    renderFingerprint: "",
    updatedAt: null,
  };
}

function newState() {
  return {
    version: 5,
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
      theme: "system",
      specialty: "",
      rqe: "",
      role: "PLANTONISTA",
      careMode: "AD_HOC",
    },
    beds: Array.from({ length: 10 }, (_, index) => newBed(index + 1)),
    notifications: [],
    continuity: newContinuity(),
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
let notificationFilter = "all";
let selectedCapsule = null;
let capsuleInspectionToken = 0;
let continuityClockTimer;
const systemThemeQuery = typeof window !== "undefined" && typeof window.matchMedia === "function"
  ? window.matchMedia("(prefers-color-scheme: dark)")
  : { matches: false, addEventListener() {}, addListener() {} };

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

  const defaults = newState();
  const migratedSettings = { ...defaults.settings, ...(saved.settings || {}) };
  migratedSettings.role = VALID_ROLES.has(migratedSettings.role) ? migratedSettings.role : "PLANTONISTA";
  migratedSettings.careMode = VALID_CARE_MODES.has(migratedSettings.careMode) ? migratedSettings.careMode : "AD_HOC";
  migratedSettings.theme = VALID_THEMES.has(migratedSettings.theme) ? migratedSettings.theme : "system";
  state = {
    ...defaults,
    ...saved,
    version: 5,
    settings: migratedSettings,
    continuity: normalizeContinuity(saved.continuity),
    notifications: Array.isArray(saved.notifications)
      ? saved.notifications.map(normalizeNotification).filter(Boolean).slice(-MAX_NOTIFICATIONS)
      : [],
    beds: Array.from({ length: 10 }, (_, index) => ({
      ...newBed(index + 1),
      ...(saved.beds[index] || {}),
      handoff: HANDOFF_LABELS.map((label, lineIndex) => ({
        number: lineIndex + 1,
        label,
        text: saved.beds[index]?.handoff?.[lineIndex]?.text || "",
      })),
      checklist: Array.isArray(saved.beds[index]?.checklist)
        ? saved.beds[index].checklist.slice(0, 200).map((item) => ({ suggested: false, source: "manual", ...item }))
        : [],
      timeline: Array.isArray(saved.beds[index]?.timeline) ? saved.beds[index].timeline.slice(-500) : [],
      readback: { ...newReadback(), ...(saved.beds[index]?.readback || {}) },
      activities: {
        ...newActivities(),
        ...(saved.beds[index]?.activities || {}),
        evolutionDone: Boolean(saved.beds[index]?.activities?.evolutionDone),
        prescriptionReviewed: Boolean(saved.beds[index]?.activities?.prescriptionReviewed),
        examsReviewed: Boolean(saved.beds[index]?.activities?.examsReviewed),
        updatedAt: safeIsoOrNull(saved.beds[index]?.activities?.updatedAt),
        updatedBy: clippedText(saved.beds[index]?.activities?.updatedBy, 240),
      },
    })),
  };
}

function normalizeNotification(item) {
  if (!item || typeof item !== "object" || !item.title) return null;
  return {
    id: String(item.id || crypto.randomUUID()),
    type: String(item.type || "system"),
    severity: VALID_NOTIFICATION_SEVERITIES.has(item.severity) ? item.severity : "info",
    title: String(item.title).slice(0, 160),
    body: String(item.body || "").slice(0, 500),
    bedId: /^L(?:10|[1-9])$/.test(String(item.bedId || "")) ? String(item.bedId) : null,
    tab: ["render", "vault", "checklist"].includes(item.tab) ? item.tab : "render",
    createdAt: item.createdAt || new Date().toISOString(),
    readAt: item.readAt || null,
    dedupeKey: item.dedupeKey ? String(item.dedupeKey) : null,
    source: String(item.source || "registro-local"),
  };
}

function addNotification(input, { save = true } = {}) {
  const item = normalizeNotification({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    readAt: null,
    ...input,
  });
  if (!item) return;

  if (item.dedupeKey) {
    const existingIndex = state.notifications.findIndex((candidate) => candidate.dedupeKey === item.dedupeKey);
    if (existingIndex >= 0) state.notifications.splice(existingIndex, 1);
  }
  state.notifications.push(item);
  state.notifications = state.notifications.slice(-MAX_NOTIFICATIONS);
  renderNotificationIndicator();
  if ($("#notification-dialog")?.open) renderNotificationCenter();
  if (save && db) scheduleSave();
}

function unreadNotificationCount() {
  return state.notifications.filter((item) => !item.readAt).length;
}

function renderNotificationIndicator() {
  const count = unreadNotificationCount();
  const badge = $("#notification-count");
  const button = $("#notification-button");
  if (!badge || !button) return;
  badge.textContent = count > 99 ? "99+" : String(count);
  badge.hidden = count === 0;
  button.setAttribute("aria-label", count
    ? `Abrir central de notificações, ${count} não lida${count === 1 ? "" : "s"}`
    : "Abrir central de notificações, nenhuma não lida");
}

function notificationTimeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data não informada";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "agora";
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
  if (seconds < 86_400) return `há ${Math.floor(seconds / 3600)} h`;
  return formatDateTime(value);
}

function renderNotificationCenter() {
  const list = $("#notification-list");
  if (!list) return;
  list.replaceChildren();
  $$('[data-notification-filter]').forEach((button) => {
    const active = button.dataset.notificationFilter === notificationFilter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const items = [...state.notifications]
    .filter((item) => notificationFilter === "all" || !item.readAt)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "notification-empty";
    const icon = iconElement("inbox");
    const copy = document.createElement("p");
    copy.innerHTML = notificationFilter === "unread"
      ? "<strong>Tudo revisado.</strong><br />Não há notificações não lidas."
      : "<strong>Central pronta.</strong><br />Os próximos eventos operacionais aparecerão aqui.";
    empty.append(icon, copy);
    list.append(empty);
    return;
  }

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `notification-card severity-${item.severity}${item.readAt ? "" : " is-unread"}`;
    button.dataset.notificationId = item.id;
    button.setAttribute("aria-label", `${item.readAt ? "" : "Não lida. "}${item.title}. ${item.body}${item.bedId ? `. Abrir ${item.bedId}.` : ""}`);
    const icon = iconElement({ info: "info", attention: "alert", success: "check", error: "alert" }[item.severity] || "info");
    icon.classList.add("notification-card-icon");
    const copy = document.createElement("span");
    copy.className = "notification-copy";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const body = document.createElement("span");
    body.className = "notification-body";
    body.textContent = item.body;
    const meta = document.createElement("small");
    meta.className = "notification-meta";
    meta.textContent = `${item.bedId ? `${item.bedId} · ` : ""}${notificationTimeLabel(item.createdAt)} · ${item.source}`;
    copy.append(title, body, meta);
    const arrow = item.bedId ? iconElement("arrow-right") : document.createElement("span");
    arrow.classList.add("notification-arrow");
    button.append(icon, copy, arrow);
    list.append(button);
  });
}

function openNotifications() {
  const dialog = $("#notification-dialog");
  renderNotificationCenter();
  if (!dialog.open) dialog.showModal();
}

function markAllNotificationsRead() {
  const changed = unreadNotificationCount();
  const now = new Date().toISOString();
  state.notifications.forEach((item) => { if (!item.readAt) item.readAt = now; });
  renderNotificationIndicator();
  renderNotificationCenter();
  scheduleSave();
  toast(changed ? `${changed} notificação${changed === 1 ? " marcada" : "ões marcadas"} como lida${changed === 1 ? "" : "s"}.` : "Não havia notificações não lidas.");
}

function clearReadNotifications() {
  const before = state.notifications.length;
  state.notifications = state.notifications.filter((item) => !item.readAt);
  const cleared = before - state.notifications.length;
  renderNotificationIndicator();
  renderNotificationCenter();
  scheduleSave();
  toast(cleared ? `${cleared} notificação${cleared === 1 ? " removida" : "ões removidas"} do histórico.` : "Não havia notificações lidas para limpar.");
}

function openNotification(itemId) {
  const item = state.notifications.find((candidate) => candidate.id === itemId);
  if (!item) return;
  item.readAt = item.readAt || new Date().toISOString();
  renderNotificationIndicator();
  scheduleSave();
  if (item.bedId) {
    $("#notification-dialog").close();
    navigateToBed(item.bedId, item.tab);
  } else {
    renderNotificationCenter();
  }
}

function iconElement(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("ui-icon");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `./assets/icons.svg#icon-${name}`);
  svg.append(use);
  return svg;
}

function resolvedTheme(preference = state.settings.theme) {
  if (preference === "light" || preference === "dark") return preference;
  return systemThemeQuery.matches ? "dark" : "light";
}

function applyTheme(preference = state.settings.theme) {
  const safePreference = VALID_THEMES.has(preference) ? preference : "system";
  state.settings.theme = safePreference;
  const theme = resolvedTheme(safePreference);
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = safePreference;
  const select = $("#theme-select");
  if (select) select.value = safePreference;
  const iconUse = $("#theme-icon-use");
  if (iconUse) iconUse.setAttribute("href", `./assets/icons.svg#icon-${theme === "dark" ? "moon" : "sun"}`);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#050d18" : "#eef6fb";
}

function setTheme(preference) {
  applyTheme(preference);
  void saveState().catch(() => toast("A aparência foi aplicada, mas não pôde ser salva localmente.", true));
  const labels = { system: "Sistema", light: "Claro", dark: "Escuro" };
  toast(`Aparência: ${labels[state.settings.theme]}.`);
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

async function fileCountForBed(bedId) {
  const transaction = db.transaction("files", "readonly");
  const index = transaction.objectStore("files").index("bedId");
  return requestToPromise(index.count(IDBKeyRange.only(bedId)));
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

function clinicalActor(workspace = state) {
  return normalizeProfile(workspace?.continuity?.activeShift || workspace?.settings || {});
}

function clinicalActorLabel(actor, suffix = "") {
  const normalized = normalizeProfile(actor);
  const identity = normalized.doctorName
    ? `${normalized.doctorName}${normalized.crm ? ` · ${normalized.crm}` : " · CRM não informado"}`
    : "Profissional não identificado";
  return suffix ? `${identity} · ${suffix}` : identity;
}

function unresolvedSignalsForBed(bed) {
  const activePending = Array.isArray(bed?.checklist)
    ? bed.checklist.filter((item) => !item.done && !item.suggested).length
    : 0;
  const alerts = Array.isArray(bed?.alerts) ? bed.alerts.filter((item) => String(item || "").trim()).length : 0;
  const missing = Array.isArray(bed?.missing) ? bed.missing.filter((item) => String(item || "").trim()).length : 0;
  return { activePending, alerts, missing, total: activePending + alerts + missing };
}

function bedCharge(bed) {
  const completedLines = bed.handoff.filter((line) => line.text.trim()).length;
  const activityCount = activityCompletionCount(bed);
  let charge = 0;
  if (bed.patientName.trim()) charge += 10;
  if (bed.clinicalText.trim()) charge += 10;
  charge += completedLines * 4;
  charge += activityCount * 10;
  if (isReadbackConfirmed(bed)) charge += 10;
  const capped = Math.min(100, charge);
  return unresolvedSignalsForBed(bed).total ? Math.min(99, capped) : capped;
}

function activityCompletionCount(bed) {
  const activities = { ...newActivities(), ...(bed?.activities || {}) };
  return [activities.evolutionDone, activities.prescriptionReviewed, activities.examsReviewed].filter(Boolean).length;
}

function opportunitiesForBed(bed) {
  const activities = { ...newActivities(), ...(bed?.activities || {}) };
  const missingLines = bed.handoff.filter((line) => !line.text.trim()).length;
  const missingActivities = [
    ["evolutionDone", "Evolução não registrada como concluída"],
    ["prescriptionReviewed", "Prescrição não registrada como revisada"],
    ["examsReviewed", "Exames não registrados como revisados"],
  ].filter(([field]) => !activities[field]).map(([, label]) => label);
  const activePending = bed.checklist.filter((item) => !item.done && !item.suggested);
  const highPending = activePending.filter((item) => item.priority === "alta");
  const unresolvedSignals = unresolvedSignalsForBed(bed);
  const hasData = bedHasData(bed);
  return {
    bedId: bed.id,
    hasData,
    missingLines,
    missingActivities,
    activePending: activePending.length,
    highPending: highPending.length,
    alertCount: unresolvedSignals.alerts,
    missingCount: unresolvedSignals.missing,
    readbackPending: hasData && !isReadbackConfirmed(bed),
    total: missingLines + missingActivities.length + unresolvedSignals.total + (hasData && !isReadbackConfirmed(bed) ? 1 : 0),
  };
}

function opportunityDistribution(beds) {
  const rows = beds.map(opportunitiesForBed);
  const registered = rows.filter((row) => row.hasData);
  const counts = registered.map((row) => row.total);
  return {
    registeredBeds: registered.length,
    bedsWithHighPending: rows.filter((row) => row.highPending > 0).length,
    bedsWithReadbackPending: rows.filter((row) => row.readbackPending).length,
    minGaps: counts.length ? Math.min(...counts) : 0,
    maxGaps: counts.length ? Math.max(...counts) : 0,
    complete: registered.filter((row) => row.total === 0).length,
    oneToFive: registered.filter((row) => row.total >= 1 && row.total <= 5).length,
    aboveFive: registered.filter((row) => row.total > 5).length,
    rows,
  };
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
    || bed.checklist.length
    || activityCompletionCount(bed),
  );
}

function hasPracticalPatientIdentifiers(bed) {
  const hasName = Boolean(String(bed?.patientName || "").trim());
  const hasRecord = Boolean(String(bed?.record || "").trim());
  return hasName && hasRecord;
}

function patientSecondaryIdentifier(bed) {
  if (String(bed?.record || "").trim()) return `Prontuário/ID: ${String(bed.record).trim()}`;
  return "Prontuário/ID não informado";
}

function assertClinicalIdentifiers(beds, action = "continuar") {
  const invalidBedIds = beds.filter((bed) => bedHasData(bed) && !hasPracticalPatientIdentifiers(bed)).map((bed) => bed.id);
  if (invalidBedIds.length) {
    throw new Error(`Para ${action}, informe dois identificadores do paciente: nome e prontuário/ID. Idade e data de admissão não substituem o identificador institucional. Revise ${invalidBedIds.join(", ")}.`);
  }
  return true;
}

function isReadbackConfirmed(bed) {
  return hasPracticalPatientIdentifiers(bed) && Boolean(bed.readback?.confirmedAt && bed.readback?.contentHash);
}

function invalidateReadback(bed, reason = "o conteúdo do leito foi alterado") {
  if (!bed.readback) bed.readback = newReadback();
  const previousConfirmation = bed.readback.confirmedAt;
  const wasConfirmed = isReadbackConfirmed(bed);
  bed.readback.confirmedAt = null;
  bed.readback.contentHash = "";
  if (wasConfirmed) {
    addNotification({
      type: "readback-invalidated",
      severity: "attention",
      title: `${bed.id}: recebimento precisa ser reconfirmado`,
      body: `O aceite anterior foi invalidado porque ${reason}. Revise as 10 linhas, riscos e pendências.`,
      bedId: bed.id,
      tab: "checklist",
      dedupeKey: `readback-invalidated:${bed.id}:${previousConfirmation}`,
      source: "regra de segurança",
    });
    if ($("#readback-status") && bed.id === state.activeBedId) renderReadback();
    if ($("#bed-rail")) renderBatteryRail();
    renderShiftRadar();
  }
  return wasConfirmed;
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
    button.setAttribute("aria-label", `${bed.id}, ${bed.patientName || "vazio"}, ${charge}% de completude registrada${isReadbackConfirmed(bed) ? ", recebido" : ""}`);

    const shell = document.createElement("span");
    shell.className = "battery-shell";
    const level = document.createElement("span");
    level.className = "battery-level";
    level.style.height = `${charge ? Math.max(5, charge) : 0}%`;
    const label = document.createElement("span");
    label.className = "battery-label";
    const bedLabel = document.createElement("strong");
    const chargeLabel = document.createElement("span");
    bedLabel.textContent = bed.id;
    chargeLabel.textContent = `${charge}%`;
    label.append(bedLabel, chargeLabel);
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

function roleLabel(role) {
  return { PLANTONISTA: "Plantonista", COORDENADOR: "Coordenador", DIARISTA: "Diarista" }[role] || "Não informado";
}

function careModeLabel(mode) {
  return mode === "UTI_OFICIAL" ? "UTI cadastrada / oficial" : mode === "AD_HOC" ? "Plantão ad hoc / extraoficial" : "Não informado";
}

function professionalInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("pt-BR") : "UTI";
}

function elapsedLabel(startedAt, endedAt = null, now = new Date()) {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date(now);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return "—";
  const minutes = Math.floor((end - start) / 60_000);
  if (minutes < 1) return "menos de 1 min";
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const remainder = minutes % 60;
  return [days ? `${days} d` : "", hours ? `${hours} h` : "", `${remainder} min`].filter(Boolean).join(" ");
}

function renderContinuityProfile() {
  const continuity = state.continuity || newContinuity();
  const session = continuity.activeShift;
  const lastSession = continuity.sessions?.at(-1) || null;
  const display = session || lastSession;
  $("#continuity-kicker").textContent = session ? "PLANTONISTA VIGENTE" : lastSession ? "ÚLTIMO PLANTÃO ENCERRADO" : "PLANTONISTA VIGENTE";
  $("#continuity-title").textContent = display?.doctorName || "Nenhum plantonista vigente";
  $("#continuity-credentials").textContent = display
    ? [display.specialty || "Especialidade não informada", display.crm, display.rqe || "RQE não informado"].join(" · ")
    : "Preencha nome e CRM abaixo para assumir este plantão.";
  $("#continuity-avatar").textContent = professionalInitials(display?.doctorName);
  $("#continuity-role").textContent = display ? roleLabel(display.role) : "—";
  $("#continuity-mode").textContent = display ? careModeLabel(display.careMode) : "—";
  $("#continuity-start").textContent = display ? formatDateTime(display.startedAt) : "—";
  $("#continuity-end").textContent = session ? "Em andamento" : display?.endedAt ? formatDateTime(display.endedAt) : "—";
  $("#continuity-elapsed").textContent = display ? elapsedLabel(display.startedAt, display.endedAt) : "—";
  $("#end-shift").disabled = !session;
  $("#assume-shift").textContent = session ? "Transferir responsabilidade" : "Assumir plantão";
}

function renderBedActivities() {
  const bed = activeBed();
  const activities = { ...newActivities(), ...(bed.activities || {}) };
  $$('[data-activity-field]').forEach((input) => {
    input.checked = Boolean(activities[input.dataset.activityField]);
  });
  const count = activityCompletionCount(bed);
  const suffix = activities.updatedAt
    ? ` Última alteração em ${formatDateTime(activities.updatedAt)}${activities.updatedBy ? ` por ${activities.updatedBy}` : ""}.`
    : "";
  $("#bed-activity-meta").textContent = `${count} de 3 atividades registradas.${suffix}`;
}

function renderOpportunitySummary(distribution) {
  const summary = $("#opportunity-summary");
  summary.replaceChildren();
  [
    [distribution.registeredBeds, "leitos com dados"],
    [distribution.bedsWithHighPending, "com pendência alta"],
    [distribution.bedsWithReadbackPending, "com read-back pendente"],
    [`${distribution.minGaps}–${distribution.maxGaps}`, "faixa de lacunas por leito"],
  ].forEach(([value, label]) => {
    const card = document.createElement("div");
    const number = document.createElement("strong");
    const caption = document.createElement("span");
    number.textContent = String(value);
    caption.textContent = label;
    card.append(number, caption);
    summary.append(card);
  });
  const distributionText = document.createElement("p");
  distributionText.className = "equity-note";
  distributionText.textContent = `Distribuição entre leitos com dados: ${distribution.complete} sem lacunas · ${distribution.oneToFive} com 1–5 · ${distribution.aboveFive} com mais de 5. Use a visão do todo para redistribuir atenção, nunca para ranquear pessoas.`;
  summary.append(distributionText);
}

function renderAuditLog() {
  const list = $("#audit-list");
  list.replaceChildren();
  const events = [...(state.continuity?.auditLog || [])].reverse();
  $("#audit-count").textContent = `${events.length} evento${events.length === 1 ? "" : "s"}`;
  if (!events.length) {
    const empty = document.createElement("p");
    empty.className = "audit-empty";
    empty.textContent = "Nenhuma assunção, encerramento ou intervenção foi registrado neste dispositivo.";
    list.append(empty);
    return;
  }
  const labels = {
    SHIFT_ASSUMED: "Plantão assumido",
    SHIFT_ENDED: "Plantão encerrado",
    SHIFT_TRANSFERRED: "Responsabilidade transferida",
    BED_ACTIVITY_CHANGED: "Atividade do leito atualizada",
    COORDINATION_NOTE: "Nota da coordenação",
    COORDINATION_TASK: "Tarefa da coordenação",
    CAPSULE_IMPORTED: "Cápsula importada",
  };
  events.forEach((event) => {
    const row = document.createElement("article");
    row.className = "audit-event";
    const header = document.createElement("div");
    const title = document.createElement("strong");
    const date = document.createElement("time");
    title.textContent = `${event.bedId ? `${event.bedId} · ` : ""}${labels[event.action] || event.action}`;
    date.dateTime = event.at;
    date.textContent = formatDateTime(event.at);
    header.append(title, date);
    const detail = document.createElement("p");
    detail.textContent = event.detail || "Registro local sem detalhe adicional.";
    const actor = document.createElement("small");
    actor.textContent = event.actor?.doctorName
      ? `${event.actor.doctorName} · ${event.actor.crm || "CRM não informado"} · ${roleLabel(event.actor.role)}`
      : "Autoria não informada";
    row.append(header, detail, actor);
    list.append(row);
  });
}

function renderOpportunityPanel() {
  const distribution = opportunityDistribution(state.beds);
  renderOpportunitySummary(distribution);
  const list = $("#opportunity-list");
  list.replaceChildren();
  distribution.rows.forEach((row) => {
    const bed = state.beds.find((candidate) => candidate.id === row.bedId);
    const card = document.createElement("article");
    card.className = `opportunity-row${row.total ? " has-opportunities" : " is-complete"}`;
    const identity = document.createElement("div");
    const title = document.createElement("strong");
    const patient = document.createElement("span");
    title.textContent = row.bedId;
    patient.textContent = bed?.patientName || "Sem identificação registrada";
    identity.append(title, patient);
    const signals = document.createElement("ul");
    const signalTexts = [];
    if (!row.hasData) signalTexts.push("Leito sem dados registrados nesta foto local");
    if (row.missingLines) signalTexts.push(`${row.missingLines} das 10 linhas ausentes`);
    signalTexts.push(...row.missingActivities);
    if (row.activePending) signalTexts.push(`${row.activePending} pendência${row.activePending === 1 ? "" : "s"} ativa${row.activePending === 1 ? "" : "s"}${row.highPending ? ` · ${row.highPending} alta${row.highPending === 1 ? "" : "s"}` : ""}`);
    if (row.alertCount) signalTexts.push(`${row.alertCount} alerta${row.alertCount === 1 ? "" : "s"} sinalizado${row.alertCount === 1 ? "" : "s"} pela IA · revisar`);
    if (row.missingCount) signalTexts.push(`${row.missingCount} lacuna${row.missingCount === 1 ? "" : "s"} sinalizada${row.missingCount === 1 ? "" : "s"} pela IA · conferir`);
    if (row.readbackPending) signalTexts.push("Read-back pendente");
    if (!signalTexts.length) signalTexts.push("Sem lacunas operacionais registradas");
    signalTexts.forEach((signalText) => {
      const item = document.createElement("li");
      item.textContent = signalText;
      signals.append(item);
    });
    const open = document.createElement("button");
    open.type = "button";
    open.className = "button button-small";
    open.dataset.opportunityBed = row.bedId;
    open.textContent = "Abrir leito";
    card.append(identity, signals, open);
    list.append(card);
  });

  const select = $("#coordination-bed");
  const selectedBed = select.value || state.activeBedId;
  select.replaceChildren();
  state.beds.forEach((bed) => {
    const option = document.createElement("option");
    option.value = bed.id;
    option.textContent = `${bed.id} · ${bed.patientName || "sem identificação"}`;
    option.selected = bed.id === selectedBed;
    select.append(option);
  });
  const active = state.continuity?.activeShift;
  const coordinator = active?.role === "COORDENADOR";
  $("#coordination-fields").disabled = !coordinator;
  $("#coordination-access").textContent = coordinator
    ? `Autoria vigente: ${active.doctorName} · ${active.crm}.`
    : "Assuma o plantão com o papel Coordenador para registrar uma nota ou tarefa auditada.";
  renderAuditLog();
}

function openOpportunityPanel() {
  renderOpportunityPanel();
  const dialog = $("#opportunity-dialog");
  if (!dialog.open) dialog.showModal();
}

function renderWorkspace() {
  const bed = activeBed();
  $("#active-bed-number").textContent = bed.id;
  $("#active-bed-title").textContent = bed.patientName || "Paciente não identificado";
  $("#active-bed-subtitle").textContent = bed.updatedAt
    ? `Atualizado em ${formatDateTime(bed.updatedAt)} · ${bedCharge(bed)}% de completude registrada`
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
  renderBedActivities();
  applyTab(state.activeTab);
  if (state.activeTab !== "vault") void renderFileBadge();
  renderBatteryRail();
}

async function renderFileBadge() {
  const requestedBedId = state.activeBedId;
  const count = await fileCountForBed(requestedBedId);
  if (requestedBedId !== state.activeBedId) return;
  $("#file-count").textContent = String(count);
  $("#generate-caption").textContent = count
    ? `Texto + anexos selecionados no cofre (${count} no total)`
    : "Texto + anexos do leito";
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
    alert.textContent = `ALERTA SINALIZADO PELA IA · ${text} · requer revisão médica`;
    area.append(alert);
  });
  if (bed.missing.length) {
    const missing = document.createElement("div");
    missing.className = "alert-card is-missing";
    missing.textContent = `LACUNAS SINALIZADAS PELA IA · ${bed.missing.join(" · ")} · requer revisão médica`;
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
    row.className = `check-item${item.done ? " is-done" : ""}${item.suggested ? " is-suggestion" : ""}${item.source === "coordination" ? " is-coordination" : ""}`;
    row.dataset.checkId = item.id;
    row.dataset.priority = item.priority;
    row.dataset.source = item.source || "manual";

    let firstControl;
    if (item.suggested) {
      const accept = document.createElement("button");
      accept.type = "button";
      accept.className = "suggestion-accept";
      accept.dataset.acceptCheck = item.id;
      accept.append(iconElement("check"));
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
    text.setAttribute("aria-label", item.source === "coordination" ? "Tarefa registrada pela coordenação" : "Descrição da pendência");
    if (item.source === "coordination") text.title = `Coordenação · ${item.authorName || "autoria não informada"} · ${formatDateTime(item.createdAt)}`;

    const textStack = document.createElement("div");
    textStack.className = "check-text-stack";
    textStack.append(text);
    if (item.source === "ai") {
      const origin = document.createElement("span");
      origin.className = "check-origin is-ai";
      origin.textContent = "ORIGEM IA";
      origin.title = "Item originado por sugestão da IA e aceito/revisado por uma pessoa.";
      textStack.append(origin);
    } else if (item.source === "coordination") {
      const origin = document.createElement("span");
      const imported = String(item.authorName || "").startsWith(IMPORTED_UNVERIFIED_LABEL);
      origin.className = `check-origin is-coordination${imported ? " is-imported" : ""}`;
      origin.textContent = `COORDENAÇÃO · ${item.authorName || "autoria não informada"}`;
      textStack.append(origin);
    }

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
    remove.append(iconElement("close"));
    remove.setAttribute("aria-label", "Excluir pendência");

    row.append(firstControl, textStack, priority, due, remove);
    container.append(row);
  });

  const activeItems = bed.checklist.filter((item) => !item.suggested);
  const suggestions = bed.checklist.length - activeItems.length;
  const done = activeItems.filter((item) => item.done).length;
  const total = activeItems.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  $("#check-progress-bar").style.width = `${percent}%`;
  const progressLabel = `${done} de ${total} concluídas${suggestions ? ` · ${suggestions} sugestão${suggestions === 1 ? "" : "ões"} aguardando aceite` : ""}`;
  $("#check-progress-label").textContent = progressLabel;
  $("#check-progress").setAttribute("aria-valuenow", String(percent));
  $("#check-progress").setAttribute("aria-valuetext", progressLabel);
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
    if (event.author) {
      const author = document.createElement("span");
      author.className = "timeline-event-author";
      author.textContent = event.author;
      meta.append(author);
    }

    const text = document.createElement("p");
    text.className = "timeline-event-text";
    text.textContent = event.text;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "timeline-remove";
    remove.dataset.removeEvent = event.id;
    remove.append(iconElement("close"));
    remove.setAttribute("aria-label", "Excluir atualização");

    row.append(meta, text, remove);
    list.append(row);
  });
}

function renderReadback() {
  const bed = activeBed();
  const readback = bed.readback || newReadback();
  $("#receiver-name").value = readback.receiverName || "";
  $("#receiver-crm").value = readback.receiverCrm || "";
  $$('[data-readback-field]').forEach((input) => {
    input.checked = Boolean(readback[input.dataset.readbackField]);
  });

  const status = $("#readback-status");
  const confirmed = isReadbackConfirmed(bed);
  status.classList.toggle("is-confirmed", confirmed);
  status.textContent = confirmed
    ? `Confirmado em ${formatDateTime(readback.confirmedAt)}`
    : hasPracticalPatientIdentifiers(bed)
      ? "Ainda não confirmado"
      : "Bloqueado: informe nome e prontuário/ID";
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
      const releasePreview = () => setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
      image.onload = releasePreview;
      image.onerror = releasePreview;
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
    download.setAttribute("aria-label", `Baixar ${file.name}`);
    download.append(iconElement("export"));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.deleteFile = file.id;
    remove.title = "Excluir arquivo";
    remove.setAttribute("aria-label", `Excluir ${file.name}`);
    remove.append(iconElement("trash"));
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
    button.tabIndex = isActive ? 0 : -1;
  });

  known.forEach((name) => {
    const panel = $(`#tab-${name}`);
    const isActive = name === tab;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });
  if (tab === "vault") void renderFiles();
}

async function addFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  const bedId = state.activeBedId;
  let addedCount = 0;

  for (const file of files) {
    const metadata = await validateAttachmentFile(file);
    if (!metadata.ok) {
      toast(`${file.name || "Arquivo"}: ${metadata.reason}`, true);
      continue;
    }
    const normalizedBlob = file.slice(0, file.size, metadata.mime);
    await putFile({
      id: crypto.randomUUID(),
      bedId,
      name: file.name,
      type: metadata.mime,
      size: file.size,
      lastModified: file.lastModified,
      blob: normalizedBlob,
      selected: true,
      addedAt: new Date().toISOString(),
    });
    addedCount += 1;
  }

  const bed = addedCount ? state.beds.find((candidate) => candidate.id === bedId) : null;
  if (bed) {
    bed.updatedAt = new Date().toISOString();
    invalidateReadback(bed);
    scheduleSave();
  }

  await renderFiles();
  renderBatteryRail();
  if (addedCount) toast(`${addedCount} arquivo${addedCount === 1 ? " adicionado" : "s adicionados"} ao ${bedId}.`);
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
    source: ["manual", "ai", "coordination"].includes(seed.source) ? seed.source : "manual",
  });
  bed.updatedAt = new Date().toISOString();
  invalidateReadback(bed);
  renderChecklist();
  renderBatteryRail();
  scheduleSave();
}

function acceptChecklistSuggestion(bed, itemId) {
  const item = bed?.checklist?.find((candidate) => candidate.id === itemId);
  if (!item || !item.suggested) return null;
  item.suggested = false;
  return item;
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
  if (selectedFiles.length > MAX_ATTACHMENT_COUNT) throw new Error(`${bed.id}: selecione no máximo ${MAX_ATTACHMENT_COUNT} anexos.`);
  let totalSize = 0;
  for (const file of selectedFiles) {
    const metadata = await validateAttachmentFile(file);
    if (!metadata.ok) {
      throw new Error(`${bed.id}: ${file.name || "anexo"} foi bloqueado antes do envio (${metadata.reason}) Remova-o do cofre.`);
    }
    totalSize += metadata.size;
  }
  if (totalSize > MAX_ATTACHMENT_TOTAL_BYTES) {
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
      source: "ai",
    });
  });

  bed.renderFingerprint = fingerprint;
  bed.updatedAt = new Date().toISOString();
  invalidateReadback(bed, "uma nova renderização foi aplicada");
  addNotification({
    type: "render-complete",
    severity: "success",
    title: `${bed.id}: 10 linhas renderizadas`,
    body: "A saída está pronta para revisão médica e aceite das sugestões de checklist.",
    bedId: bed.id,
    tab: "render",
    dedupeKey: `render-complete:${bed.id}:${fingerprint}`,
    source: "GPT + dados registrados",
  });
  if (bed.alerts.length) {
    addNotification({
      type: "ai-alerts",
      severity: "attention",
      title: `${bed.id}: alertas sinalizados pela IA`,
      body: `${bed.alerts.length} item${bed.alerts.length === 1 ? "" : "s"} exige${bed.alerts.length === 1 ? "" : "m"} revisão médica.`,
      bedId: bed.id,
      tab: "render",
      dedupeKey: `ai-alerts:${bed.id}:${fingerprint}`,
      source: "sinalização da IA",
    });
  }
  if (bed.missing.length) {
    addNotification({
      type: "ai-missing",
      severity: "attention",
      title: `${bed.id}: lacunas sinalizadas pela IA`,
      body: `${bed.missing.length} dado${bed.missing.length === 1 ? "" : "s"} ausente${bed.missing.length === 1 ? "" : "s"} precisa${bed.missing.length === 1 ? "" : "m"} ser conferido${bed.missing.length === 1 ? "" : "s"}.`,
      bedId: bed.id,
      tab: "render",
      dedupeKey: `ai-missing:${bed.id}:${fingerprint}`,
      source: "sinalização da IA",
    });
  }
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
    if (error.name !== "AbortError") {
      addNotification({
        type: "render-error",
        severity: "error",
        title: `${bed.id}: análise não concluída`,
        body: message,
        bedId: bed.id,
        tab: "render",
        dedupeKey: `render-error:${bed.id}:${message}`,
        source: "sistema local",
      });
    }
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
    const summary = cancelled
      ? `Turbo cancelado · ${rendered} concluído${rendered === 1 ? "" : "s"}.`
      : `Turbo finalizado · ${rendered} novo${rendered === 1 ? "" : "s"}, ${skipped} sem mudanças${failed ? `, ${failed} com falha` : ""}.`;
    toast(summary, Boolean(failed));
    addNotification({
      type: "turbo-summary",
      severity: failed ? "error" : cancelled ? "info" : "success",
      title: failed ? "Turbo finalizado com atenção" : cancelled ? "Turbo interrompido" : "Turbo finalizado",
      body: summary,
      dedupeKey: `turbo-summary:${new Date().toISOString()}`,
      source: "processamento local",
    });
  } catch (error) {
    toast(error.message || "O modo Turbo não pôde ser concluído.", true);
    addNotification({
      type: "turbo-error",
      severity: "error",
      title: "Turbo não concluído",
      body: error.message || "O processamento em lote não pôde ser concluído.",
      source: "sistema local",
    });
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
  overlay.setAttribute("aria-hidden", String(!show));
  $("#workspace").setAttribute("aria-busy", String(show));
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

function aiSignalsForBed(bed) {
  const normalize = (items) => Array.isArray(items)
    ? items.map((item) => clippedText(item, 1_000).trim()).filter(Boolean)
    : [];
  return { alerts: normalize(bed?.alerts), missing: normalize(bed?.missing) };
}

function handoffText(bed, settings = state.settings, actor = clinicalActor(state)) {
  assertClinicalIdentifiers([bed], "preparar a passagem clínica");
  const signals = aiSignalsForBed(bed);
  const header = [
    `PASSAGEM DE PLANTÃO · ${settings.unit || "UTI"}`,
    `${bed.id} · ${bed.patientName || "PACIENTE NÃO IDENTIFICADO"}${bed.age ? ` · ${bed.age} ANOS` : ""} · ${bed.acuity}`,
    patientSecondaryIdentifier(bed).toLocaleUpperCase("pt-BR"),
    `RESPONSÁVEL: ${clinicalActorLabel(actor).toLocaleUpperCase("pt-BR")}`,
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
    "",
    "SINALIZAÇÕES DA IA · REVISÃO MÉDICA OBRIGATÓRIA:",
    "ALERTAS SINALIZADOS PELA IA:",
    ...(signals.alerts.length ? signals.alerts.map((item) => `• ${item}`) : ["• Nenhum alerta da IA registrado."]),
    "DADOS CRÍTICOS AUSENTES SINALIZADOS PELA IA:",
    ...(signals.missing.length ? signals.missing.map((item) => `• ${item}`) : ["• Nenhuma lacuna da IA registrada."]),
    ...(timeline.length ? ["", "ATUALIZAÇÕES DO PLANTÃO:", ...timeline] : []),
    ...(pending.length ? ["", "PENDÊNCIAS:", ...pending] : []),
    ...(receipt.length ? ["", ...receipt] : []),
  ].join("\n");
}

function shiftHeader(settings, actor = settings) {
  return [
    `PASSAGEM DE PLANTÃO · ${settings.hospital || "HOSPITAL NÃO INFORMADO"} · ${settings.unit || "UTI"}`,
    `${settings.date || "DATA NÃO INFORMADA"} · ${settings.shift || "TURNO NÃO INFORMADO"}`,
    `RESPONSÁVEL: ${clinicalActorLabel(actor).toLocaleUpperCase("pt-BR")}`,
  ];
}

function shiftText(settings, beds, actor = settings) {
  const occupied = beds.filter(bedHasData);
  assertClinicalIdentifiers(occupied, "exportar o plantão");
  return [
    ...shiftHeader(settings, actor),
    "",
    occupied.length
      ? occupied.map((bed) => handoffText(bed, settings, actor)).join("\n\n────────────────────\n\n")
      : "NENHUM LEITO COM DADOS REGISTRADOS.",
  ].join("\n");
}

function markdownInline(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/([*_`[\]])/g, "\\$1");
}

function handoffMarkdown(bed, settings = state.settings, actor = clinicalActor(state)) {
  assertClinicalIdentifiers([bed], "preparar a passagem clínica");
  const signals = aiSignalsForBed(bed);
  const pending = bed.checklist.filter((item) => !item.done && !item.suggested);
  const timeline = [...bed.timeline]
    .sort((a, b) => String(a.at).localeCompare(String(b.at)))
    .slice(-8);
  const lines = [
    `## ${bed.id} · ${markdownInline(bed.patientName || "Paciente não identificado")}`,
    "",
    `- **UTI:** ${markdownInline(settings.unit || "UTI")}`,
    `- **Idade:** ${markdownInline(bed.age || "Não informada")}`,
    `- **Estado:** ${markdownInline(bed.acuity)}`,
    `- **Prontuário/ID:** ${markdownInline(bed.record || "Não informado")}`,
    `- **Admissão:** ${markdownInline(bed.admission || "Não informada")}`,
    `- **Responsável:** ${markdownInline(clinicalActorLabel(actor))}`,
    "",
    "### Dez linhas executáveis",
    "",
    ...bed.handoff.map((line, index) => `${index + 1}. **${markdownInline(HANDOFF_LABELS[index])}:** ${markdownInline(line.text.trim() || "Não informado")}`),
    "",
    "### Sinalizações da IA · revisão médica obrigatória",
    "",
    "**Alertas sinalizados pela IA:**",
    ...(signals.alerts.length ? signals.alerts.map((item) => `- ${markdownInline(item)}`) : ["- Nenhum alerta da IA registrado."]),
    "",
    "**Dados críticos ausentes sinalizados pela IA:**",
    ...(signals.missing.length ? signals.missing.map((item) => `- ${markdownInline(item)}`) : ["- Nenhuma lacuna da IA registrada."]),
  ];
  if (timeline.length) {
    lines.push("", "### Atualizações do plantão", "", ...timeline.map((event) => `- **${markdownInline(formatDateTime(event.at))} · ${markdownInline(event.type)}:** ${markdownInline(event.text)}`));
  }
  if (pending.length) {
    lines.push("", "### Pendências", "", ...pending.map((item) => `- [ ] ${markdownInline(item.text)}${item.due ? ` · ${markdownInline(item.due)}` : ""} · prioridade ${markdownInline(item.priority)}`));
  }
  if (isReadbackConfirmed(bed)) {
    lines.push("", `> Recebido por ${markdownInline(bed.readback.receiverName)} · ${markdownInline(bed.readback.receiverCrm)} · ${markdownInline(formatDateTime(bed.readback.confirmedAt))}`);
  }
  return lines.join("\n");
}

function shiftMarkdown(settings, beds, actor = settings) {
  const occupied = beds.filter(bedHasData);
  assertClinicalIdentifiers(occupied, "exportar o plantão");
  return [
    "# Passagem de Plantão UTI",
    "",
    `- **Hospital:** ${markdownInline(settings.hospital || "Não informado")}`,
    `- **Unidade:** ${markdownInline(settings.unit || "UTI")}`,
    `- **Data/turno:** ${markdownInline(settings.date || "Não informada")} · ${markdownInline(settings.shift || "Não informado")}`,
    `- **Responsável:** ${markdownInline(clinicalActorLabel(actor))}`,
    "",
    occupied.length
      ? occupied.map((bed) => handoffMarkdown(bed, settings, actor)).join("\n\n---\n\n")
      : "_Nenhum leito com dados registrados._",
    "",
    "> Ferramenta de apoio. Revise o conteúdo e mantenha o registro oficial no prontuário institucional.",
  ].join("\n");
}

function whatsappTextForBed(bed, settings = state.settings, actor = clinicalActor(state)) {
  assertClinicalIdentifiers([bed], "preparar a mensagem clínica");
  const pending = bed.checklist.filter((item) => !item.done && !item.suggested);
  const signals = aiSignalsForBed(bed);
  return [
    `*PASSAGEM UTI · ${settings.unit || "UTI"} · ${bed.id}*`,
    `*Paciente:* ${bed.patientName || "NÃO IDENTIFICADO"}${bed.age ? ` · ${bed.age} anos` : ""}`,
    `*Identificador:* ${patientSecondaryIdentifier(bed)}`,
    `*Estado:* ${bed.acuity}`,
    `*Responsável:* ${clinicalActorLabel(actor)}`,
    "",
    ...bed.handoff.map((line, index) => `*${index + 1}. ${HANDOFF_LABELS[index]}:* ${line.text.trim() || "Não informado"}`),
    "",
    "*SINALIZAÇÕES DA IA · REVISÃO MÉDICA OBRIGATÓRIA*",
    "*Alertas sinalizados pela IA:*",
    ...(signals.alerts.length ? signals.alerts.map((item) => `• ${item}`) : ["• Nenhum alerta da IA registrado."]),
    "*Dados críticos ausentes sinalizados pela IA:*",
    ...(signals.missing.length ? signals.missing.map((item) => `• ${item}`) : ["• Nenhuma lacuna da IA registrada."]),
    ...(pending.length ? ["", "*PENDÊNCIAS:*", ...pending.map((item) => `☐ ${item.text}${item.due ? ` · ${item.due}` : ""}`)] : []),
    "",
    "_Mensagem preparada pelo Passagem UTI; requer revisão médica. O prontuário continua sendo o registro oficial._",
  ].join("\n");
}

function whatsappTextForShift(settings, beds, actor = settings) {
  const occupied = beds.filter(bedHasData);
  assertClinicalIdentifiers(occupied, "preparar a mensagem do plantão");
  return [
    [
      `*PASSAGEM DE PLANTÃO · ${settings.hospital || "HOSPITAL"} · ${settings.unit || "UTI"}*`,
      `${settings.date || "DATA NÃO INFORMADA"} · ${settings.shift || "TURNO NÃO INFORMADO"}`,
      `*Responsável:* ${clinicalActorLabel(actor)}`,
    ].join("\n"),
    "",
    occupied.map((bed) => whatsappTextForBed(bed, settings, actor)).join("\n\n──────────\n\n"),
  ].join("\n");
}

function capsuleError(message) {
  throw new Error(`Cápsula UTI inválida: ${message}`);
}

function isPlainRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function capsuleString(value, label, max, { allowEmpty = true } = {}) {
  if (typeof value !== "string") capsuleError(`${label} deve ser texto.`);
  if (!allowEmpty && !value.trim()) capsuleError(`${label} é obrigatório.`);
  if (value.length > max) capsuleError(`${label} ultrapassa ${max.toLocaleString("pt-BR")} caracteres.`);
  return value;
}

function capsuleBoolean(value, label, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") capsuleError(`${label} deve ser verdadeiro ou falso.`);
  return value;
}

function capsuleIso(value, label, { allowEmpty = true } = {}) {
  if ((value === null || value === "") && allowEmpty) return null;
  const text = capsuleString(value, label, 64, { allowEmpty: false });
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) capsuleError(`${label} contém data ou hora inválida.`);
  return parsed.toISOString();
}

function capsuleDate(value, label) {
  const text = capsuleString(value, label, 10);
  if (text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) capsuleError(`${label} deve usar AAAA-MM-DD.`);
    const [year, month, day] = text.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) capsuleError(`${label} contém uma data inexistente.`);
  }
  return text;
}

function capsuleSettingsFromState(settings = {}) {
  const text = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");
  return {
    staffId: text(settings.staffId, 120),
    doctorName: text(settings.doctorName, 240),
    crm: text(settings.crm, 80),
    city: text(settings.city, 160),
    hospital: text(settings.hospital, 240),
    unit: text(settings.unit, 80),
    shift: ["DIURNO", "NOTURNO", "24 HORAS"].includes(settings.shift) ? settings.shift : "DIURNO",
    date: /^\d{4}-\d{2}-\d{2}$/.test(settings.date || "") ? settings.date : localISODate(),
    theme: VALID_THEMES.has(settings.theme) ? settings.theme : "system",
    specialty: text(settings.specialty, 160),
    rqe: text(settings.rqe, 80),
    role: VALID_ROLES.has(settings.role) ? settings.role : "PLANTONISTA",
    careMode: VALID_CARE_MODES.has(settings.careMode) ? settings.careMode : "AD_HOC",
  };
}

function capsuleContinuityFromState(value) {
  const normalized = normalizeContinuity(value);
  const profile = (source) => ({
    id: clippedText(source.id, 100),
    doctorName: clippedText(source.doctorName, 240),
    crm: clippedText(source.crm, 80),
    specialty: clippedText(source.specialty, 160),
    rqe: clippedText(source.rqe, 80),
    role: VALID_ROLES.has(source.role) ? source.role : "PLANTONISTA",
    careMode: VALID_CARE_MODES.has(source.careMode) ? source.careMode : "AD_HOC",
    startedAt: source.startedAt,
    endedAt: source.endedAt || null,
    endReason: source.endReason || null,
  });
  return {
    activeShift: normalized.activeShift ? profile(normalized.activeShift) : null,
    sessions: normalized.sessions.map(profile),
    auditLog: normalized.auditLog.map((event) => ({
      id: clippedText(event.id, 100),
      action: event.action,
      at: event.at,
      actor: normalizeProfile(event.actor),
      bedId: event.bedId,
      detail: clippedText(event.detail, MAX_COORDINATION_TEXT),
    })),
  };
}

function capsuleBedFromState(bed, index) {
  const id = /^L(?:10|[1-9])$/.test(bed?.id || "") ? bed.id : `L${index + 1}`;
  const text = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");
  return {
    id,
    patientName: text(bed?.patientName, 300),
    age: text(bed?.age, 32),
    record: text(bed?.record, 160),
    admission: /^\d{4}-\d{2}-\d{2}$/.test(bed?.admission || "") ? bed.admission : "",
    acuity: VALID_ACUITIES.has(bed?.acuity) ? bed.acuity : "NÃO DEFINIDO",
    clinicalText: text(bed?.clinicalText, MAX_CLINICAL_TEXT),
    handoff: HANDOFF_LABELS.map((label, lineIndex) => ({
      number: lineIndex + 1,
      label,
      text: text(bed?.handoff?.[lineIndex]?.text, 20_000),
    })),
    checklist: Array.isArray(bed?.checklist) ? bed.checklist.slice(0, 200).map((item, itemIndex) => ({
      id: text(item?.id, 100) || `capsula-${id}-check-${itemIndex + 1}`,
      text: text(item?.text, 1_000),
      priority: VALID_PRIORITIES.has(item?.priority) ? item.priority : "media",
      due: text(item?.due, 80),
      done: Boolean(item?.done),
      suggested: Boolean(item?.suggested),
      source: item?.source === "coordination" ? "coordination" : item?.source === "ai" ? "ai" : "manual",
      createdAt: item?.createdAt || null,
      authorName: text(item?.authorName, 240),
      authorCrm: text(item?.authorCrm, 80),
    })) : [],
    timeline: Array.isArray(bed?.timeline) ? bed.timeline.slice(0, 500).map((event, eventIndex) => ({
      id: text(event?.id, 100) || `capsula-${id}-event-${eventIndex + 1}`,
      type: VALID_TIMELINE_TYPES.has(event?.type) ? event.type : "INTERCORRÊNCIA",
      text: text(event?.text, 600),
      at: event?.at || null,
      author: text(event?.author, 240),
    })) : [],
    readback: {
      receiverName: text(bed?.readback?.receiverName, 240),
      receiverCrm: text(bed?.readback?.receiverCrm, 80),
      linesReviewed: Boolean(bed?.readback?.linesReviewed),
      risksReviewed: Boolean(bed?.readback?.risksReviewed),
      tasksUnderstood: Boolean(bed?.readback?.tasksUnderstood),
      confirmedAt: bed?.readback?.confirmedAt || null,
      contentHash: text(bed?.readback?.contentHash, 128),
    },
    activities: {
      evolutionDone: Boolean(bed?.activities?.evolutionDone),
      prescriptionReviewed: Boolean(bed?.activities?.prescriptionReviewed),
      examsReviewed: Boolean(bed?.activities?.examsReviewed),
      updatedAt: bed?.activities?.updatedAt || null,
      updatedBy: text(bed?.activities?.updatedBy, 240),
    },
    alerts: Array.isArray(bed?.alerts) ? bed.alerts.slice(0, 50).map((item) => text(item, 1_000)) : [],
    missing: Array.isArray(bed?.missing) ? bed.missing.slice(0, 50).map((item) => text(item, 1_000)) : [],
    aiAcuity: text(bed?.aiAcuity, 80),
    updatedAt: bed?.updatedAt || null,
  };
}

function buildCapsule(workspace, mode = "shift", bedId = workspace.activeBedId) {
  if (!["bed", "shift"].includes(mode)) throw new Error("Modo de Cápsula UTI desconhecido.");
  const sourceBeds = mode === "bed"
    ? [workspace.beds.find((bed) => bed.id === bedId)].filter(Boolean)
    : workspace.beds;
  if (mode === "bed" && sourceBeds.length !== 1) throw new Error("Leito não encontrado para exportação.");
  if (mode === "shift" && sourceBeds.length !== 10) throw new Error("O plantão completo precisa conter os dez leitos.");
  assertClinicalIdentifiers(sourceBeds.filter(bedHasData), "exportar a Cápsula UTI");
  const actor = clinicalActor(workspace);
  const capsule = {
    schema: CAPSULE_SCHEMA_ID,
    schemaVersion: CAPSULE_SCHEMA_VERSION,
    appVersion: 5,
    exportedAt: new Date().toISOString(),
    mode,
    data: {
      settings: capsuleSettingsFromState({ ...workspace.settings, ...actor }),
      activeBedId: mode === "bed" ? sourceBeds[0].id : (/^L(?:10|[1-9])$/.test(bedId || "") ? bedId : "L1"),
      beds: sourceBeds.map((bed) => capsuleBedFromState(bed, Math.max(0, Number(bed.id.slice(1)) - 1))),
      continuity: mode === "bed" ? newContinuity() : capsuleContinuityFromState(workspace.continuity),
    },
  };
  validateCapsule(capsule);
  const serializedBytes = new TextEncoder().encode(JSON.stringify(capsule, null, 2)).byteLength;
  if (serializedBytes > CAPSULE_MAX_BYTES) {
    throw new Error("A Cápsula UTI ultrapassa o limite de 4 MiB e não pode ser exportada.");
  }
  return capsule;
}

function validateCapsuleSettings(raw) {
  if (!isPlainRecord(raw)) capsuleError("data.settings deve ser um objeto.");
  const shift = capsuleString(raw.shift, "turno", 20, { allowEmpty: false });
  if (!["DIURNO", "NOTURNO", "24 HORAS"].includes(shift)) capsuleError("turno não reconhecido.");
  const theme = capsuleString(raw.theme, "tema", 12, { allowEmpty: false });
  if (!VALID_THEMES.has(theme)) capsuleError("tema não reconhecido.");
  const role = raw.role === undefined ? "PLANTONISTA" : capsuleString(raw.role, "papel", 20, { allowEmpty: false });
  if (!VALID_ROLES.has(role)) capsuleError("papel profissional não reconhecido.");
  const careMode = raw.careMode === undefined ? "AD_HOC" : capsuleString(raw.careMode, "modo de adesão", 20, { allowEmpty: false });
  if (!VALID_CARE_MODES.has(careMode)) capsuleError("modo de adesão não reconhecido.");
  return {
    staffId: capsuleString(raw.staffId, "ID interno", 120),
    doctorName: capsuleString(raw.doctorName, "nome do médico", 240),
    crm: capsuleString(raw.crm, "CRM", 80),
    city: capsuleString(raw.city, "cidade", 160),
    hospital: capsuleString(raw.hospital, "hospital", 240),
    unit: capsuleString(raw.unit, "UTI", 80),
    shift,
    date: capsuleDate(raw.date, "data do plantão"),
    theme,
    specialty: raw.specialty === undefined ? "" : capsuleString(raw.specialty, "especialidade", 160),
    rqe: raw.rqe === undefined ? "" : capsuleString(raw.rqe, "RQE", 80),
    role,
    careMode,
  };
}

function validateCapsuleBed(raw, bedIndex) {
  if (!isPlainRecord(raw)) capsuleError(`leito ${bedIndex + 1} deve ser um objeto.`);
  const id = capsuleString(raw.id, `leito ${bedIndex + 1}.id`, 3, { allowEmpty: false });
  if (!/^L(?:10|[1-9])$/.test(id)) capsuleError(`${id || "leito"} não usa um identificador entre L1 e L10.`);
  if (!VALID_ACUITIES.has(raw.acuity)) capsuleError(`${id}.estado não reconhecido.`);
  if (!Array.isArray(raw.handoff) || raw.handoff.length !== 10) capsuleError(`${id} deve conter exatamente 10 linhas.`);
  const handoff = raw.handoff.map((line, lineIndex) => {
    if (!isPlainRecord(line) || line.number !== lineIndex + 1) capsuleError(`${id}.linha ${lineIndex + 1} está fora de ordem.`);
    return { number: lineIndex + 1, label: HANDOFF_LABELS[lineIndex], text: capsuleString(line.text, `${id}.linha ${lineIndex + 1}`, 20_000) };
  });
  if (!Array.isArray(raw.checklist) || raw.checklist.length > 200) capsuleError(`${id}.checklist excede 200 itens ou não é uma lista.`);
  const checklist = raw.checklist.map((item, itemIndex) => {
    if (!isPlainRecord(item)) capsuleError(`${id}.checklist ${itemIndex + 1} deve ser um objeto.`);
    const priority = capsuleString(item.priority, `${id}.checklist ${itemIndex + 1}.prioridade`, 8, { allowEmpty: false });
    if (!VALID_PRIORITIES.has(priority)) capsuleError(`${id}.checklist ${itemIndex + 1} tem prioridade inválida.`);
    const source = item.source === undefined ? "manual" : capsuleString(item.source, `${id}.checklist ${itemIndex + 1}.origem`, 20, { allowEmpty: false });
    if (!["manual", "ai", "coordination"].includes(source)) capsuleError(`${id}.checklist ${itemIndex + 1} tem origem inválida.`);
    const createdAt = item.createdAt === undefined ? null : capsuleIso(item.createdAt, `${id}.checklist ${itemIndex + 1}.criação`);
    const authorName = item.authorName === undefined ? "" : capsuleString(item.authorName, `${id}.checklist ${itemIndex + 1}.autor`, 240);
    const authorCrm = item.authorCrm === undefined ? "" : capsuleString(item.authorCrm, `${id}.checklist ${itemIndex + 1}.CRM autor`, 80);
    if (source === "coordination" && (!createdAt || !authorName || !authorCrm)) capsuleError(`${id}.checklist ${itemIndex + 1} de coordenação exige data, nome e CRM.`);
    return {
      id: item.id === undefined ? `capsula-${id}-check-${itemIndex + 1}` : capsuleString(item.id, `${id}.checklist ${itemIndex + 1}.id`, 100, { allowEmpty: false }),
      text: capsuleString(item.text, `${id}.checklist ${itemIndex + 1}.texto`, 1_000),
      priority,
      due: capsuleString(item.due, `${id}.checklist ${itemIndex + 1}.prazo`, 80),
      done: capsuleBoolean(item.done, `${id}.checklist ${itemIndex + 1}.concluído`),
      suggested: capsuleBoolean(item.suggested, `${id}.checklist ${itemIndex + 1}.sugerido`),
      source,
      createdAt,
      authorName,
      authorCrm,
    };
  });
  if (new Set(checklist.map((item) => item.id)).size !== checklist.length) capsuleError(`${id}.checklist contém IDs duplicados.`);
  if (!Array.isArray(raw.timeline) || raw.timeline.length > 500) capsuleError(`${id}.linha do tempo excede 500 eventos ou não é uma lista.`);
  const timeline = raw.timeline.map((event, eventIndex) => {
    if (!isPlainRecord(event)) capsuleError(`${id}.evento ${eventIndex + 1} deve ser um objeto.`);
    const type = capsuleString(event.type, `${id}.evento ${eventIndex + 1}.tipo`, 30, { allowEmpty: false });
    if (!VALID_TIMELINE_TYPES.has(type)) capsuleError(`${id}.evento ${eventIndex + 1} tem tipo inválido.`);
    return {
      id: event.id === undefined ? `capsula-${id}-event-${eventIndex + 1}` : capsuleString(event.id, `${id}.evento ${eventIndex + 1}.id`, 100, { allowEmpty: false }),
      type,
      text: capsuleString(event.text, `${id}.evento ${eventIndex + 1}.texto`, 600, { allowEmpty: false }),
      at: capsuleIso(event.at, `${id}.evento ${eventIndex + 1}.data`, { allowEmpty: false }),
      author: capsuleString(event.author, `${id}.evento ${eventIndex + 1}.autor`, 240),
    };
  });
  if (new Set(timeline.map((event) => event.id)).size !== timeline.length) capsuleError(`${id}.linha do tempo contém IDs duplicados.`);
  const readback = raw.readback === undefined ? {} : raw.readback;
  if (!isPlainRecord(readback)) capsuleError(`${id}.read-back deve ser um objeto.`);
  const activities = raw.activities === undefined ? {} : raw.activities;
  if (!isPlainRecord(activities)) capsuleError(`${id}.atividades deve ser um objeto.`);
  const stringList = (value, label) => {
    if (!Array.isArray(value) || value.length > 50) capsuleError(`${id}.${label} excede 50 itens ou não é uma lista.`);
    return value.map((item, index) => capsuleString(item, `${id}.${label} ${index + 1}`, 1_000));
  };
  return {
    id,
    patientName: capsuleString(raw.patientName, `${id}.paciente`, 300),
    age: capsuleString(raw.age, `${id}.idade`, 32),
    record: capsuleString(raw.record, `${id}.prontuário`, 160),
    admission: capsuleDate(raw.admission, `${id}.admissão`),
    acuity: raw.acuity,
    clinicalText: capsuleString(raw.clinicalText, `${id}.texto clínico`, MAX_CLINICAL_TEXT),
    handoff,
    checklist,
    timeline,
    readback: {
      ...newReadback(),
      receiverName: readback.receiverName === undefined ? "" : capsuleString(readback.receiverName, `${id}.receptor`, 240),
      receiverCrm: readback.receiverCrm === undefined ? "" : capsuleString(readback.receiverCrm, `${id}.CRM receptor`, 80),
    },
    activities: {
      evolutionDone: capsuleBoolean(activities.evolutionDone, `${id}.evolução concluída`),
      prescriptionReviewed: capsuleBoolean(activities.prescriptionReviewed, `${id}.prescrição revisada`),
      examsReviewed: capsuleBoolean(activities.examsReviewed, `${id}.exames revisados`),
      updatedAt: activities.updatedAt === undefined ? null : capsuleIso(activities.updatedAt, `${id}.atualização das atividades`),
      updatedBy: activities.updatedBy === undefined ? "" : capsuleString(activities.updatedBy, `${id}.autor das atividades`, 240),
    },
    alerts: stringList(raw.alerts, "alertas"),
    missing: stringList(raw.missing, "lacunas"),
    aiAcuity: capsuleString(raw.aiAcuity, `${id}.estado IA`, 80),
    renderFingerprint: "",
    updatedAt: capsuleIso(raw.updatedAt, `${id}.atualização`),
  };
}

function validateCapsuleProfile(raw, label, { requireIdentity = false } = {}) {
  if (!isPlainRecord(raw)) capsuleError(`${label} deve ser um objeto.`);
  const doctorName = raw.doctorName === undefined ? "" : capsuleString(raw.doctorName, `${label}.nome`, 240, { allowEmpty: !requireIdentity });
  const crm = raw.crm === undefined ? "" : capsuleString(raw.crm, `${label}.CRM`, 80, { allowEmpty: !requireIdentity });
  const role = raw.role === undefined ? "PLANTONISTA" : capsuleString(raw.role, `${label}.papel`, 20, { allowEmpty: false });
  const careMode = raw.careMode === undefined ? "AD_HOC" : capsuleString(raw.careMode, `${label}.modo`, 20, { allowEmpty: false });
  if (!VALID_ROLES.has(role)) capsuleError(`${label}.papel não reconhecido.`);
  if (!VALID_CARE_MODES.has(careMode)) capsuleError(`${label}.modo não reconhecido.`);
  return {
    doctorName,
    crm,
    specialty: raw.specialty === undefined ? "" : capsuleString(raw.specialty, `${label}.especialidade`, 160),
    rqe: raw.rqe === undefined ? "" : capsuleString(raw.rqe, `${label}.RQE`, 80),
    role,
    careMode,
  };
}

function validateCapsuleSession(raw, label, { active = false } = {}) {
  if (!isPlainRecord(raw)) capsuleError(`${label} deve ser um objeto.`);
  const allowed = new Set(["id", "doctorName", "crm", "specialty", "rqe", "role", "careMode", "startedAt", "endedAt", "endReason"]);
  if (Object.keys(raw).some((key) => !allowed.has(key))) capsuleError(`${label} contém campos desconhecidos.`);
  const startedAt = capsuleIso(raw.startedAt, `${label}.entrada`, { allowEmpty: false });
  const endedAt = capsuleIso(raw.endedAt, `${label}.saída`);
  if (active && endedAt) capsuleError(`${label} vigente não pode conter saída.`);
  if (!active && (!endedAt || new Date(endedAt) < new Date(startedAt))) capsuleError(`${label} encerrado exige saída posterior à entrada.`);
  const endReason = raw.endReason === null || raw.endReason === undefined ? null : capsuleString(raw.endReason, `${label}.motivo`, 20, { allowEmpty: false });
  if (endReason && !["ENCERRADO", "TRANSFERIDO"].includes(endReason)) capsuleError(`${label}.motivo não reconhecido.`);
  if (active && endReason) capsuleError(`${label} vigente não pode conter motivo de encerramento.`);
  return {
    id: capsuleString(raw.id, `${label}.id`, 100, { allowEmpty: false }),
    ...validateCapsuleProfile(raw, label, { requireIdentity: true }),
    startedAt,
    endedAt,
    endReason: active ? null : endReason || "ENCERRADO",
  };
}

function validateCapsuleContinuity(raw) {
  if (raw === undefined) return newContinuity();
  if (!isPlainRecord(raw)) capsuleError("data.continuity deve ser um objeto.");
  const allowed = new Set(["activeShift", "sessions", "auditLog"]);
  if (Object.keys(raw).some((key) => !allowed.has(key))) capsuleError("data.continuity contém campos desconhecidos.");
  if (!Array.isArray(raw.sessions) || raw.sessions.length > MAX_CONTINUITY_SESSIONS) capsuleError(`continuidade excede ${MAX_CONTINUITY_SESSIONS} sessões ou não é uma lista.`);
  if (!Array.isArray(raw.auditLog) || raw.auditLog.length > MAX_AUDIT_EVENTS) capsuleError(`auditoria excede ${MAX_AUDIT_EVENTS} eventos ou não é uma lista.`);
  const activeShift = raw.activeShift === null || raw.activeShift === undefined ? null : validateCapsuleSession(raw.activeShift, "plantão vigente", { active: true });
  const sessions = raw.sessions.map((session, index) => validateCapsuleSession(session, `sessão ${index + 1}`));
  const sessionIds = [...sessions.map((session) => session.id), ...(activeShift ? [activeShift.id] : [])];
  if (new Set(sessionIds).size !== sessionIds.length) capsuleError("continuidade contém IDs de sessão duplicados.");
  const auditLog = raw.auditLog.map((event, index) => {
    if (!isPlainRecord(event)) capsuleError(`auditoria ${index + 1} deve ser um objeto.`);
    const allowedAudit = new Set(["id", "action", "at", "actor", "bedId", "detail"]);
    if (Object.keys(event).some((key) => !allowedAudit.has(key))) capsuleError(`auditoria ${index + 1} contém campos desconhecidos.`);
    const action = capsuleString(event.action, `auditoria ${index + 1}.ação`, 40, { allowEmpty: false });
    if (!VALID_AUDIT_ACTIONS.has(action)) capsuleError(`auditoria ${index + 1}.ação não reconhecida.`);
    const bedId = event.bedId === null || event.bedId === undefined ? null : capsuleString(event.bedId, `auditoria ${index + 1}.leito`, 3, { allowEmpty: false });
    if (bedId && !/^L(?:10|[1-9])$/.test(bedId)) capsuleError(`auditoria ${index + 1}.leito inválido.`);
    return {
      id: capsuleString(event.id, `auditoria ${index + 1}.id`, 100, { allowEmpty: false }),
      action,
      at: capsuleIso(event.at, `auditoria ${index + 1}.data`, { allowEmpty: false }),
      actor: validateCapsuleProfile(event.actor, `auditoria ${index + 1}.autor`),
      bedId,
      detail: capsuleString(event.detail, `auditoria ${index + 1}.detalhe`, MAX_COORDINATION_TEXT),
    };
  });
  if (new Set(auditLog.map((event) => event.id)).size !== auditLog.length) capsuleError("auditoria contém IDs duplicados.");
  return { activeShift, sessions, auditLog };
}

function validateCapsule(raw) {
  if (!isPlainRecord(raw)) capsuleError("a raiz deve ser um objeto JSON.");
  const allowedRoot = new Set(["schema", "schemaVersion", "appVersion", "exportedAt", "mode", "data"]);
  if (Object.keys(raw).some((key) => !allowedRoot.has(key))) capsuleError("a raiz contém campos desconhecidos.");
  if (raw.schema !== CAPSULE_SCHEMA_ID) capsuleError("identificador de schema desconhecido.");
  if (raw.schemaVersion !== CAPSULE_SCHEMA_VERSION) capsuleError(`versão de schema incompatível; suportada: ${CAPSULE_SCHEMA_VERSION}.`);
  if (!Number.isInteger(raw.appVersion) || raw.appVersion < 1 || raw.appVersion > 99) capsuleError("versão do aplicativo inválida.");
  const exportedAt = capsuleIso(raw.exportedAt, "data de exportação", { allowEmpty: false });
  if (!["bed", "shift"].includes(raw.mode)) capsuleError("modo deve ser bed ou shift.");
  if (!isPlainRecord(raw.data)) capsuleError("data deve ser um objeto.");
  const allowedData = new Set(["settings", "activeBedId", "beds", "continuity"]);
  if (Object.keys(raw.data).some((key) => !allowedData.has(key))) capsuleError("data contém campos desconhecidos.");
  if (!Array.isArray(raw.data.beds)) capsuleError("data.beds deve ser uma lista.");
  if (raw.mode === "bed" && raw.data.beds.length !== 1) capsuleError("uma cápsula de leito deve conter exatamente um leito.");
  if (raw.mode === "shift" && raw.data.beds.length !== 10) capsuleError("uma cápsula de plantão deve conter exatamente dez leitos.");
  const beds = raw.data.beds.map(validateCapsuleBed);
  const ids = beds.map((bed) => bed.id);
  if (new Set(ids).size !== ids.length) capsuleError("há identificadores de leito duplicados.");
  if (raw.mode === "shift" && !Array.from({ length: 10 }, (_, index) => `L${index + 1}`).every((id) => ids.includes(id))) {
    capsuleError("o plantão deve conter L1 até L10 exatamente uma vez.");
  }
  const activeBedId = capsuleString(raw.data.activeBedId, "leito ativo", 3, { allowEmpty: false });
  if (!/^L(?:10|[1-9])$/.test(activeBedId) || (raw.mode === "bed" && activeBedId !== beds[0].id)) capsuleError("leito ativo incompatível com o conteúdo.");
  const continuity = validateCapsuleContinuity(raw.data.continuity);
  if (raw.mode === "bed" && (continuity.activeShift || continuity.sessions.length || continuity.auditLog.length)) {
    capsuleError("uma Cápsula de leito não pode conter vigência, sessões ou auditoria global do plantão.");
  }
  return {
    schema: CAPSULE_SCHEMA_ID,
    schemaVersion: CAPSULE_SCHEMA_VERSION,
    appVersion: raw.appVersion,
    exportedAt,
    mode: raw.mode,
    data: { settings: validateCapsuleSettings(raw.data.settings), activeBedId, beds, continuity },
  };
}

function parseCapsuleText(text) {
  if (typeof text !== "string") capsuleError("o arquivo não contém texto JSON.");
  if (new TextEncoder().encode(text).byteLength > CAPSULE_MAX_BYTES) capsuleError("o arquivo ultrapassa o limite de 4 MiB.");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    capsuleError("JSON malformado.");
  }
  return validateCapsule(parsed);
}

function normalizedContextValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function capsuleContextMismatches(currentSettings, importedSettings) {
  const fields = [
    ["hospital", "hospital"],
    ["unit", "UTI"],
    ["date", "data"],
  ];
  return fields
    .filter(([field]) => {
      const current = normalizedContextValue(currentSettings?.[field]);
      const imported = normalizedContextValue(importedSettings?.[field]);
      return current && imported && current !== imported;
    })
    .map(([, label]) => label);
}

function attachmentBedIdsToClear(capsule, strategy) {
  if (strategy === "replace") return Array.from({ length: 10 }, (_, index) => `L${index + 1}`);
  return capsule.data.beds.map((bed) => bed.id);
}

function applyCapsuleToWorkspace(current, capsule, strategy) {
  if (!["merge", "replace"].includes(strategy)) throw new Error("Estratégia de importação desconhecida.");
  if (strategy === "merge") {
    const mismatches = capsuleContextMismatches(current.settings, capsule.data.settings);
    if (mismatches.length) {
      throw new Error(`A Cápsula pertence a outro contexto (${mismatches.join(", ")}). Use Substituir somente após conferir o plantão.`);
    }
  }
  const next = strategy === "replace" ? newState() : structuredClone(current);
  next.version = 5;
  if (strategy === "replace") {
    const importedSettings = capsule.data.settings;
    const localSettings = current.settings || {};
    next.settings = {
      ...next.settings,
      city: importedSettings.city,
      hospital: importedSettings.hospital,
      unit: importedSettings.unit,
      shift: importedSettings.shift,
      date: importedSettings.date,
      staffId: clippedText(localSettings.staffId, 120),
      doctorName: clippedText(localSettings.doctorName, 240),
      crm: clippedText(localSettings.crm, 80),
      specialty: clippedText(localSettings.specialty, 160),
      rqe: clippedText(localSettings.rqe, 80),
      role: VALID_ROLES.has(localSettings.role) ? localSettings.role : "PLANTONISTA",
      careMode: VALID_CARE_MODES.has(localSettings.careMode) ? localSettings.careMode : "AD_HOC",
      theme: VALID_THEMES.has(localSettings.theme) ? localSettings.theme : "system",
    };
    next.continuity = newContinuity();
  } else {
    const localContinuity = normalizeContinuity(current.continuity);
    next.continuity = {
      activeShift: null,
      sessions: localContinuity.sessions,
      auditLog: localContinuity.auditLog,
    };
  }
  capsule.data.beds.forEach((bed) => {
    const index = Number(bed.id.slice(1)) - 1;
    next.beds[index] = markImportedBedProvenance(bed);
  });
  next.activeBedId = capsule.data.activeBedId;
  next.activeTab = "render";
  next.savedAt = null;
  if (!Array.isArray(next.notifications)) next.notifications = [];
  return next;
}

function appendLocalCapsuleImportAudit(workspace, capsule, strategy, localActor, at = new Date().toISOString()) {
  return appendContinuityAudit(workspace.continuity, {
    action: "CAPSULE_IMPORTED",
    at,
    actor: normalizeProfile(localActor),
    detail: `${capsule.mode === "bed" ? `Cápsula do ${capsule.data.beds[0].id}` : "Cápsula do plantão"} importada por ${strategy === "replace" ? "substituição" : "mesclagem"}; anexos dos leitos afetados foram removidos.`,
  });
}

function clearImportedBedFiles(transaction, bedIds) {
  const targets = new Set(bedIds);
  const request = transaction.objectStore("files").openCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    if (targets.has(cursor.value?.bedId)) cursor.delete();
    cursor.continue();
  };
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
  try {
    await copyText(handoffText(activeBed(), state.settings, clinicalActor(state)));
    toast(`${activeBed().id} copiado para a área de transferência.`);
  } catch (error) {
    toast(error.message || "Não foi possível copiar a passagem clínica.", true);
  }
}

async function copyAllBeds() {
  const occupied = state.beds.filter(bedHasData);
  if (!occupied.length) return toast("Nenhum leito contém dados para copiar.", true);
  try {
    await copyText(shiftText(state.settings, state.beds, clinicalActor(state)));
    toast(`${occupied.length} leito${occupied.length === 1 ? " copiado" : "s copiados"}.`);
  } catch (error) {
    toast(error.message || "Não foi possível copiar o plantão.", true);
  }
}

function downloadTextFile(content, filename, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function exportClinicalText(scope, format) {
  const bed = activeBed();
  if (scope === "bed" && !bedHasData(bed)) return toast(`${bed.id} não contém dados para exportar.`, true);
  if (scope === "shift" && !state.beds.some(bedHasData)) return toast("Nenhum leito contém dados para exportar.", true);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(state.settings.date || "") ? state.settings.date : localISODate();
  const isMarkdown = format === "md";
  try {
    const actor = clinicalActor(state);
    const content = scope === "bed"
      ? (isMarkdown ? handoffMarkdown(bed, state.settings, actor) : handoffText(bed, state.settings, actor))
      : (isMarkdown ? shiftMarkdown(state.settings, state.beds, actor) : shiftText(state.settings, state.beds, actor));
    const target = scope === "bed" ? bed.id.toLocaleLowerCase("pt-BR") : "plantao-completo";
    downloadTextFile(content, `passagem-uti-${date}-${target}.${format}`, isMarkdown ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8");
    toast(`${scope === "bed" ? bed.id : "Plantão completo"} exportado em ${format.toUpperCase()}.`);
  } catch (error) {
    toast(error.message || "Não foi possível exportar a passagem clínica.", true);
  }
}

function printableBeds(workspace, mode, bedId = workspace.activeBedId) {
  if (!workspace || !Array.isArray(workspace.beds)) throw new Error("Plantão inválido para impressão.");
  if (mode === "bed") {
    const bed = workspace.beds.find((candidate) => candidate.id === bedId);
    if (!bed || !bedHasData(bed)) throw new Error(`${bedId || "O leito"} não contém dados para imprimir.`);
    assertClinicalIdentifiers([bed], "imprimir ou gerar PDF");
    return [bed];
  }
  if (mode !== "shift") throw new Error("Modo de impressão desconhecido.");
  const occupied = workspace.beds.filter(bedHasData);
  if (!occupied.length) throw new Error("Nenhum leito contém dados para imprimir.");
  assertClinicalIdentifiers(occupied, "imprimir ou gerar PDF");
  return occupied;
}

function buildPrintModel(workspace, mode, bedId = workspace.activeBedId, generatedAt = new Date().toISOString()) {
  const beds = printableBeds(workspace, mode, bedId);
  const settings = workspace.settings || {};
  const continuity = workspace.continuity || newContinuity();
  const session = continuity.activeShift || null;
  const professional = clinicalActor(workspace);
  return {
    mode,
    generatedAt: safeIsoOrNull(generatedAt) || new Date().toISOString(),
    institution: {
      hospital: clippedText(settings.hospital, 240),
      unit: clippedText(settings.unit, 80),
      city: clippedText(settings.city, 160),
      date: clippedText(settings.date, 10),
      shift: clippedText(settings.shift, 20),
    },
    professional: {
      doctorName: clippedText(professional?.doctorName, 240),
      crm: clippedText(professional?.crm, 80),
      specialty: clippedText(professional?.specialty, 160),
      rqe: clippedText(professional?.rqe, 80),
      role: roleLabel(professional?.role),
      careMode: careModeLabel(professional?.careMode),
      isActive: Boolean(continuity.activeShift),
      startedAt: safeIsoOrNull(session?.startedAt),
      endedAt: safeIsoOrNull(session?.endedAt),
    },
    beds: beds.map((bed) => ({
      id: bed.id,
      patientName: clippedText(bed.patientName, 300),
      age: clippedText(bed.age, 32),
      record: clippedText(bed.record, 160),
      admission: clippedText(bed.admission, 10),
      acuity: VALID_ACUITIES.has(bed.acuity) ? bed.acuity : "NÃO DEFINIDO",
      updatedAt: safeIsoOrNull(bed.updatedAt),
      handoff: HANDOFF_LABELS.map((label, index) => ({
        number: index + 1,
        label,
        text: clippedText(bed.handoff?.[index]?.text, 20_000),
      })),
      alerts: aiSignalsForBed(bed).alerts,
      missing: aiSignalsForBed(bed).missing,
      activities: [
        { label: "Evolução concluída", done: Boolean(bed.activities?.evolutionDone) },
        { label: "Prescrição revisada", done: Boolean(bed.activities?.prescriptionReviewed) },
        { label: "Exames revisados", done: Boolean(bed.activities?.examsReviewed) },
      ],
      pending: Array.isArray(bed.checklist) ? bed.checklist
        .filter((item) => !item.done && !item.suggested)
        .slice(0, 200)
        .map((item) => ({
          text: clippedText(item.text, 1_000),
          priority: VALID_PRIORITIES.has(item.priority) ? item.priority : "media",
          due: clippedText(item.due, 80),
        })) : [],
      acceptance: {
        confirmed: isReadbackConfirmed(bed),
        receiverName: clippedText(bed.readback?.receiverName, 240),
        receiverCrm: clippedText(bed.readback?.receiverCrm, 80),
        confirmedAt: safeIsoOrNull(bed.readback?.confirmedAt),
        linesReviewed: Boolean(bed.readback?.linesReviewed),
        risksReviewed: Boolean(bed.readback?.risksReviewed),
        tasksUnderstood: Boolean(bed.readback?.tasksUnderstood),
      },
    })),
  };
}

function createPrintNode(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function appendPrintField(parent, label, value) {
  const field = createPrintNode("div", "print-field");
  field.append(
    createPrintNode("span", "print-field-label", label),
    createPrintNode("strong", "print-field-value", value || "Não informado"),
  );
  parent.append(field);
}

function appendPrintHeader(article, model, bed, index) {
  const header = createPrintNode("header", "print-header");
  const brand = createPrintNode("div", "print-brand");
  brand.append(
    createPrintNode("p", "print-eyebrow", "NEXUS CARE · CONTINUIDADE ASSISTENCIAL"),
    createPrintNode("h1", "print-title", "PASSAGEM UTI"),
    createPrintNode("p", "print-subtitle", model.mode === "shift" ? "Plantão completo · somente leitos preenchidos" : `Leito ${bed.id}`),
  );
  const edition = createPrintNode("div", "print-edition");
  edition.append(
    createPrintNode("strong", "", model.mode === "shift" ? `Leito ${index + 1} de ${model.beds.length}` : "Documento do leito"),
    createPrintNode("span", "", `Preparado em ${formatDateTime(model.generatedAt)}`),
  );
  header.append(brand, edition);

  const institution = createPrintNode("section", "print-institution", undefined);
  institution.setAttribute("aria-label", "Cabeçalho institucional");
  appendPrintField(institution, "Hospital", model.institution.hospital);
  appendPrintField(institution, "UTI", model.institution.unit);
  appendPrintField(institution, "Cidade", model.institution.city);
  appendPrintField(institution, "Data / turno", [model.institution.date, model.institution.shift].filter(Boolean).join(" · "));

  const professional = createPrintNode("section", "print-professional", undefined);
  professional.setAttribute("aria-label", "Profissional responsável");
  appendPrintField(professional, "Profissional", model.professional.doctorName);
  appendPrintField(professional, "CRM / RQE", [model.professional.crm, model.professional.rqe].filter(Boolean).join(" · "));
  appendPrintField(professional, "Especialidade / papel", [model.professional.specialty, model.professional.role, model.professional.careMode].filter(Boolean).join(" · "));
  appendPrintField(professional, "Entrada / saída", [
    model.professional.startedAt ? formatDateTime(model.professional.startedAt) : "Entrada não registrada",
    model.professional.endedAt ? formatDateTime(model.professional.endedAt) : model.professional.isActive ? "Em andamento" : "Saída não registrada",
  ].join(" · "));
  article.append(header, institution, professional);
}

function appendPrintBed(article, bed) {
  const heading = createPrintNode("section", "print-bed-heading", undefined);
  const title = createPrintNode("div", "");
  title.append(
    createPrintNode("p", "print-eyebrow", "LEITO"),
    createPrintNode("h2", "", `${bed.id} · ${bed.patientName || "Paciente não identificado"}`),
  );
  const acuity = createPrintNode("strong", "print-acuity", bed.acuity);
  heading.append(title, acuity);

  const patient = createPrintNode("section", "print-patient", undefined);
  patient.setAttribute("aria-label", "Identificação do paciente");
  appendPrintField(patient, "Idade", bed.age);
  appendPrintField(patient, "Prontuário / ID", bed.record);
  appendPrintField(patient, "Admissão", bed.admission);
  appendPrintField(patient, "Atualização local", bed.updatedAt ? formatDateTime(bed.updatedAt) : "Não registrada");

  const handoff = createPrintNode("section", "print-section print-handoff", undefined);
  handoff.append(createPrintNode("h3", "", "10 linhas executáveis"));
  const lines = createPrintNode("ol", "print-lines", undefined);
  bed.handoff.forEach((line) => {
    const item = createPrintNode("li", "print-line", undefined);
    const label = createPrintNode("strong", "", `${String(line.number).padStart(2, "0")} · ${line.label}`);
    const text = createPrintNode("p", "", line.text.trim() || "Não informado");
    item.append(label, text);
    lines.append(item);
  });
  handoff.append(lines);

  const aiSignals = createPrintNode("section", "print-section print-ai-signals", undefined);
  aiSignals.append(createPrintNode("h3", "", "Sinalizações da IA · revisão médica obrigatória"));
  const signalGrid = createPrintNode("div", "print-signal-grid", undefined);
  const appendSignalGroup = (titleText, values, emptyText) => {
    const group = createPrintNode("div", "print-signal-group", undefined);
    group.append(createPrintNode("strong", "", titleText));
    const list = createPrintNode("ul", "", undefined);
    if (values.length) values.forEach((value) => list.append(createPrintNode("li", "", value)));
    else list.append(createPrintNode("li", "is-empty", emptyText));
    group.append(list);
    signalGrid.append(group);
  };
  appendSignalGroup("Alertas sinalizados pela IA", bed.alerts, "Nenhum alerta da IA registrado.");
  appendSignalGroup("Dados críticos ausentes sinalizados pela IA", bed.missing, "Nenhuma lacuna da IA registrada.");
  aiSignals.append(signalGrid);

  const execution = createPrintNode("div", "print-execution-grid", undefined);
  const activities = createPrintNode("section", "print-section", undefined);
  activities.append(createPrintNode("h3", "", "Atividades registradas"));
  const activityList = createPrintNode("ul", "print-status-list", undefined);
  bed.activities.forEach((activity) => {
    activityList.append(createPrintNode("li", activity.done ? "is-done" : "is-open", `${activity.done ? "☑" : "☐"} ${activity.label}${activity.done ? "" : " · não registrada"}`));
  });
  activities.append(activityList);

  const pending = createPrintNode("section", "print-section", undefined);
  pending.append(createPrintNode("h3", "", "Pendências ativas"));
  const pendingList = createPrintNode("ul", "print-pending-list", undefined);
  if (bed.pending.length) {
    bed.pending.forEach((item) => {
      pendingList.append(createPrintNode("li", "", `☐ ${item.text || "Ação não informada"}${item.due ? ` · ${item.due}` : ""} · prioridade ${item.priority}`));
    });
  } else {
    pendingList.append(createPrintNode("li", "is-empty", "Nenhuma pendência ativa registrada."));
  }
  pending.append(pendingList);
  execution.append(activities, pending);

  const acceptance = createPrintNode("section", `print-acceptance${bed.acceptance.confirmed ? " is-confirmed" : ""}`, undefined);
  acceptance.append(createPrintNode("h3", "", "Aceite / read-back"));
  if (bed.acceptance.confirmed) {
    acceptance.append(
      createPrintNode("p", "", `Confirmado por ${bed.acceptance.receiverName || "Nome não informado"} · ${bed.acceptance.receiverCrm || "CRM não informado"} · ${formatDateTime(bed.acceptance.confirmedAt)}`),
      createPrintNode("p", "print-acceptance-checks", [
        `${bed.acceptance.linesReviewed ? "☑" : "☐"} 10 linhas revisadas`,
        `${bed.acceptance.risksReviewed ? "☑" : "☐"} alertas e lacunas conferidos`,
        `${bed.acceptance.tasksUnderstood ? "☑" : "☐"} pendências compreendidas`,
      ].join(" · ")),
    );
  } else {
    acceptance.append(createPrintNode("p", "", "Read-back não confirmado neste registro local."));
  }

  const footer = createPrintNode("footer", "print-footer", "Ferramenta de apoio · requer revisão médica · não substitui prontuário, prescrição, alarmes ou julgamento clínico.");
  article.append(heading, patient, handoff, aiSignals, execution, acceptance, footer);
}

function buildPrintDOM(model, target = $("#print-document")) {
  if (!target) throw new Error("Área de impressão indisponível.");
  const fragment = document.createDocumentFragment();
  model.beds.forEach((bed, index) => {
    const article = createPrintNode("article", "print-bed-sheet", undefined);
    article.dataset.bedId = bed.id;
    appendPrintHeader(article, model, bed, index);
    appendPrintBed(article, bed);
    fragment.append(article);
  });
  target.replaceChildren(fragment);
  return target;
}

let previousPrintTitle = null;

function cleanupPrintState() {
  const target = $("#print-document");
  target?.replaceChildren();
  target?.setAttribute("aria-hidden", "true");
  delete document.documentElement.dataset.printMode;
  if (previousPrintTitle !== null) {
    document.title = previousPrintTitle;
    previousPrintTitle = null;
  }
}

function openBrowserPrint(mode) {
  try {
    const model = buildPrintModel(state, mode, state.activeBedId);
    cleanupPrintState();
    buildPrintDOM(model);
    const target = $("#print-document");
    target.setAttribute("aria-hidden", "false");
    document.documentElement.dataset.printMode = mode;
    previousPrintTitle = document.title;
    const date = model.institution.date || localISODate();
    document.title = `Passagem UTI · ${mode === "bed" ? model.beds[0].id : "Plantão"} · ${date}`;
    if ($("#transfer-dialog")?.open) $("#transfer-dialog").close();
    toast("A tela de impressão do navegador será aberta. Para criar o arquivo, escolha Salvar como PDF.");
    requestAnimationFrame(() => {
      try {
        window.print();
      } catch {
        cleanupPrintState();
        toast("Não foi possível abrir a tela de impressão do navegador.", true);
      }
    });
  } catch (error) {
    cleanupPrintState();
    toast(error.message || "Não foi possível preparar a impressão.", true);
  }
}

function exportCapsule(mode) {
  if (mode === "bed" && !bedHasData(activeBed())) return toast(`${activeBed().id} não contém dados para exportar.`, true);
  try {
    const capsule = buildCapsule(state, mode, state.activeBedId);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(state.settings.date || "") ? state.settings.date : localISODate();
    const target = mode === "bed" ? activeBed().id.toLocaleLowerCase("pt-BR") : "plantao-completo";
    downloadTextFile(JSON.stringify(capsule, null, 2), `passagem-uti-${date}-${target}.capsula-uti.json`, "application/json;charset=utf-8");
    toast(`Cápsula UTI do ${mode === "bed" ? activeBed().id : "plantão completo"} exportada sem anexos.`);
  } catch (error) {
    toast(error.message || "Não foi possível validar e exportar a Cápsula UTI.", true);
  }
}

function openTransferCenter() {
  const dialog = $("#transfer-dialog");
  $("#transfer-active-bed").textContent = activeBed().id;
  if (!dialog.open) dialog.showModal();
}

function openWhatsAppShare(scope) {
  const bed = activeBed();
  if (scope === "bed" && !bedHasData(bed)) return toast(`${bed.id} não contém dados para compartilhar.`, true);
  if (scope === "shift" && !state.beds.some(bedHasData)) return toast("Nenhum leito contém dados para compartilhar.", true);
  let message;
  try {
    const actor = clinicalActor(state);
    message = scope === "bed"
      ? whatsappTextForBed(bed, state.settings, actor)
      : whatsappTextForShift(state.settings, state.beds, actor);
  } catch (error) {
    return toast(error.message || "Não foi possível preparar a mensagem clínica.", true);
  }
  if (message.length > MAX_WHATSAPP_TEXT) {
    return toast("A mensagem excede 20.000 caracteres. Exporte em TXT/Markdown ou compartilhe leito por leito.", true);
  }
  const confirmed = window.confirm("O WhatsApp é um serviço externo. Revise e desidentifique o texto conforme a política institucional. O aplicativo apenas abrirá a mensagem; nada será enviado automaticamente. Continuar?");
  if (!confirmed) return;
  void copyText(message);
  const link = document.createElement("a");
  link.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.append(link);
  link.click();
  link.remove();
  toast("WhatsApp aberto para revisão e texto copiado; nada foi enviado automaticamente.");
}

function renderCapsuleStatus(message, status = "idle") {
  const element = $("#capsule-import-status");
  element.textContent = message;
  element.dataset.status = status;
}

function minimizedPatientName(value) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 6);
  return words.length ? words.map((word) => `${Array.from(word)[0].toLocaleUpperCase("pt-BR")}.`).join(" ") : "Paciente não identificado";
}

function minimizedRecordId(value) {
  const compact = String(value || "").trim().replace(/\s+/g, "");
  return compact ? `••••${Array.from(compact).slice(-4).join("")}` : "ID não informado";
}

function resetCapsulePreview() {
  const preview = $("#capsule-preview");
  const context = $("#capsule-preview-context");
  const beds = $("#capsule-preview-beds");
  context?.replaceChildren();
  beds?.replaceChildren();
  if (preview) preview.hidden = true;
}

function renderCapsulePreview(capsule) {
  const preview = $("#capsule-preview");
  const context = $("#capsule-preview-context");
  const beds = $("#capsule-preview-beds");
  if (!preview || !context || !beds) throw new Error("A área de prévia da Cápsula UTI está indisponível.");
  const fields = [
    ["Modo", capsule.mode === "bed" ? "Leito" : "Plantão completo"],
    ["Hospital", capsule.data.settings.hospital || "Não informado"],
    ["UTI", capsule.data.settings.unit || "Não informada"],
    ["Data", capsule.data.settings.date || "Não informada"],
  ];
  context.replaceChildren(...fields.map(([label, value]) => {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    item.append(term, description);
    return item;
  }));
  beds.replaceChildren(...capsule.data.beds.map((bed) => {
    const item = document.createElement("li");
    item.textContent = `${bed.id} · ${minimizedPatientName(bed.patientName)} · ${minimizedRecordId(bed.record)}`;
    return item;
  }));
  preview.hidden = false;
}

async function inspectCapsuleFile(file) {
  const inspectionToken = ++capsuleInspectionToken;
  selectedCapsule = null;
  $("#import-capsule").disabled = true;
  resetCapsulePreview();
  if (!file) return renderCapsuleStatus("Nenhum arquivo selecionado.");
  if (!file.name.toLocaleLowerCase("pt-BR").endsWith(".capsula-uti.json")) {
    return renderCapsuleStatus("Selecione um arquivo com extensão .capsula-uti.json.", "error");
  }
  if (file.size > CAPSULE_MAX_BYTES) return renderCapsuleStatus("Arquivo acima do limite de 4 MiB.", "error");
  try {
    const capsule = parseCapsuleText(await file.text());
    if (inspectionToken !== capsuleInspectionToken) return;
    renderCapsulePreview(capsule);
    selectedCapsule = { file, capsule };
    $("#import-capsule").disabled = false;
    renderCapsuleStatus(`${capsule.mode === "bed" ? `Leito ${capsule.data.beds[0].id}` : "Plantão completo"} validado estruturalmente · schema v${capsule.schemaVersion} · ${formatDateTime(capsule.exportedAt)}. Arquivo não assinado/não verificado; uma nova assunção será obrigatória.`, "success");
  } catch (error) {
    if (inspectionToken !== capsuleInspectionToken) return;
    resetCapsulePreview();
    renderCapsuleStatus(error.message || "Não foi possível validar a Cápsula UTI.", "error");
  }
}

async function importSelectedCapsule() {
  if (!selectedCapsule) return toast("Selecione e valide uma Cápsula UTI.", true);
  const strategy = $("input[name='capsule-strategy']:checked")?.value;
  if (!["merge", "replace"].includes(strategy)) return toast("Escolha como importar a Cápsula UTI.", true);
  const localImportActor = state.continuity?.activeShift
    ? normalizeProfile(state.continuity.activeShift)
    : normalizeProfile(state.settings);
  let next;
  try {
    next = applyCapsuleToWorkspace(state, selectedCapsule.capsule, strategy);
  } catch (error) {
    renderCapsuleStatus(error.message || "A Cápsula não é compatível com o plantão atual.", "error");
    return toast(error.message || "A Cápsula não é compatível com o plantão atual.", true);
  }
  const description = strategy === "replace"
    ? "SUBSTITUIR apagará os dados e anexos locais do plantão atual antes de aplicar a Cápsula."
    : `MESCLAR substituirá apenas os leitos presentes na Cápsula, apagará os anexos desses leitos para evitar mistura de pacientes e preservará os demais leitos.${selectedCapsule.capsule.mode === "bed" ? " O cabeçalho atual será preservado após conferir hospital, UTI e data." : ""}`;
  if (!window.confirm(`${description}\n\nO arquivo é não assinado/não verificado e não transfere responsabilidade profissional. A importação encerrará a vigência local e exigirá nova assunção explícita. Ela não executa conteúdo do arquivo. Deseja continuar?`)) return;
  const importedAt = new Date().toISOString();
  const notification = normalizeNotification({
    id: crypto.randomUUID(),
    type: "capsule-import",
    severity: "success",
    title: "Cápsula UTI importada",
    body: `${selectedCapsule.capsule.mode === "bed" ? `O ${selectedCapsule.capsule.data.beds[0].id}` : "O plantão completo"} foi ${strategy === "replace" ? "substituído" : "mesclado"}. Anexos foram removidos, read-backs invalidados e nenhuma vigência profissional foi importada.`,
    createdAt: importedAt,
    readAt: null,
    source: "arquivo local validado",
  });
  next.notifications = [...(strategy === "merge" ? next.notifications : []), notification].filter(Boolean).slice(-MAX_NOTIFICATIONS);
  appendLocalCapsuleImportAudit(next, selectedCapsule.capsule, strategy, localImportActor, importedAt);
  next.savedAt = importedAt;

  try {
    const transaction = db.transaction(["kv", "files"], "readwrite");
    transaction.objectStore("kv").put(structuredClone(next), STATE_KEY);
    if (strategy === "replace") transaction.objectStore("files").clear();
    else clearImportedBedFiles(transaction, attachmentBedIdsToClear(selectedCapsule.capsule, strategy));
    await transactionDone(transaction);
    state = next;
    selectedCapsule = null;
    $("#capsule-file-input").value = "";
    $("#import-capsule").disabled = true;
    resetCapsulePreview();
    applyTheme();
    renderSettings();
    renderContinuityProfile();
    renderWorkspace();
    renderNotificationIndicator();
    updateSavedLabel();
    $("#transfer-dialog").close();
    toast(`Cápsula UTI ${strategy === "replace" ? "aplicada por substituição" : "mesclada"}; assuma novamente o plantão antes de registrar autoria.`);
  } catch {
    toast("A Cápsula foi validada, mas não pôde ser gravada no armazenamento local.", true);
  }
}

function addTimelineEvent() {
  let actor;
  try {
    actor = requireActiveShift(state, "registrar uma atualização com autoria");
  } catch (error) {
    renderTimeline();
    renderContinuityProfile();
    toast(error.message, true);
    $("#assume-shift")?.focus();
    return false;
  }
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
    author: clinicalActorLabel(actor),
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
  return true;
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
    activities: bed.activities,
  });
}

async function confirmReadback() {
  const bed = activeBed();
  const readback = bed.readback;
  try {
    assertClinicalIdentifiers([bed], "confirmar o read-back");
  } catch (error) {
    return toast(error.message, true);
  }
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
  addNotification({
    type: "readback-confirmed",
    severity: "success",
    title: `${bed.id}: recebimento confirmado`,
    body: "O aceite local foi registrado após revisão das 10 linhas, riscos e pendências.",
    bedId: bed.id,
    tab: "checklist",
    dedupeKey: `readback-confirmed:${bed.id}:${readback.confirmedAt}`,
    source: "read-back médico",
  }, { save: false });
  await saveState();
  renderReadback();
  renderBatteryRail();
  renderShiftRadar();
  toast(`${bed.id} recebido e confirmado por ${readback.receiverName}.`);
}

function radarPriorityKey(bed) {
  const acuity = { "CRÍTICO": 4, "ATENÇÃO": 3, "NÃO DEFINIDO": 2, "ESTÁVEL": 1 }[bed.acuity] || 0;
  const highPending = bed.checklist.filter((item) => !item.done && !item.suggested && item.priority === "alta").length;
  return acuity * 10_000 + bed.alerts.length * 1_000 + bed.missing.length * 100 + highPending * 10 + pendingCount(bed);
}

function renderShiftRadar() {
  const dialog = $("#radar-dialog");
  if (!dialog?.open) return;
  const beds = state.beds.filter(bedHasData).sort((a, b) => radarPriorityKey(b) - radarPriorityKey(a));
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
    { id: "radar", iconName: "radar", label: "Abrir radar do plantão", detail: "Prioridades dos 10 leitos", keywords: "radar prioridade risco", run: openRadar },
    { id: "notifications", iconName: "bell", label: "Abrir central de notificações", detail: `${unreadNotificationCount()} não lida${unreadNotificationCount() === 1 ? "" : "s"}`, keywords: "central notificacoes alertas memoria", run: openNotifications },
    { id: "render", iconName: "sparkles", label: `Renderizar ${bed.id}`, detail: "Gerar as 10 linhas", keywords: "gpt ia gerar", run: () => void generateHandoff() },
    { id: "copy", iconName: "copy", label: `Copiar ${bed.id}`, detail: "Passagem pronta para colar", keywords: "copiar clipboard", run: () => void copyActiveBed() },
    { id: "transfer", iconName: "export", label: "Abrir central de exportação", detail: "TXT, Markdown, WhatsApp e Cápsula UTI", keywords: "exportar compartilhar whatsapp capsula importar backup", run: openTransferCenter },
    { id: "whatsapp", iconName: "export", label: `Preparar ${bed.id} para WhatsApp`, detail: "Abre para revisão; não envia", keywords: "whatsapp mensagem compartilhar", run: () => openWhatsAppShare("bed") },
    { id: "files", iconName: "file", label: `Abrir arquivos do ${bed.id}`, detail: "Exames e documentos", keywords: "pdf foto exames anexo", run: () => { applyTab("vault"); $("#workspace").scrollIntoView({ behavior: "smooth" }); } },
    { id: "checklist", iconName: "checklist", label: `Abrir checklist do ${bed.id}`, detail: "Pendências e read-back", keywords: "tarefas pendencias aceite", run: () => { applyTab("checklist"); $("#workspace").scrollIntoView({ behavior: "smooth" }); } },
    { id: "event", iconName: "timeline", label: `Registrar intercorrência no ${bed.id}`, detail: "Abrir linha do tempo", keywords: "evento exame conduta contato", run: () => { applyTab("render"); $("#timeline-type").value = "INTERCORRÊNCIA"; $("#timeline-text").focus(); } },
    { id: "high-task", iconName: "alert", label: `Criar pendência alta no ${bed.id}`, detail: "Ação prioritária editável", keywords: "tarefa urgente alta", run: () => { addChecklistItem({ priority: "alta" }); applyTab("checklist"); setTimeout(() => $(".check-item:last-child .check-text")?.focus(), 0); } },
    { id: "critical", iconName: "alert", label: `Marcar ${bed.id} como crítico`, detail: "Classificação médica manual", keywords: "critico estado gravidade", run: () => { updateBedField("acuity", "CRÍTICO"); $("#bed-acuity").value = "CRÍTICO"; renderBatteryRail(); } },
    { id: "turbo", iconName: "turbo", label: "Turbo: renderizar leitos ocupados", detail: "Até 3 análises simultâneas", keywords: "lote todos velocidade", run: () => void renderAllBeds() },
    { id: "theme-system", iconName: "sun", label: "Aparência: seguir o sistema", detail: "Alterna automaticamente", keywords: "tema modo sistema claro escuro", run: () => setTheme("system") },
    { id: "theme-light", iconName: "sun", label: "Aparência: modo claro", detail: "Superfícies claras", keywords: "tema modo claro", run: () => setTheme("light") },
    { id: "theme-dark", iconName: "moon", label: "Aparência: modo escuro", detail: "Cockpit noturno", keywords: "tema modo escuro noite", run: () => setTheme("dark") },
    { id: "tutorial", iconName: "book", label: "Abrir tutorial ilustrado", detail: "Uso, segurança e instalação", keywords: "ajuda manual instalar", run: () => { window.location.href = "./tutorial.html"; } },
  ];
  state.beds.forEach((candidate) => commands.push({
    id: `bed-${candidate.id}`,
    iconText: candidate.id,
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
    if (command.iconName) icon.append(iconElement(command.iconName));
    else icon.textContent = command.iconText || "•";
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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function updateSavedLabel() {
  $("#last-saved").textContent = state.savedAt ? `Salvo localmente em ${formatDateTime(state.savedAt)}` : "Ainda não salvo";
}

function toast(message, isError = false) {
  const element = document.createElement("div");
  element.className = `toast${isError ? " is-error" : ""}`;
  element.setAttribute("role", isError ? "alert" : "status");
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
    if (!health.aiConfigured) {
      addNotification({
        type: "api-status",
        severity: "error",
        title: "Chave da API não encontrada",
        body: "Confira o arquivo .env na pasta API KEY indicada no tutorial; a chave não é exibida pelo aplicativo.",
        dedupeKey: "api-key-not-found",
        source: "verificação local",
      });
    }
  } catch {
    indicator.className = "connection-pill is-error";
    $("span:last-child", indicator).textContent = "Servidor local indisponível";
    addNotification({
      type: "server-status",
      severity: "error",
      title: "Servidor local indisponível",
      body: "Reinicie o aplicativo e verifique o endereço local antes de tentar renderizar.",
      dedupeKey: "local-server-unavailable",
      source: "verificação local",
    });
  }
}

async function assumeCurrentProfile() {
  const profile = normalizeProfile(state.settings);
  if (!profile.doctorName || !profile.crm) {
    toast("Informe nome completo e CRM no cabeçalho antes de assumir.", true);
    $(profile.doctorName ? '[data-setting="crm"]' : '[data-setting="doctorName"]')?.focus();
    return;
  }
  const previous = state.continuity?.activeShift;
  if (previous) {
    const confirmed = window.confirm(`Transferir a responsabilidade local de ${previous.doctorName} · ${previous.crm} para ${profile.doctorName} · ${profile.crm}? A saída anterior e a nova entrada ficarão no histórico deste dispositivo.`);
    if (!confirmed) return;
  }
  try {
    assumeShift(state, profile);
    addNotification({
      type: "shift-assumed",
      severity: "success",
      title: previous ? "Responsabilidade do plantão transferida" : "Plantão assumido",
      body: `${profile.doctorName} · ${profile.crm} é o profissional vigente neste dispositivo.`,
      dedupeKey: `shift-assumed:${state.continuity.activeShift.id}`,
      source: "continuidade local",
    }, { save: false });
    await saveState();
    renderContinuityProfile();
    if ($("#opportunity-dialog")?.open) renderOpportunityPanel();
    toast(previous ? "Responsabilidade transferida e auditada localmente." : "Plantão assumido e auditado localmente.");
  } catch (error) {
    toast(error.message || "Não foi possível assumir o plantão.", true);
  }
}

async function endCurrentShift() {
  const active = state.continuity?.activeShift;
  if (!active) return toast("Não há plantonista vigente para encerrar.", true);
  if (!window.confirm(`Encerrar o plantão de ${active.doctorName} · ${active.crm} neste dispositivo? As pendências continuarão registradas para a próxima assunção.`)) return;
  try {
    const closed = endShift(state);
    addNotification({
      type: "shift-ended",
      severity: "info",
      title: "Plantão encerrado localmente",
      body: `${closed.doctorName} encerrou a responsabilidade; as informações dos leitos foram preservadas.`,
      dedupeKey: `shift-ended:${closed.id}:${closed.endedAt}`,
      source: "continuidade local",
    }, { save: false });
    await saveState();
    renderContinuityProfile();
    if ($("#opportunity-dialog")?.open) renderOpportunityPanel();
    toast("Plantão encerrado; leitos e pendências foram preservados.");
  } catch (error) {
    toast(error.message || "Não foi possível encerrar o plantão.", true);
  }
}

function updateBedActivity(field, checked) {
  if (!["evolutionDone", "prescriptionReviewed", "examsReviewed"].includes(field)) return;
  let actor;
  try {
    actor = requireActiveShift(state, "alterar uma atividade manual do leito");
  } catch (error) {
    renderBedActivities();
    renderContinuityProfile();
    toast(error.message, true);
    $("#assume-shift")?.focus();
    return false;
  }
  const bed = activeBed();
  if (!bed.activities) bed.activities = newActivities();
  bed.activities[field] = Boolean(checked);
  bed.activities.updatedAt = new Date().toISOString();
  bed.activities.updatedBy = actor.doctorName ? `${actor.doctorName}${actor.crm ? ` · ${actor.crm}` : ""}` : "Profissional não identificado";
  bed.updatedAt = bed.activities.updatedAt;
  const labels = {
    evolutionDone: "Evolução concluída",
    prescriptionReviewed: "Prescrição revisada",
    examsReviewed: "Exames revisados",
  };
  appendContinuityAudit(state.continuity, {
    action: "BED_ACTIVITY_CHANGED",
    at: bed.activities.updatedAt,
    actor,
    bedId: bed.id,
    detail: `${labels[field]}: ${checked ? "registrado" : "desmarcado"}.`,
  });
  invalidateReadback(bed, "uma atividade manual do leito foi alterada");
  renderBedActivities();
  renderBatteryRail();
  scheduleSave();
  return true;
}

function coordinationAuthor(session) {
  return clinicalActorLabel(session, "Coordenação");
}

function addCoordinationRecord() {
  const coordinator = state.continuity?.activeShift;
  if (!coordinator || coordinator.role !== "COORDENADOR") return toast("Assuma o plantão como coordenador para registrar esta intervenção.", true);
  const bedId = $("#coordination-bed").value;
  const bed = state.beds.find((candidate) => candidate.id === bedId);
  if (!bed) return toast("Selecione um leito válido.", true);
  const kind = $("#coordination-kind").value;
  const text = $("#coordination-text").value.trim().slice(0, MAX_COORDINATION_TEXT);
  if (!text) return toast("Escreva uma nota ou tarefa objetiva.", true);
  const actor = clinicalActor(state);
  const createdAt = new Date().toISOString();
  if (kind === "TASK") {
    const priority = VALID_PRIORITIES.has($("#coordination-priority").value) ? $("#coordination-priority").value : "media";
    bed.checklist.push({
      id: randomId("coord-task"),
      text,
      priority,
      due: $("#coordination-due").value.trim().slice(0, 80),
      done: false,
      suggested: false,
      source: "coordination",
      createdAt,
      authorName: actor.doctorName,
      authorCrm: actor.crm,
    });
    appendContinuityAudit(state.continuity, {
      action: "COORDINATION_TASK",
      at: createdAt,
      actor,
      bedId,
      detail: text,
    });
  } else {
    bed.timeline.push({
      id: randomId("coord-note"),
      type: "COORDENAÇÃO",
      text,
      at: createdAt,
      author: coordinationAuthor(actor),
    });
    bed.timeline = bed.timeline.slice(-500);
    appendContinuityAudit(state.continuity, {
      action: "COORDINATION_NOTE",
      at: createdAt,
      actor,
      bedId,
      detail: text,
    });
  }
  bed.updatedAt = createdAt;
  invalidateReadback(bed, `uma ${kind === "TASK" ? "tarefa" : "nota"} de coordenação foi adicionada`);
  addNotification({
    type: "coordination-record",
    severity: kind === "TASK" ? "attention" : "info",
    title: `${bedId}: ${kind === "TASK" ? "tarefa" : "nota"} da coordenação`,
    body: "Registro humano auditado localmente; nenhuma prescrição foi gerada ou executada.",
    bedId,
    tab: kind === "TASK" ? "checklist" : "render",
    dedupeKey: `coordination:${bedId}:${createdAt}`,
    source: "coordenação local",
  });
  $("#coordination-text").value = "";
  $("#coordination-due").value = "";
  if (bed.id === state.activeBedId) {
    renderTimeline();
    renderChecklist();
    renderBedActivities();
  }
  renderBatteryRail();
  renderOpportunityPanel();
  scheduleSave();
  toast(`${kind === "TASK" ? "Tarefa" : "Nota"} de coordenação registrada no ${bedId} com autoria e data.`);
}

function bindEvents() {
  $("#identity-form").addEventListener("input", (event) => {
    const field = event.target.dataset.setting;
    if (!field) return;
    state.settings[field] = event.target.value;
    scheduleSave();
  });

  $("#theme-select").addEventListener("change", (event) => setTheme(event.target.value));
  $("#assume-shift").addEventListener("click", () => void assumeCurrentProfile());
  $("#end-shift").addEventListener("click", () => void endCurrentShift());
  $("#open-opportunities").addEventListener("click", openOpportunityPanel);
  $$('[data-activity-field]').forEach((input) => input.addEventListener("change", (event) => {
    updateBedActivity(event.target.dataset.activityField, event.target.checked);
  }));
  $("#opportunity-list").addEventListener("click", (event) => {
    const bedId = event.target.closest("[data-opportunity-bed]")?.dataset.opportunityBed;
    if (!bedId) return;
    $("#opportunity-dialog").close();
    navigateToBed(bedId);
  });
  $("#coordination-kind").addEventListener("change", (event) => {
    $("#coordination-task-options").hidden = event.target.value !== "TASK";
  });
  $("#coordination-form").addEventListener("submit", (event) => {
    event.preventDefault();
    addCoordinationRecord();
  });
  const handleSystemThemeChange = () => {
    if (state.settings.theme === "system") applyTheme("system");
  };
  if (systemThemeQuery.addEventListener) systemThemeQuery.addEventListener("change", handleSystemThemeChange);
  else systemThemeQuery.addListener(handleSystemThemeChange);

  $("#notification-button").addEventListener("click", openNotifications);
  $("#mark-all-notifications").addEventListener("click", markAllNotificationsRead);
  $("#clear-read-notifications").addEventListener("click", clearReadNotifications);
  $("#notification-list").addEventListener("click", (event) => {
    const card = event.target.closest("[data-notification-id]");
    if (card) openNotification(card.dataset.notificationId);
  });
  $(".notification-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-notification-filter]");
    if (!button) return;
    notificationFilter = button.dataset.notificationFilter;
    renderNotificationCenter();
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
  $(".tabs").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = $$(".tab");
    const current = tabs.indexOf(event.target.closest(".tab"));
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    applyTab(tabs[next].dataset.tab);
    tabs[next].focus();
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
    const acceptId = event.target.closest("[data-accept-check]")?.dataset.acceptCheck;
    if (acceptId) {
      const item = acceptChecklistSuggestion(activeBed(), acceptId);
      if (!item) return;
      activeBed().updatedAt = new Date().toISOString();
      invalidateReadback(activeBed());
      if (item.priority === "alta") notifyHighPriority(activeBed(), item);
      renderChecklist();
      renderBatteryRail();
      scheduleSave();
      toast("Sugestão aceita como pendência ativa.");
      return;
    }
    const id = event.target.closest("[data-remove-check]")?.dataset.removeCheck;
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
    const deleteId = event.target.closest("[data-delete-file]")?.dataset.deleteFile;
    const downloadId = event.target.closest("[data-download-file]")?.dataset.downloadFile;
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
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    }
  });

  $("#timeline-form").addEventListener("submit", (event) => {
    event.preventDefault();
    addTimelineEvent();
  });
  $("#timeline-list").addEventListener("click", (event) => {
    const id = event.target.closest("[data-remove-event]")?.dataset.removeEvent;
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
  $("#export-data").addEventListener("click", openTransferCenter);
  $("#transfer-dialog").addEventListener("click", (event) => {
    const exportButton = event.target.closest("[data-export-scope][data-export-format]");
    if (exportButton) {
      exportClinicalText(exportButton.dataset.exportScope, exportButton.dataset.exportFormat);
      return;
    }
    const printButton = event.target.closest("[data-print-scope]");
    if (printButton) {
      openBrowserPrint(printButton.dataset.printScope);
      return;
    }
    const whatsappButton = event.target.closest("[data-whatsapp-scope]");
    if (whatsappButton) {
      openWhatsAppShare(whatsappButton.dataset.whatsappScope);
      return;
    }
    const capsuleButton = event.target.closest("[data-export-capsule]");
    if (capsuleButton) exportCapsule(capsuleButton.dataset.exportCapsule);
  });
  $("#capsule-file-input").addEventListener("change", (event) => void inspectCapsuleFile(event.target.files?.[0]));
  $("#import-capsule").addEventListener("click", () => void importSelectedCapsule());
  $("#print-bed").addEventListener("click", () => openBrowserPrint("bed"));
  window.addEventListener("afterprint", cleanupPrintState);
  $("#clear-bed").addEventListener("click", clearActiveBed);
  window.addEventListener("pagehide", () => void saveState());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void saveState();
  });
}

function updateBedField(field, value) {
  const bed = activeBed();
  const previous = bed[field];
  bed[field] = value;
  bed.updatedAt = new Date().toISOString();
  const reasons = {
    patientName: "a identificação foi alterada",
    age: "a idade foi alterada",
    record: "o identificador foi alterado",
    admission: "a data de admissão foi alterada",
    acuity: "o estado clínico registrado foi alterado",
    clinicalText: "o material clínico foi alterado",
  };
  invalidateReadback(bed, reasons[field] || "o conteúdo do leito foi alterado");
  if (field === "acuity" && value === "CRÍTICO" && previous !== value) {
    addNotification({
      type: "medical-acuity",
      severity: "attention",
      title: `${bed.id}: estado registrado como crítico`,
      body: "A classificação foi definida manualmente no aplicativo e aparece no Radar do plantão.",
      bedId: bed.id,
      tab: "render",
      dedupeKey: `medical-acuity-critical:${bed.id}:${bed.updatedAt}`,
      source: "classificação médica",
    });
  }
  if (field === "patientName") {
    $("#active-bed-title").textContent = value || "Paciente não identificado";
    renderBatteryRail();
  }
  if (["patientName", "age", "record", "admission"].includes(field)) renderReadback();
  scheduleSave();
}

function updateReadbackField(field, value) {
  const bed = activeBed();
  if (!bed.readback) bed.readback = newReadback();
  bed.readback[field] = value;
  invalidateReadback(bed, "os dados do read-back foram alterados");
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
  if ((field === "priority" && item.priority !== "alta") || (field === "done" && item.done)) {
    item.highNotifiedAt = null;
  }
  activeBed().updatedAt = new Date().toISOString();
  invalidateReadback(activeBed());
  if (!item.suggested && !item.done && item.priority === "alta" && item.text.trim()) {
    notifyHighPriority(activeBed(), item);
  }
  if (field === "done" || field === "priority") renderChecklist();
  renderBatteryRail();
  scheduleSave();
}

function notifyHighPriority(bed, item) {
  if (item.highNotifiedAt) return;
  item.highNotifiedAt = new Date().toISOString();
  addNotification({
    type: "high-priority-task",
    severity: "attention",
    title: `${bed.id}: pendência alta ativa`,
    body: "Uma ação marcada como prioridade alta requer acompanhamento até a conclusão.",
    bedId: bed.id,
    tab: "checklist",
    dedupeKey: `high-priority-task:${bed.id}:${item.id}`,
    source: "checklist médico",
  });
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
    applyTheme();
    bindEvents();
    renderSettings();
    renderContinuityProfile();
    renderWorkspace();
    renderNotificationIndicator();
    updateSavedLabel();
    await checkApi();
    clearInterval(continuityClockTimer);
    continuityClockTimer = setInterval(renderContinuityProfile, 60_000);
  } catch (error) {
    console.error(error);
    toast("Não foi possível iniciar o armazenamento local.", true);
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") void init();

export {
  CAPSULE_MAX_BYTES,
  CAPSULE_SCHEMA_ID,
  CAPSULE_SCHEMA_VERSION,
  acceptChecklistSuggestion,
  appendLocalCapsuleImportAudit,
  assertClinicalIdentifiers,
  attachmentBedIdsToClear,
  activityCompletionCount,
  applyCapsuleToWorkspace,
  assumeShift,
  bedCharge,
  buildCapsule,
  buildPrintModel,
  capsuleContextMismatches,
  clinicalActor,
  elapsedLabel,
  endShift,
  handoffMarkdown,
  handoffText,
  hasPracticalPatientIdentifiers,
  isReadbackConfirmed,
  minimizedPatientName,
  minimizedRecordId,
  newActivities,
  newContinuity,
  newState,
  normalizeContinuity,
  opportunitiesForBed,
  opportunityDistribution,
  parseCapsuleText,
  printableBeds,
  shiftMarkdown,
  shiftText,
  unresolvedSignalsForBed,
  validateAttachmentFile,
  validateAttachmentMetadata,
  validateCapsule,
  whatsappTextForBed,
  whatsappTextForShift,
};
