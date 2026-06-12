import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasSupabase, supabaseRequest } from "./server/db.mjs";
import { authenticate } from "./server/auth.mjs";
import { handleSkool, runEngine } from "./server/skool.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const dataDir = path.join(__dirname, "data");
const submissionsFile = path.join(dataDir, "submissions.json");
const submissionsCsvFile = path.join(dataDir, "submissions.csv");
const port = Number(process.env.PORT || 5174);
const supabaseTable = process.env.SUPABASE_TABLE || "growkey_form_submissions";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

await mkdir(dataDir, { recursive: true });
if (!existsSync(submissionsFile)) {
  await writeFile(submissionsFile, "[]", "utf8");
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (url.pathname === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        storage: hasSupabase ? "supabase" : "local-json",
      });
      return;
    }

    if (url.pathname === "/api/submissions") {
      await handleSubmissions(request, response, url);
      return;
    }

    if (url.pathname === "/api/submissions.csv") {
      await handleSubmissionsCsv(request, response, url);
      return;
    }

    if (url.pathname.startsWith("/api/skool/")) {
      await handleSkool(request, response, url, { sendJson, readBody });
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "internal_error" });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Client intake running at http://127.0.0.1:${port}`);
  console.log(`Submission storage: ${hasSupabase ? "supabase" : submissionsFile}`);
});

async function handleSubmissions(request, response, url) {
  if (request.method === "GET") {
    const auth = await authenticate(request);
    if (!auth) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }
    if (auth.role !== "admin") {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }
    sendJson(response, 200, filterSubmissions(await readSubmissions(), url.searchParams.get("form")));
    return;
  }

  if (request.method === "POST") {
    const auth = await authenticate(request); // null es válido aquí (endpoint público)
    const body = await readBody(request);
    let submission;
    try {
      submission = JSON.parse(body);
    } catch {
      sendJson(response, 400, { error: "invalid_json" });
      return;
    }
    // JSON.parse acepta "null" o "5": exigimos un objeto para leer campos.
    if (submission === null || typeof submission !== "object") {
      sendJson(response, 400, { error: "invalid_json" });
      return;
    }
    const saved = {
      ...submission,
      id: submission.id || crypto.randomUUID(),
      createdAt: submission.createdAt || new Date().toISOString(),
      values: normalizeValues(submission.values || {}),
    };
    // Nunca confiar en el clientId del body: la submission solo queda ligada
    // a un cliente cuando llega con token de cliente válido (spec §3).
    saved.clientId = auth && auth.role === "client" ? auth.userId : null;
    await saveSubmission(saved);
    // El formulario recién ligado puede completar la fase actual del cliente.
    if (saved.clientId) {
      // La submission ya quedó persistida: si el motor falla aquí respondemos
      // 200 sin avance — un 500 provocaría reintentos y submissions duplicadas.
      let advanced = false;
      try {
        const engine = await runEngine(auth.userId, auth.userId);
        advanced = engine.advanced ?? false;
      } catch (error) {
        console.error("runEngine falló después de guardar la submission", error);
      }
      sendJson(response, 200, { ...saved, advanced });
      return;
    }
    sendJson(response, 200, saved);
    return;
  }

  if (request.method === "DELETE") {
    const auth = await authenticate(request);
    if (!auth) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }
    if (auth.role !== "admin") {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }
    if (hasSupabase && process.env.ALLOW_ADMIN_DELETE !== "true") {
      sendJson(response, 403, { error: "delete_disabled" });
      return;
    }
    await writeFile(submissionsFile, "[]", "utf8");
    await writeFile(submissionsCsvFile, "", "utf8");
    if (hasSupabase) await clearSupabaseSubmissions(url.searchParams.get("form"));
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 405, { error: "method_not_allowed" });
}

async function handleSubmissionsCsv(request, response, url) {
  const auth = await authenticate(request);
  if (!auth) {
    sendJson(response, 401, { error: "unauthorized" });
    return;
  }
  if (auth.role !== "admin") {
    sendJson(response, 403, { error: "forbidden" });
    return;
  }
  const submissions = filterSubmissions(await readSubmissions(), url.searchParams.get("form"));
  const csv = buildCsv(submissions);
  response.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": "attachment; filename=\"client-intake-submissions.csv\"",
  });
  response.end(csv);
}

