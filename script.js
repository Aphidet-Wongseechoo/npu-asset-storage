let data = [];
let isAdmin = false;
let editingUid = null;
let activeStatusFilter = "ทั้งหมด";

const ADMIN_USER = "Aphidet";
const ADMIN_PASS = "281251";
const STORAGE_KEY = "npuAssets";
const API_URL = "/api/assets";

const STATUS_OPTIONS = [
  { value: "ปกติ", label: "ปกติ", icon: "✅", theme: "ok" },
  { value: "แทงจำหน่าย", label: "แทงจำหน่าย", icon: "📌", theme: "sold" },
  { value: "ชำรุด(รอจำหน่าย)", label: "ชำรุด(รอจำหน่าย)", icon: "🧾", theme: "pending-sale" },
  { value: "ยังไม่มีเลข", label: "ยังไม่มีเลข", icon: "🔎", theme: "no-code" },
  { value: "ชำรุด(รอซ่อม)", label: "ชำรุด(รอซ่อม)", icon: "🛠️", theme: "repair" },
  { value: "โอนย้าย", label: "โอนย้าย", icon: "↗️", theme: "transfer" }
];

const BUILDING_OPTIONS = ["ตึกบริหาร", "ตึกช่างยนต์", "ตึกอุตสาหกรรม"];
const ROOM_OPTIONS = ["201", "202", "203", "204", "205", "206", "207", "208", "301", "302", "303", "304", "305", "306", "307", "308"];
const REPORT_STATUS_OPTIONS = [
  "มีเลข และชื่อครุภัณฑ์",
  "มีเลข แต่ไม่ทราบชื่อครุภัณฑ์",
  "ไม่มีเลข และไม่ทราบชื่อครุภัณฑ์",
  "ไม่มีเลข แต่ทราบชื่อครุภัณฑ์"
];
const FISCAL_YEAR_OPTIONS = ["ไม่ทราบปีงบประมาณ", "2570", "2569", "2568", "2567", "2566", "2565", "2564", "2563", "2562", "2561", "2560"];
const DIVISION_OPTIONS = ["ฝ่ายบริการนักศึกษา", "ฝ่ายบริหาร", "ฝ่ายวิชาการ"];

const LEGACY_STATUS_MAP = {
  "พร้อมใช้งาน": "ปกติ",
  "กำลังซ่อม": "ชำรุด(รอซ่อม)",
  "จำหน่ายแล้ว": "แทงจำหน่าย",
  "โฮนย้าย": "โอนย้าย"
};

const overlay = document.getElementById("overlay");
const user = document.getElementById("user");
const pass = document.getElementById("pass");
const adminForm = document.getElementById("adminForm");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const openAssetFormBtn = document.getElementById("openAssetFormBtn");
const submitLoginBtn = document.getElementById("submitLoginBtn");
const closeLoginBtn = document.getElementById("closeLoginBtn");
const assetId = document.getElementById("assetId");
const assetName = document.getElementById("assetName");
const assetDept = document.getElementById("assetDept");
const assetStatus = document.getElementById("assetStatus");
const assetBuilding = document.getElementById("assetBuilding");
const assetRoom = document.getElementById("assetRoom");
const assetReportStatus = document.getElementById("assetReportStatus");
const assetFiscalYear = document.getElementById("assetFiscalYear");
const search = document.getElementById("search");
const table = document.getElementById("table");
const statusGrid = document.getElementById("statusGrid");
const formTitle = document.getElementById("formTitle");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const storageStatus = document.getElementById("storageStatus");
const activeFilterText = document.getElementById("activeFilterText");

function createUid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeStatus(status) {
  const mappedStatus = LEGACY_STATUS_MAP[status] || status;
  return STATUS_OPTIONS.some((option) => option.value === mappedStatus) ? mappedStatus : "ปกติ";
}

function normalizeOption(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}

function deriveReportStatus(item) {
  const hasId = Boolean(String(item.id || "").trim());
  const hasName = Boolean(String(item.name || "").trim());

  if (hasId && hasName) return "มีเลข และชื่อครุภัณฑ์";
  if (hasId) return "มีเลข แต่ไม่ทราบชื่อครุภัณฑ์";
  if (hasName) return "ไม่มีเลข แต่ทราบชื่อครุภัณฑ์";
  return "ไม่มีเลข และไม่ทราบชื่อครุภัณฑ์";
}

