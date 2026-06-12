const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const dataFile = path.join(dataDir, "assets.json");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

const allowedStatuses = new Set([
  "ปกติ",
  "แทงจำหน่าย",
  "ชำรุด(รอจำหน่าย)",
  "ยังไม่มีเลข",
  "ชำรุด(รอซ่อม)",
  "โอนย้าย"
]);

const legacyStatusMap = {
  "พร้อมใช้งาน": "ปกติ",
  "กำลังซ่อม": "ชำรุด(รอซ่อม)",
  "จำหน่ายแล้ว": "แทงจำหน่าย",
  "โฮนย้าย": "โอนย้าย"
};

const allowedBuildings = new Set(["ตึกบริหาร", "ตึกช่างยนต์", "ตึกอุตสาหกรรม"]);
const allowedRooms = new Set(["201", "202", "203", "204", "205", "206", "207", "208", "301", "302", "303", "304", "305", "306", "307", "308"]);
const allowedReportStatuses = new Set([
  "มีเลข และชื่อครุภัณฑ์",
  "มีเลข แต่ไม่ทราบชื่อครุภัณฑ์",
  "ไม่มีเลข และไม่ทราบชื่อครุภัณฑ์",
  "ไม่มีเลข แต่ทราบชื่อครุภัณฑ์"
]);
const allowedFiscalYears = new Set(["ไม่ทราบปีงบประมาณ", "2570", "2569", "2568", "2567", "2566", "2565", "2564", "2563", "2562", "2561", "2560"]);
const allowedDivisions = new Set(["ฝ่ายบริการนักศึกษา", "ฝ่ายบริหาร", "ฝ่ายวิชาการ"]);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeStatus(status) {
  const cleanStatus = cleanText(status);
  const mappedStatus = legacyStatusMap[cleanStatus] || cleanStatus;
  return allowedStatuses.has(mappedStatus) ? mappedStatus : "ปกติ";
}

function normalizeOption(value, allowedValues, fallback) {
  const cleanValue = cleanText(value);
  return allowedValues.has(cleanValue) ? cleanValue : fallback;
}

function deriveReportStatus(asset) {
  const hasId = Boolean(cleanText(asset.id));
  const hasName = Boolean(cleanText(asset.name));

  if (hasId && hasName) return "มีเลข และชื่อครุภัณฑ์";
  if (hasId) return "มีเลข แต่ไม่ทราบชื่อครุภัณฑ์";
  if (hasName) return "ไม่มีเลข แต่ทราบชื่อครุภัณฑ์";
  return "ไม่มีเลข และไม่ทราบชื่อครุภัณฑ์";
}

function normalizeAsset(asset = {}) {
  const id = cleanText(asset.id);
  const name = cleanText(asset.name);
  const uid = cleanText(asset.uid || id || randomUUID()) || randomUUID();

  return {
    uid,
    id,
    name,
    status: normalizeStatus(asset.status),
    building: normalizeOption(asset.building, allowedBuildings, "ตึกบริหาร"),
    room: normalizeOption(asset.room, allowedRooms, "201"),
    reportStatus: normalizeOption(asset.reportStatus, allowedReportStatuses, deriveReportStatus({ id, name })),
    fiscalYear: normalizeOption(asset.fiscalYear, allowedFiscalYears, "ไม่ทราบปีงบประมาณ"),
    dept: normalizeOption(asset.dept || asset.division, allowedDivisions, "ฝ่ายบริหาร"),
    date: cleanText(asset.date)
  };
}

async function ensureDataFile() {
  await fsp.mkdir(dataDir, { recursive: true });

  try {
    await fsp.access(dataFile);
  } catch {
    await fsp.writeFile(dataFile, "[]\n", "utf8");
  }
}

async function readAssets() {
  await ensureDataFile();
  const raw = (await fsp.readFile(dataFile, "utf8")).replace(/^\uFEFF/, "");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeAsset).filter((asset) => asset.uid) : [];
  } catch {
    return [];
  }
}

async function writeAssets(assets) {
  await ensureDataFile();

  if (!Array.isArray(assets)) {
    throw new Error("Payload must be an array");
  }

  const normalized = assets.map(normalizeAsset).filter((asset) => asset.uid);
  const tempFile = `${dataFile}.tmp`;
  await fsp.writeFile(tempFile, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await fsp.rename(tempFile, dataFile);
  return normalized;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleApi(req, res) {
  const pathname = req.url.split("?")[0];

  if (pathname !== "/api/assets") {
    sendJson(res, 404, { error: "API endpoint not found" });
    return;
  }

  try {
    if (req.method === "GET") {
      sendJson(res, 200, await readAssets());
      return;
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      const assets = await writeAssets(JSON.parse(body || "[]"));
      sendJson(res, 200, assets);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

function serveStaticFile(req, res) {
  const cleanPath = decodeURIComponent(req.url.split("?")[0]);
  const relativePath = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.resolve(root, `.${relativePath}`);

  if (!filePath.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(buffer);
  });
}

http.createServer(async (req, res) => {
  if (req.url.split("?")[0] === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("OK");
    return;
  }

  if (req.url.startsWith("/api/")) {
    await handleApi(req, res);
    return;
  }

  serveStaticFile(req, res);
}).listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
  console.log(`Local URL: http://127.0.0.1:${port}/`);
});
