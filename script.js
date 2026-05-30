let data = [];
let isAdmin = false;
let editingId = null;

const ADMIN_USER = "Aphidet";
const ADMIN_PASS = "281251";
const STORAGE_KEY = "npuAssets";
const API_URL = "/api/assets";

const overlay = document.getElementById("overlay");
const user = document.getElementById("user");
const pass = document.getElementById("pass");
const adminForm = document.getElementById("adminForm");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const submitLoginBtn = document.getElementById("submitLoginBtn");
const closeLoginBtn = document.getElementById("closeLoginBtn");
const assetId = document.getElementById("assetId");
const assetName = document.getElementById("assetName");
const assetDept = document.getElementById("assetDept");
const assetStatus = document.getElementById("assetStatus");
const search = document.getElementById("search");
const table = document.getElementById("table");
const totalCount = document.getElementById("totalCount");
const okCount = document.getElementById("okCount");
const repairCount = document.getElementById("repairCount");
const soldCount = document.getElementById("soldCount");
const formTitle = document.getElementById("formTitle");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const storageStatus = document.getElementById("storageStatus");

function readLocalData() {
  const storedData = localStorage.getItem(STORAGE_KEY);

  try {
    const parsed = storedData ? JSON.parse(storedData) : [];
    return Array.isArray(parsed) ? parsed : [];
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

  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  return assets;
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

    data = await response.json();
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

function login() {
  if (user.value.trim() === ADMIN_USER && pass.value.trim() === ADMIN_PASS) {
    isAdmin = true;
    adminForm.style.display = "block";
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    closeLogin();
    render();
    alert("เข้าสู่ระบบสำเร็จ");
  } else {
    alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }
}

function logout() {
  isAdmin = false;
  adminForm.style.display = "none";
  loginBtn.style.display = "inline-block";
  logoutBtn.style.display = "none";
  user.value = "";
  pass.value = "";
  cancelEdit();
  render();
}

function cancelEdit() {
  editingId = null;
  assetId.value = "";
  assetName.value = "";
  assetDept.value = "";
  assetStatus.value = "พร้อมใช้งาน";
  assetId.disabled = false;

  formTitle.innerText = "เพิ่มข้อมูลครุภัณฑ์";
  saveBtn.innerText = "💾 บันทึกข้อมูล";
  cancelEditBtn.style.display = "none";
}

async function addItem() {
  if (!isAdmin) {
    alert("เฉพาะแอดมินเท่านั้น");
    return;
  }

  const id = assetId.value.trim();
  const name = assetName.value.trim();
  const dept = assetDept.value.trim();
  const status = assetStatus.value;

  if (!id || !name || !dept) {
    alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  if (editingId) {
    const index = data.findIndex((item) => item.id === editingId);

    if (index !== -1) {
      data[index] = {
        ...data[index],
        id,
        name,
        dept,
        status
      };
    }
  } else {
    const exists = data.some((item) => item.id === id);

    if (exists) {
      alert("รหัสครุภัณฑ์นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น");
      return;
    }

    data.push({
      id,
      name,
      dept,
      status,
      date: new Date().toLocaleDateString("th-TH")
    });
  }

  cancelEdit();
  await saveData();
  render();
}

function searchItem() {
  render();
}

async function deleteItem(id) {
  if (!isAdmin) return;
  if (!confirm("คุณต้องการลบรายการนี้ใช่ไหม?")) return;

  data = data.filter((item) => item.id !== id);

  if (editingId === id) {
    cancelEdit();
  }

  await saveData();
  render();
}

function editItem(id) {
  if (!isAdmin) return;

  const item = data.find((asset) => asset.id === id);
  if (!item) return;

  editingId = id;

  assetId.value = item.id || "";
  assetName.value = item.name || "";
  assetDept.value = item.dept || "";
  assetStatus.value = item.status || "พร้อมใช้งาน";

  assetId.disabled = true;
  formTitle.innerText = "แก้ไขข้อมูลครุภัณฑ์";
  saveBtn.innerText = "🔄 อัปเดตข้อมูล";
  cancelEditBtn.style.display = "inline-block";

  adminForm.scrollIntoView({ behavior: "smooth" });
}

function createBadge(status) {
  const badge = document.createElement("span");
  badge.classList.add("badge");

  if (status === "พร้อมใช้งาน") {
    badge.classList.add("green");
    badge.textContent = "🟢 พร้อมใช้งาน";
  } else if (status === "กำลังซ่อม") {
    badge.classList.add("orange");
    badge.textContent = "🟠 กำลังซ่อม";
  } else {
    badge.classList.add("red");
    badge.textContent = "🔴 จำหน่ายแล้ว";
  }

  return badge;
}

function createTextCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value || "";
  return cell;
}

function getFilteredData() {
  const keyword = search.value.trim().toLowerCase();

  if (!keyword) return data;

  return data.filter((item) =>
    String(item.id || "").toLowerCase().includes(keyword) ||
    String(item.name || "").toLowerCase().includes(keyword) ||
    String(item.dept || "").toLowerCase().includes(keyword)
  );
}

function renderStats() {
  const ok = data.filter((item) => item.status === "พร้อมใช้งาน").length;
  const repair = data.filter((item) => item.status === "กำลังซ่อม").length;
  const sold = data.filter((item) => item.status === "จำหน่ายแล้ว").length;

  totalCount.innerText = data.length;
  okCount.innerText = ok;
  repairCount.innerText = repair;
  soldCount.innerText = sold;
}

function render() {
  const list = getFilteredData();
  table.innerHTML = "";

  list.forEach((item) => {
    const row = document.createElement("tr");

    row.appendChild(createTextCell(item.id));
    row.appendChild(createTextCell(item.name));
    row.appendChild(createTextCell(item.dept));

    const statusCell = document.createElement("td");
    statusCell.appendChild(createBadge(item.status));
    row.appendChild(statusCell);

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
      editButton.addEventListener("click", () => editItem(item.id));

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-btn";
      deleteButton.type = "button";
      deleteButton.title = "ลบ";
      deleteButton.textContent = "🗑️";
      deleteButton.addEventListener("click", () => deleteItem(item.id));

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

  renderStats();
}

loginBtn.addEventListener("click", openLogin);
logoutBtn.addEventListener("click", logout);
submitLoginBtn.addEventListener("click", login);
closeLoginBtn.addEventListener("click", closeLogin);
saveBtn.addEventListener("click", addItem);
cancelEditBtn.addEventListener("click", cancelEdit);
search.addEventListener("input", searchItem);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  if (overlay.classList.contains("show")) {
    if (document.activeElement === user || document.activeElement === pass) {
      login();
    }
    return;
  }

  if (
    document.activeElement === assetId ||
    document.activeElement === assetName ||
    document.activeElement === assetDept ||
    document.activeElement === assetStatus
  ) {
    addItem();
  }
});

loadData();