function normalizeAsset(item) {
  const normalized = {
    uid: String(item.uid || item.id || createUid()).trim(),
    id: String(item.id || "").trim(),
    name: String(item.name || "").trim(),
    status: normalizeStatus(item.status),
    building: normalizeOption(item.building, BUILDING_OPTIONS, "ตึกบริหาร"),
    room: normalizeOption(item.room, ROOM_OPTIONS, "201"),
    reportStatus: normalizeOption(item.reportStatus, REPORT_STATUS_OPTIONS, deriveReportStatus(item)),
    fiscalYear: normalizeOption(item.fiscalYear, FISCAL_YEAR_OPTIONS, "ไม่ทราบปีงบประมาณ"),
    dept: normalizeOption(item.dept || item.division, DIVISION_OPTIONS, "ฝ่ายบริหาร"),
    date: String(item.date || "").trim()
  };

  if (!normalized.uid) normalized.uid = createUid();
  return normalized;
}

function readLocalData() {
  const storedData = localStorage.getItem(STORAGE_KEY);

  try {
    const parsed = storedData ? JSON.parse(storedData) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeAsset) : [];
  } catch {
    return [];
  }
}

function setStorageStatus(message, type = "") {
  if (!storageStatus) return;
  storageStatus.textContent = message;
  storageStatus.className = `storage-status ${type}`.trim();
}

async function fetchServerData() {
  const response = await fetch(API_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
  }

  const assets = await response.json();

  if (!Array.isArray(assets)) {
    throw new Error("รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง");
  }

  const normalizedAssets = assets.map(normalizeAsset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedAssets));
  return normalizedAssets;
}

