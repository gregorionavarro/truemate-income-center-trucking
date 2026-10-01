const DEFAULT_STATE = {
  r: [],
  p: ["Greg", "Carlos", "Paulina", "Fabiola"],
  c: ["Imperial PFS", "Great West", "RPS"],
  t: [],
  a: [],
  l: {
    "RPS": "https://rpsins.epaypolicy.com/",
    "Guardian": "https://guardian-ins.epaypolicy.com/",
    "Rocklake": "https://rocklakeig.epaypolicy.com/",
    "Burns and Wilcox": "https://burnsandwilcox.epaypolicy.com/"
  },
  w: {
    users: [
      { name: "Gregorio Navarro", email: "gregorio.navarro@truemategroup.com", active: true },
      { name: "Paulina Bermudez", email: "paula.bermudez@truemategroup.com", active: true },
      { name: "Camila", email: "camila@truemategroup.com", active: true },
      { name: "Fabiola Bermudez", email: "fabiola.bermudez@truemategroup.com", active: true }
    ],
    assignments: {
      carrierReview: "paula.bermudez@truemategroup.com",
      carrierPayment: "gregorio.navarro@truemategroup.com",
      deferredCollection: "camila@truemategroup.com"
    },
    internalNotifications: true
  },
  h: [],
  n: []
};

async function ensureTable(DB) {
  await DB.prepare(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await DB.prepare(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_email TEXT,
      user_name TEXT,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      ref TEXT,
      detail TEXT,
      before_json TEXT,
      after_json TEXT
    )
  `).run();
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {})
    }
  });
}

function emailFrom(request) {
  return String(request.headers.get("cf-access-authenticated-user-email") || "").trim().toLowerCase();
}

function nameFromEmail(email) {
  const known = {
    "gregorio.navarro@truemategroup.com": "Gregorio Navarro",
    "fabiola.bermudez@truemategroup.com": "Fabiola Bermudez",
    "paula.bermudez@truemategroup.com": "Paula Bermudez",
    "camila@truemategroup.com": "Camila"
  };
  if (known[email]) return known[email];
  const local = (email || "Usuario").split("@")[0].replace(/[._-]+/g, " ");
  return local.replace(/\b\w/g, c => c.toUpperCase());
}

function normalize(parsed) {
  return {
    ...DEFAULT_STATE,
    ...parsed,
    r: Array.isArray(parsed?.r) ? parsed.r : [],
    p: Array.isArray(parsed?.p) ? parsed.p : DEFAULT_STATE.p,
    c: Array.isArray(parsed?.c) ? parsed.c : DEFAULT_STATE.c,
    t: Array.isArray(parsed?.t) ? parsed.t : [],
    a: Array.isArray(parsed?.a) ? parsed.a : [],
    l: parsed?.l && typeof parsed.l === "object" && !Array.isArray(parsed.l) ? parsed.l : DEFAULT_STATE.l,
    w: parsed?.w && typeof parsed.w === "object" && !Array.isArray(parsed.w) ? parsed.w : DEFAULT_STATE.w,
    h: Array.isArray(parsed?.h) ? parsed.h : [],
    n: Array.isArray(parsed?.n) ? parsed.n : []
  };
}

async function readState(DB) {
  const row = await DB.prepare("SELECT json FROM app_state WHERE id = 1").first();
  if (!row?.json) return normalize(DEFAULT_STATE);
  try { return normalize(JSON.parse(row.json)); } catch (_) { return normalize(DEFAULT_STATE); }
}

function keyOf(x, i) {
  return String(x?.id ?? x?.invoice ?? x?.title ?? i);
}

function meaningfulRecord(x) {
  if (!x) return {};
  return {
    client: x.client || "",
    company: x.company || "",
    invoice: x.invoice || "",
    producer: x.producer || "",
    date: x.date || x.payment_date || "",
    gross: +(x.gross ?? x.gross_payment ?? 0),
    agencyFee: +(x.agencyFee ?? x.agency_fee ?? 0),
    net: +(x.net ?? x.net_deposit ?? 0),
    depositStatus: x.depositStatus || x.deposit_status || "",
    pendingAmt: +(x.pendingAmt ?? x.pending_amount ?? 0),
    carrier: x.carrier || x.carrier_name || "",
    carrierAmt: +(x.carrierAmt ?? x.carrier_amount ?? x.downPayment ?? 0),
    carrierDue: x.carrierDue || x.carrier_due || "",
    carrierStatus: x.carrierStatus || x.carrier_status || "",
    carrierPaidDate: x.carrierPaidDate || "",
    note: x.note || x.notes || ""
  };
}

function diffFields(before, after) {
  const out = [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const k of keys) {
    const a = before?.[k] ?? "";
    const b = after?.[k] ?? "";
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${k}: ${String(a || "—")} → ${String(b || "—")}`);
  }
  return out;
}

