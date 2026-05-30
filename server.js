const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

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

const allowedStatuses = new Set(["พร้อมใช้งาน", "กำลังซ่อม", "จำหน่ายแล้ว"]);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function normalizeAsset(asset) {
  return {
    id: String(asset.id || "").trim(),
    name: String(asset.name || "").trim(),
    dept: String(asset.dept || "").trim(),
    status: allowedStatuses.has(asset.status) ? asset.status : "พร้อมใช้งาน",
    date: String(asset.date || "").trim()
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
    return Array.isArray(parsed) ? parsed.map(normalizeAsset).filter((asset) => asset.id) : [];
  } catch {
    return [];
  }
}

async function writeAssets(assets) {
  await ensureDataFile();

  if (!Array.isArray(assets)) {
    throw new Error("Payload must be an array");
  }

  const normalized = assets.map(normalizeAsset).filter((asset) => asset.id);
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