async function saveData() {
  try {
    setStorageStatus("กำลังบันทึก...", "saving");

    const response = await fetch(API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error("ไม่สามารถบันทึกข้อมูลลงเซิร์ฟเวอร์ได้");
    }

    data = (await response.json()).map(normalizeAsset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setStorageStatus("บันทึกบนเซิร์ฟเวอร์แล้ว", "ok");
    return true;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setStorageStatus("บันทึกสำรองในเครื่อง", "warning");
    return false;
  }
}

async function loadData() {
  setStorageStatus("กำลังโหลดข้อมูล...", "saving");

  try {
    const localData = readLocalData();
    const serverData = await fetchServerData();

    if (serverData.length === 0 && localData.length > 0) {
      data = localData;
      await saveData();
    } else {
      data = serverData;
      setStorageStatus("บันทึกบนเซิร์ฟเวอร์แล้ว", "ok");
    }
  } catch {
    data = readLocalData();
    setStorageStatus("ใช้ข้อมูลสำรองในเครื่อง", "warning");
  }

  render();
}

function openLogin() {
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  user.focus();
}

function closeLogin() {
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
}

function showAssetForm() {
  adminForm.style.display = "block";
  openAssetFormBtn.style.display = "none";
  adminForm.scrollIntoView({ behavior: "smooth", block: "start" });
  assetId.focus();
}

function hideAssetForm() {
  adminForm.style.display = "none";
  openAssetFormBtn.style.display = "inline-flex";
}

function openNewAssetForm() {
  editingUid = null;
  resetFormValues();
  assetId.disabled = false;
  formTitle.innerText = "เพิ่มข้อมูลครุภัณฑ์";
  saveBtn.innerText = "💾 บันทึกข้อมูล";
  cancelEditBtn.innerText = "❌ ปิดฟอร์ม";
  cancelEditBtn.style.display = "inline-block";
  showAssetForm();
}

function login() {
  if (user.value.trim() === ADMIN_USER && pass.value.trim() === ADMIN_PASS) {
    isAdmin = true;
    adminForm.style.display = "none";
    openAssetFormBtn.style.display = "inline-flex";
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-flex";
    closeLogin();
    render();
    alert("เข้าสู่ระบบสำเร็จ");
  } else {
    alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }
}

function resetFormValues() {
  assetId.value = "";
  assetName.value = "";
  assetStatus.value = "ปกติ";
  assetBuilding.value = "ตึกบริหาร";
  assetRoom.value = "201";
  assetReportStatus.value = "มีเลข และชื่อครุภัณฑ์";
  assetFiscalYear.value = "ไม่ทราบปีงบประมาณ";
  assetDept.value = "ฝ่ายบริหาร";
}

function logout() {
  isAdmin = false;
  adminForm.style.display = "none";
  openAssetFormBtn.style.display = "none";
  loginBtn.style.display = "inline-flex";
  logoutBtn.style.display = "none";
  user.value = "";
  pass.value = "";
  cancelEdit();
  render();
}

function cancelEdit() {
  editingUid = null;
  resetFormValues();
  assetId.disabled = false;

  formTitle.innerText = "เพิ่มข้อมูลครุภัณฑ์";
  saveBtn.innerText = "💾 บันทึกข้อมูล";
  cancelEditBtn.innerText = "❌ ปิดฟอร์ม";
  cancelEditBtn.style.display = "none";
  hideAssetForm();
}

function reportNeedsId(reportStatus) {
  return reportStatus.startsWith("มีเลข");
}

function reportNeedsName(reportStatus) {
  return reportStatus === "มีเลข และชื่อครุภัณฑ์" || reportStatus === "ไม่มีเลข แต่ทราบชื่อครุภัณฑ์";
}

function validateAssetInput(id, name, reportStatus) {
  if (reportNeedsId(reportStatus) && !id) {
    alert("สถานะรายงานนี้ต้องกรอกเลขครุภัณฑ์");
    return false;
  }

  if (reportNeedsName(reportStatus) && !name) {
    alert("สถานะรายงานนี้ต้องกรอกชื่อครุภัณฑ์");
    return false;
  }

  return true;
}

function buildAssetPayload(existingItem = {}) {
  const reportStatus = assetReportStatus.value;
  const id = assetId.value.trim();
  const name = assetName.value.trim();

  return {
    ...existingItem,
    uid: existingItem.uid || createUid(),
    id,
    name,
    status: assetStatus.value,
    building: assetBuilding.value,
    room: assetRoom.value,
    reportStatus,
    fiscalYear: assetFiscalYear.value,
    dept: assetDept.value,
    date: existingItem.date || new Date().toLocaleDateString("th-TH")
  };
}

async function addItem() {
  const id = assetId.value.trim();
  const name = assetName.value.trim();
  const reportStatus = assetReportStatus.value;

  if (!validateAssetInput(id, name, reportStatus)) return;

  if (id) {
    const duplicate = data.some((item) => item.id === id && item.uid !== editingUid);

    if (duplicate) {
      alert("เลขครุภัณฑ์นี้มีอยู่ในระบบแล้ว กรุณาใช้เลขอื่น");
      return;
    }
  }

  if (editingUid) {
    const index = data.findIndex((item) => item.uid === editingUid);

    if (index !== -1) {
      data[index] = normalizeAsset(buildAssetPayload(data[index]));
    }
  } else {
    data.push(normalizeAsset(buildAssetPayload()));
  }

  cancelEdit();
  await saveData();
  render();
}

function searchItem() {
  render();
}

async function deleteItem(uid) {
  if (!isAdmin) return;
  if (!confirm("คุณต้องการลบรายการนี้ใช่ไหม?")) return;

  data = data.filter((item) => item.uid !== uid);

  if (editingUid === uid) {
    cancelEdit();
  }

  await saveData();
  render();
}

function editItem(uid) {
  if (!isAdmin) return;

  const item = data.find((asset) => asset.uid === uid);
  if (!item) return;

  editingUid = uid;

  assetId.value = item.id || "";
  assetName.value = item.name || "";
  assetStatus.value = normalizeStatus(item.status);
  assetBuilding.value = normalizeOption(item.building, BUILDING_OPTIONS, "ตึกบริหาร");
  assetRoom.value = normalizeOption(item.room, ROOM_OPTIONS, "201");
  assetReportStatus.value = normalizeOption(item.reportStatus, REPORT_STATUS_OPTIONS, deriveReportStatus(item));
  assetFiscalYear.value = normalizeOption(item.fiscalYear, FISCAL_YEAR_OPTIONS, "ไม่ทราบปีงบประมาณ");
  assetDept.value = normalizeOption(item.dept, DIVISION_OPTIONS, "ฝ่ายบริหาร");

  assetId.disabled = false;
  formTitle.innerText = "แก้ไขข้อมูลครุภัณฑ์";
  saveBtn.innerText = "🔄 อัปเดตข้อมูล";
  cancelEditBtn.innerText = "❌ ยกเลิกการแก้ไข";
  cancelEditBtn.style.display = "inline-block";

  showAssetForm();
}

function getStatusMeta(status) {
  return STATUS_OPTIONS.find((option) => option.value === normalizeStatus(status)) || STATUS_OPTIONS[0];
}

function createBadge(status) {
  const meta = getStatusMeta(status);
  const badge = document.createElement("span");
  badge.className = `badge ${meta.theme}`;
  badge.textContent = `${meta.icon} ${meta.label}`;
  return badge;
}

function createTextCell(value, fallback = "") {
  const cell = document.createElement("td");
  cell.textContent = value || fallback;

  if (!value && fallback) {
    cell.classList.add("dimmed-value");
  }

  return cell;
}

function getSearchText(item) {
  return [
    item.id,
    item.name,
    item.status,
    item.building,
    item.room,
    item.reportStatus,
    item.fiscalYear,
    item.dept,
    item.date
  ].join(" ").toLowerCase();
}

function getFilteredData() {
  const keyword = search.value.trim().toLowerCase();

  return data.filter((item) => {
    const matchesStatus = activeStatusFilter === "ทั้งหมด" || normalizeStatus(item.status) === activeStatusFilter;
    const matchesKeyword = !keyword || getSearchText(item).includes(keyword);
    return matchesStatus && matchesKeyword;
  });
}

function renderStats() {
  statusGrid.innerHTML = "";

  const summary = [
    { value: "ทั้งหมด", label: "ครุภัณฑ์ทั้งหมด", icon: "📦", theme: "total", count: data.length },
    ...STATUS_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
      icon: option.icon,
      theme: option.theme,
      count: data.filter((item) => normalizeStatus(item.status) === option.value).length
    }))
  ];

  summary.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `status-card ${item.theme}`;
    card.setAttribute("aria-pressed", String(activeStatusFilter === item.value));

    if (activeStatusFilter === item.value) {
      card.classList.add("active");
    }

    const label = document.createElement("h3");
    label.textContent = `${item.icon} ${item.label}`;

    const count = document.createElement("span");
    count.textContent = item.count;

    card.append(label, count);
    card.addEventListener("click", () => {
      activeStatusFilter = item.value;
      render();
      table.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    statusGrid.appendChild(card);
  });
}