function buildAudit(oldState, newState) {
  const events = [];
  const oldMap = new Map((oldState.r || []).map((x,i)=>[keyOf(x,i),x]));
  const newMap = new Map((newState.r || []).map((x,i)=>[keyOf(x,i),x]));
  for (const [k, r] of newMap) {
    const old = oldMap.get(k);
    const ref = String(r.invoice || r.id || k);
    if (!old) {
      events.push({module:"Ingresos", action:"Creado", ref, detail:`Nuevo ingreso · ${r.client || "Sin cliente"} · ${r.invoice || "Sin invoice"}`, before:null, after:meaningfulRecord(r)});
    } else {
      const b = meaningfulRecord(old), a = meaningfulRecord(r), changes = diffFields(b,a);
      if (changes.length) {
        const module = changes.some(x=>x.startsWith("carrier")) ? "Carrier / PFA" : "Ingresos";
        events.push({module, action:"Actualizado", ref, detail:changes.slice(0,8).join(" · "), before:b, after:a});
      }
    }
  }
  for (const [k, r] of oldMap) if (!newMap.has(k)) events.push({module:"Ingresos", action:"Eliminado", ref:String(r.invoice || r.id || k), detail:`Ingreso eliminado · ${r.client || "Sin cliente"}`, before:meaningfulRecord(r), after:null});

  const taskOld = JSON.stringify(oldState.t || []), taskNew = JSON.stringify(newState.t || []);
  if (taskOld !== taskNew) events.push({module:"Tareas", action:"Actualizado", ref:"Tareas", detail:"Se modificaron tareas o notas", before:null, after:null});

  if (JSON.stringify(oldState.p || []) !== JSON.stringify(newState.p || [])) events.push({module:"Configuración", action:"Producers", ref:"Producers", detail:"Se modificó la lista de Producers", before:null, after:null});
  if (JSON.stringify(oldState.c || []) !== JSON.stringify(newState.c || [])) events.push({module:"Configuración", action:"Carriers", ref:"Carriers", detail:"Se modificó la lista de Carrier / MGA / PFA", before:null, after:null});
  if (JSON.stringify(oldState.l || {}) !== JSON.stringify(newState.l || {})) events.push({module:"Configuración", action:"Portales", ref:"Portales de pago", detail:"Se modificaron portales de pago", before:null, after:null});
  return events.slice(0,50);
}

async function writeAudit(DB, request, events) {
  if (!events.length) return;
  const email = emailFrom(request), name = nameFromEmail(email);
  for (const e of events) {
    await DB.prepare(`INSERT INTO audit_events (user_email,user_name,module,action,ref,detail,before_json,after_json) VALUES (?,?,?,?,?,?,?,?)`)
      .bind(email,name,e.module,e.action,e.ref || "",e.detail || "",e.before ? JSON.stringify(e.before) : null,e.after ? JSON.stringify(e.after) : null).run();
  }
}

export async function onRequestGet(context) {
  const { DB } = context.env;
  if (!DB) return json({ ok: false, error: "D1 binding DB no disponible" }, { status: 500 });
  await ensureTable(DB);
  const row = await DB.prepare("SELECT json, updated_at FROM app_state WHERE id = 1").first();
  if (!row) return json({ ok: true, exists: false, state: DEFAULT_STATE, updated_at: null });
  let state = DEFAULT_STATE;
  try { state = normalize(JSON.parse(row.json)); } catch (_) {}
  return json({ ok: true, exists: true, state, updated_at: row.updated_at });
}

export async function onRequestPost(context) {
  const { DB } = context.env;
  if (!DB) return json({ ok: false, error: "D1 binding DB no disponible" }, { status: 500 });
  await ensureTable(DB);

  let body;
  try { body = await context.request.json(); }
  catch (_) { return json({ ok: false, error: "JSON inválido" }, { status: 400 }); }

  const state = body?.state || body;
  if (!state || !Array.isArray(state.r) || !Array.isArray(state.p) || !Array.isArray(state.c) || !Array.isArray(state.t)) return json({ ok: false, error: "Estado inválido" }, { status: 400 });

  const existing = await readState(DB);
  const next = normalize({
    ...existing,
    r: state.r,
    p: state.p,
    c: state.c,
    t: state.t,
    a: Array.isArray(state.a) ? state.a : existing.a,
    l: state.l && typeof state.l === "object" && !Array.isArray(state.l) ? state.l : existing.l,
    // w/h/n are server-managed here. A legacy shared client must never erase them.
    w: state.w && typeof state.w === "object" && !Array.isArray(state.w) ? state.w : existing.w,
    h: Array.isArray(state.h) ? state.h.slice(-2000) : existing.h,
    n: Array.isArray(state.n) ? state.n.slice(-1000) : existing.n
  });

  const events = buildAudit(existing, next);
  const payload = JSON.stringify(next);
  await DB.prepare(`
    INSERT INTO app_state (id, json, updated_at)
    VALUES (1, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = CURRENT_TIMESTAMP
  `).bind(payload).run();
  await writeAudit(DB, context.request, events);

  const row = await DB.prepare("SELECT updated_at FROM app_state WHERE id = 1").first();
  return json({ ok: true, updated_at: row?.updated_at || null });
}