function filterSubmissions(submissions, formSlug) {
  if (!formSlug) return submissions;

  return submissions.filter((submission) => {
    const values = submission.values || {};
    if (values.formSlug === formSlug) return true;
    if (formSlug === "growkey-offer-v1") return Boolean(values.avatarNiche || values.offerStatement);
    if (formSlug === "growkey-onboarding-v1") return Boolean(values.business || values.mainProfile || values.email);
    return false;
  });
}

async function readSubmissions() {
  if (hasSupabase) return readSupabaseSubmissions();

  const raw = await readFile(submissionsFile, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function saveSubmission(submission) {
  if (hasSupabase) {
    await createSupabaseSubmission(submission);
    return;
  }

  const submissions = await readSubmissions();
  submissions.unshift(submission);
  await writeFile(submissionsFile, JSON.stringify(submissions, null, 2), "utf8");
  await writeCsvBackup(submissions);
}

async function readSupabaseSubmissions() {
  const rows = await supabaseRequest(
    `/rest/v1/${supabaseTable}?select=*&order=created_at.desc`,
  );

  return rows.map(rowToSubmission);
}

async function createSupabaseSubmission(submission) {
  const formSlug = String(submission.values?.formSlug || inferFormSlug(submission.values || {}));
  await supabaseRequest(`/rest/v1/${supabaseTable}`, {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      id: submission.id,
      form_slug: formSlug,
      created_at: submission.createdAt,
      score: Number(submission.score || 0),
      stage: String(submission.stage || ""),
      client_id: submission.clientId ?? null,
      values: {
        ...submission.values,
        formSlug,
      },
    }),
  });
}

async function clearSupabaseSubmissions(formSlug) {
  const query = formSlug ? `?form_slug=eq.${encodeURIComponent(formSlug)}` : "";
  await supabaseRequest(`/rest/v1/${supabaseTable}${query}`, {
    method: "DELETE",
  });
}

function rowToSubmission(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    values: {
      ...(row.values || {}),
      formSlug: row.form_slug || row.values?.formSlug,
    },
    score: row.score ?? 0,
    stage: row.stage || "",
    // El panel admin filtra por esto para "ligar respuesta existente".
    clientId: row.client_id ?? null,
  };
}

function normalizeValues(values) {
  const formSlug = values.formSlug || inferFormSlug(values);
  return {
    ...values,
    formSlug,
  };
}

function inferFormSlug(values) {
  if (values.business || values.mainProfile || values.email) return "growkey-onboarding-v1";
  return "growkey-offer-v1";
}

async function writeCsvBackup(submissions) {
  await writeFile(submissionsCsvFile, buildCsv(submissions), "utf8");
}

function buildCsv(submissions) {
  const valueKeys = Array.from(
    new Set(submissions.flatMap((submission) => Object.keys(submission.values || {}))),
  );
  const headers = ["id", "createdAt", "score", "stage", ...valueKeys];
  const rows = submissions.map((submission) => [
    submission.id,
    submission.createdAt,
    submission.score,
    submission.stage,
    ...valueKeys.map((key) => valueToCell(submission.values?.[key])),
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function valueToCell(value) {
  if (Array.isArray(value)) return value.join("; ");
  return String(value ?? "");
}

function escapeCsv(value) {
  const stringValue = String(value);
  if (!/[",\n]/.test(stringValue)) return stringValue;
  return `"${stringValue.replace(/"/g, "\"\"")}"`;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function serveStatic(urlPath, response) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0] || "/");
  const candidatePath = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.normalize(path.join(distDir, candidatePath));
  const isInsideDist = filePath.startsWith(distDir);
  const finalPath = isInsideDist && existsSync(filePath)
    ? filePath
    : path.join(distDir, "index.html");

  const ext = path.extname(finalPath);
  const content = await readFile(finalPath);
  response.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
  });
  response.end(content);
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}