function renderActiveFilterText(listLength) {
  if (!activeFilterText) return;

  const label = activeStatusFilter === "ทั้งหมด" ? "ครุภัณฑ์ทั้งหมด" : `สถานะ${activeStatusFilter}`;
  activeFilterText.textContent = `กำลังแสดง: ${label} (${listLength} รายการ)`;
}

function renderEmptyRow() {
  if (data.length > 0) return;

  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 10;
  cell.className = "empty-state";
  cell.textContent = "ยังไม่มีข้อมูลครุภัณฑ์";
  row.appendChild(cell);
  table.appendChild(row);
}

function render() {
  data = data.map(normalizeAsset);

  const list = getFilteredData();
  table.innerHTML = "";
  renderActiveFilterText(list.length);

  list.forEach((item) => {
    const row = document.createElement("tr");

    row.appendChild(createTextCell(item.id, "ยังไม่มีเลข"));
    row.appendChild(createTextCell(item.name, "ไม่ทราบชื่อครุภัณฑ์"));

    const statusCell = document.createElement("td");
    statusCell.appendChild(createBadge(item.status));
    row.appendChild(statusCell);

    row.appendChild(createTextCell(item.building));
    row.appendChild(createTextCell(item.room));
    row.appendChild(createTextCell(item.reportStatus));
    row.appendChild(createTextCell(item.fiscalYear));
    row.appendChild(createTextCell(item.dept));
    row.appendChild(createTextCell(item.date));

    const actionCell = document.createElement("td");

    if (isAdmin) {
      const actionButtons = document.createElement("div");
      actionButtons.className = "action-btns";

      const editButton = document.createElement("button");
      editButton.className = "edit-btn";
      editButton.type = "button";
      editButton.title = "แก้ไข";
      editButton.textContent = "✏️";
      editButton.addEventListener("click", () => editItem(item.uid));

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-btn";
      deleteButton.type = "button";
      deleteButton.title = "ลบ";
      deleteButton.textContent = "🗑️";
      deleteButton.addEventListener("click", () => deleteItem(item.uid));

      actionButtons.append(editButton, deleteButton);
      actionCell.appendChild(actionButtons);
    } else {
      const text = document.createElement("span");
      text.className = "muted-text";
      text.textContent = "ผู้ใช้งานทั่วไป";
      actionCell.appendChild(text);
    }

    row.appendChild(actionCell);
    table.appendChild(row);
  });

  if (list.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 10;
    cell.className = "empty-state";
    if (search.value.trim()) {
      cell.textContent = "ไม่พบข้อมูลที่ค้นหา";
    } else if (activeStatusFilter !== "ทั้งหมด") {
      cell.textContent = `ยังไม่มีข้อมูลสถานะ${activeStatusFilter}`;
    } else {
      cell.textContent = "ยังไม่มีข้อมูลครุภัณฑ์";
    }
    row.appendChild(cell);
    table.appendChild(row);
  }

  renderStats();
}

loginBtn.addEventListener("click", openLogin);
logoutBtn.addEventListener("click", logout);
openAssetFormBtn.addEventListener("click", openNewAssetForm);
submitLoginBtn.addEventListener("click", login);
closeLoginBtn.addEventListener("click", closeLogin);
saveBtn.addEventListener("click", addItem);
cancelEditBtn.addEventListener("click", cancelEdit);
search.addEventListener("input", searchItem);

assetReportStatus.addEventListener("change", () => {
  if (assetReportStatus.value.includes("ไม่มีเลข") && !assetId.value.trim()) {
    assetStatus.value = "ยังไม่มีเลข";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  if (overlay.classList.contains("show")) {
    if (document.activeElement === user || document.activeElement === pass) {
      login();
    }
    return;
  }

  const formFields = [assetId, assetName, assetDept, assetStatus, assetBuilding, assetRoom, assetReportStatus, assetFiscalYear];

  if (formFields.includes(document.activeElement)) {
    addItem();
  }
});

loadData();
