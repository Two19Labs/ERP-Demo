// ── Analytics page (owner-only) ─────────────────────────────────────
// Mirrors app.js auth bootstrap. Aggregation done client-side in JS.
// Charts via Chart.js v4 (CDN). Date range drives every query + chart.

const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYWloZHV0bXlkaWVseXB5bWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTg4MjAsImV4cCI6MjA5NDY5NDgyMH0.f_22JtIO0T3FenTxJHgO0LhFoYHH38UMg_-hJK1K0vE";

// Brand palette pulled from style.css tokens.
const C = {
  ink: "#18181b",
  accent: "#e6332a",
  ok: "#15803d",
  warn: "#b45309",
  bad: "#b91c1c",
  muted: "#71717a",
  line: "#ececec"
};
// Multi-series categorical palette (derived, kept tasteful).
const PALETTE = ["#e6332a", "#18181b", "#15803d", "#b45309", "#2563eb", "#7c3aed", "#0891b2", "#db2777", "#65a30d", "#a1a1aa"];

const analyticsState = {
  profile: null,
  fromDate: null, // 'YYYY-MM-DD'
  toDate: null,
  preset: "30"
};

const charts = {}; // id -> Chart instance

// Per-chart click targets, kept in sync on each render so chart onClick
// handlers can deep-link to the clicked entity's page.
const clickIndex = { vendorIds: [], itemIds: [], statusKeys: [] };

// Navigate helper.
function go(url) { window.location.href = url; }

let supabaseClient;
if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabaseClient) {
    showSetupError("Supabase client failed to load.");
    return;
  }

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = "index.html";
      return;
    }
    wireEvents();
    await setup(session.user);
  } catch (err) {
    console.error("Session bootstrap failed:", err);
    showSetupError("Could not verify the current session.");
  }
});

function wireEvents() {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  document.getElementById("datePresets")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".date-preset");
    if (!btn) return;
    document.querySelectorAll(".date-preset").forEach((b) => b.classList.remove("date-preset-active"));
    btn.classList.add("date-preset-active");
    applyPreset(btn.dataset.range);
  });

  document.getElementById("applyCustom")?.addEventListener("click", () => {
    const from = document.getElementById("fromDate").value;
    const to = document.getElementById("toDate").value;
    if (!from || !to) return;
    if (from > to) {
      if (window.showToast) showToast("From date is after To date.", "error");
      return;
    }
    document.querySelectorAll(".date-preset").forEach((b) => b.classList.remove("date-preset-active"));
    analyticsState.fromDate = from;
    analyticsState.toDate = to;
    analyticsState.preset = "custom";
    syncInputs();
    loadAnalytics();
  });
}

async function setup(user) {
  document.getElementById("userEmail").textContent = user.email || "";

  const { data: profile, error } = await supabaseClient
    .from("user_access_view").select("*").eq("id", user.id).single();

  if (error || !profile) {
    showSetupError("Could not load your profile.");
    return;
  }
  analyticsState.profile = profile;

  const isOwner = profile.role_code === "owner";
  document.getElementById("userRole").textContent = isOwner ? "Owner" : "Staff";
  document.getElementById("userRole").classList.toggle("role-owner", isOwner);
  document.body.classList.add(`role-${profile.role_code}`);

  // Owner-only gate.
  if (!isOwner) {
    document.getElementById("accessDenied").classList.remove("hidden");
    document.getElementById("analyticsRoot").classList.add("hidden");
    return;
  }

  document.getElementById("analyticsRoot").classList.remove("hidden");
  wireKpiLinks();
  applyPreset("30"); // default range + first load
}

// KPI cards jump to the page that backs the metric.
function wireKpiLinks() {
  const links = {
    kpiSpend: "purchase-register.html?status=approved",
    kpiBills: "purchase-register.html?status=approved",
    kpiAvg: "purchase-register.html?status=approved",
    kpiWastage: "stock-ledger.html"
  };
  Object.entries(links).forEach(([id, url]) => {
    const card = document.getElementById(id)?.closest(".kpi-card");
    if (!card) return;
    card.classList.add("clickable");
    card.addEventListener("click", () => go(url));
  });
}

// ── Date range helpers ──────────────────────────────────────────────

function fmt(d) {
  // local date -> 'YYYY-MM-DD'
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function applyPreset(range) {
  const today = new Date();
  let from;
  if (range === "all") {
    from = await earliestDataDate();
  } else if (range === "month") {
    from = new Date(today.getFullYear(), today.getMonth(), 1);
  } else {
    const days = Number(range);
    from = new Date(today);
    from.setDate(today.getDate() - (days - 1));
  }
  analyticsState.fromDate = fmt(from);
  analyticsState.toDate = fmt(today);
  analyticsState.preset = range;
  syncInputs();
  loadAnalytics();
}

// Earliest date across bills + movements, so "All time" bounds the charts
// to real data instead of an arbitrary far-past date.
async function earliestDataDate() {
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() - 1);
  try {
    const [bill, mv] = await Promise.all([
      supabaseClient.from("purchase_bills").select("bill_date").order("bill_date", { ascending: true }).limit(1),
      supabaseClient.from("stock_movements").select("created_at").order("created_at", { ascending: true }).limit(1)
    ]);
    const dates = [];
    if (bill.data?.[0]?.bill_date) dates.push(new Date(bill.data[0].bill_date));
    if (mv.data?.[0]?.created_at) dates.push(new Date(mv.data[0].created_at));
    if (!dates.length) return fallback;
    return new Date(Math.min(...dates.map((d) => d.getTime())));
  } catch (_) {
    return fallback;
  }
}

function syncInputs() {
  document.getElementById("fromDate").value = analyticsState.fromDate;
  document.getElementById("toDate").value = analyticsState.toDate;
  const label = document.getElementById("rangeLabel");
  if (label) {
    const f = new Date(analyticsState.fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const t = new Date(analyticsState.toDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    label.textContent = `${f} — ${t}`;
  }
}

// Prior period of equal length, immediately before the current range.
function priorRange() {
  const from = new Date(analyticsState.fromDate);
  const to = new Date(analyticsState.toDate);
  const lenDays = Math.round((to - from) / 86400000) + 1;
  const prevTo = new Date(from);
  prevTo.setDate(from.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevTo.getDate() - (lenDays - 1));
  return { from: fmt(prevFrom), to: fmt(prevTo) };
}

// ── Currency / number format ────────────────────────────────────────

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ── Main loader ─────────────────────────────────────────────────────

async function loadAnalytics() {
  const { fromDate, toDate } = analyticsState;
  const fromTs = `${fromDate}T00:00:00`;
  const toTs = `${toDate}T23:59:59`;

  try {
    const prior = priorRange();

    const [
      approvedBills,
      allBills,
      billItems,
      movements,
      priorApprovedBills,
      priorMovements
    ] = await Promise.all([
      // approved bills in range
      supabaseClient.from("purchase_bills")
        .select("id, bill_date, total, vendor_id, vendors(name)")
        .eq("status", "approved").gte("bill_date", fromDate).lte("bill_date", toDate),
      // all bills in range (status breakdown)
      supabaseClient.from("purchase_bills")
        .select("status, bill_date").gte("bill_date", fromDate).lte("bill_date", toDate),
      // approved bill items in range (category / item spend)
      supabaseClient.from("purchase_bill_items")
        .select("line_total, stock_items(id, name, category), purchase_bills!inner(bill_date, status)")
        .eq("purchase_bills.status", "approved")
        .gte("purchase_bills.bill_date", fromDate).lte("purchase_bills.bill_date", toDate),
      // stock movements in range
      supabaseClient.from("stock_movements")
        .select("created_at, movement_type, quantity").gte("created_at", fromTs).lte("created_at", toTs),
      // prior approved bills (KPI delta)
      supabaseClient.from("purchase_bills")
        .select("total").eq("status", "approved").gte("bill_date", prior.from).lte("bill_date", prior.to),
      // prior movements (wastage delta)
      supabaseClient.from("stock_movements")
        .select("movement_type").gte("created_at", `${prior.from}T00:00:00`).lte("created_at", `${prior.to}T23:59:59`)
    ]);

    const firstErr = [approvedBills, allBills, billItems, movements, priorApprovedBills, priorMovements]
      .map((r) => r.error).find(Boolean);
    if (firstErr) throw firstErr;
    hideSetupError();

    renderKpis(approvedBills.data || [], movements.data || [], priorApprovedBills.data || [], priorMovements.data || []);
    renderSpendChart(approvedBills.data || []);
    renderMovementsChart(movements.data || []);
    renderCategoryChart(billItems.data || []);
    renderVendorChart(approvedBills.data || []);
    renderItemsChart(billItems.data || []);
    renderStatusChart(allBills.data || []);
  } catch (err) {
    console.error("Analytics load failed:", err);
    showSetupError("Could not load analytics: " + (err.message || err));
  }
}

// ── KPIs ────────────────────────────────────────────────────────────

function renderKpis(bills, movements, priorBills, priorMovements) {
  const spend = bills.reduce((s, b) => s + Number(b.total || 0), 0);
  const count = bills.length;
  const avg = count ? spend / count : 0;
  const wastage = movements.filter((m) => m.movement_type === "wastage").length;

  const priorSpend = priorBills.reduce((s, b) => s + Number(b.total || 0), 0);
  const priorCount = priorBills.length;
  const priorAvg = priorCount ? priorSpend / priorCount : 0;
  const priorWastage = priorMovements.filter((m) => m.movement_type === "wastage").length;

  setKpi("kpiSpend", inr(spend), "kpiSpendDelta", spend, priorSpend, true);
  setKpi("kpiBills", String(count), "kpiBillsDelta", count, priorCount, true);
  setKpi("kpiAvg", inr(avg), "kpiAvgDelta", avg, priorAvg, true);
  // For wastage, fewer is better -> invert good/bad coloring.
  setKpi("kpiWastage", String(wastage), "kpiWastageDelta", wastage, priorWastage, false);
}

function setKpi(valId, valText, deltaId, current, prior, moreIsGood) {
  document.getElementById(valId).textContent = valText;
  const el = document.getElementById(deltaId);
  if (!el) return;
  if (!prior) {
    el.textContent = "no prior data";
    el.className = "kpi-delta kpi-delta-flat";
    return;
  }
  const pct = ((current - prior) / prior) * 100;
  const up = pct >= 0;
  const arrow = up ? "▲" : "▼";
  el.textContent = `${arrow} ${Math.abs(pct).toFixed(0)}% vs prior`;
  const good = moreIsGood ? up : !up;
  el.className = "kpi-delta " + (Math.abs(pct) < 0.5 ? "kpi-delta-flat" : good ? "kpi-delta-up" : "kpi-delta-down");
}

// ── Chart helpers ───────────────────────────────────────────────────

function toggleEmpty(canvasId, emptyId, isEmpty) {
  document.getElementById(canvasId).style.display = isEmpty ? "none" : "block";
  document.getElementById(emptyId).classList.toggle("hidden", !isEmpty);
}

function draw(id, config) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), config);
}

// How many days the active range spans.
function rangeDays() {
  return Math.round((new Date(analyticsState.toDate) - new Date(analyticsState.fromDate)) / 86400000) + 1;
}
// Long ranges bucket by month so the time charts stay readable.
function isMonthly() {
  return rangeDays() > 92;
}
// Bucket key for a 'YYYY-MM-DD...' date string: month ('YYYY-MM') or day ('YYYY-MM-DD').
function bucketKey(dateStr) {
  return isMonthly() ? dateStr.slice(0, 7) : dateStr.slice(0, 10);
}
// Ordered list of bucket keys spanning the active range.
function bucketSpan() {
  const out = [];
  if (isMonthly()) {
    const d = new Date(analyticsState.fromDate);
    d.setDate(1);
    const end = new Date(analyticsState.toDate);
    while (d <= end) {
      out.push(fmt(d).slice(0, 7));
      d.setMonth(d.getMonth() + 1);
    }
  } else {
    const d = new Date(analyticsState.fromDate);
    const end = new Date(analyticsState.toDate);
    while (d <= end) {
      out.push(fmt(d));
      d.setDate(d.getDate() + 1);
    }
  }
  return out;
}
// Human label for a bucket key.
function bucketLabel(key) {
  if (key.length === 7) {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }
  return new Date(key).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const moneyTick = (v) => "₹" + Number(v).toLocaleString("en-IN");

// ── Charts ──────────────────────────────────────────────────────────

function renderSpendChart(bills) {
  const empty = bills.length === 0;
  toggleEmpty("chartSpend", "chartSpendEmpty", empty);
  if (empty) { if (charts.chartSpend) charts.chartSpend.destroy(); return; }

  const byKey = {};
  bills.forEach((b) => { const k = bucketKey(b.bill_date); byKey[k] = (byKey[k] || 0) + Number(b.total || 0); });
  const keys = bucketSpan();
  const labels = keys.map(bucketLabel);
  const data = keys.map((k) => byKey[k] || 0);

  const opts = baseLineOpts(moneyTick, (ctx) => inr(ctx.parsed.y));
  opts.onClick = () => go("purchase-register.html?status=approved");

  draw("chartSpend", {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Spend",
        data,
        borderColor: C.accent,
        backgroundColor: "rgba(230,51,42,0.08)",
        fill: true,
        tension: 0.3,
        pointRadius: labels.length > 45 ? 0 : 3,
        pointBackgroundColor: C.accent
      }]
    },
    options: opts
  });
}

function renderMovementsChart(movements) {
  const empty = movements.length === 0;
  toggleEmpty("chartMovements", "chartMovementsEmpty", empty);
  if (empty) { if (charts.chartMovements) charts.chartMovements.destroy(); return; }

  const keys = bucketSpan();
  const labels = keys.map(bucketLabel);
  const types = [
    { key: "purchase_added", label: "Purchase", color: C.ok },
    { key: "usage", label: "Usage", color: C.ink },
    { key: "wastage", label: "Wastage", color: C.bad },
    { key: "opening_stock", label: "Opening", color: C.warn },
    { key: "return_to_vendor", label: "Return", color: C.muted },
    { key: "correction", label: "Correction", color: "#2563eb" }
  ];
  const idx = Object.fromEntries(keys.map((k, i) => [k, i]));
  const series = Object.fromEntries(types.map((t) => [t.key, new Array(keys.length).fill(0)]));
  movements.forEach((m) => {
    const k = bucketKey(m.created_at);
    if (idx[k] === undefined || !series[m.movement_type]) return;
    series[m.movement_type][idx[k]] += Number(m.quantity || 0);
  });
  const present = types.filter((t) => series[t.key].some((v) => v > 0));

  draw("chartMovements", {
    type: "bar",
    data: {
      labels,
      datasets: present.map((t) => ({
        label: t.label, data: series[t.key], backgroundColor: t.color, stack: "s", borderWidth: 0
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      onClick: () => go("stock-ledger.html"),
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: tickStyle() },
        y: { stacked: true, grid: { color: C.line }, ticks: tickStyle() }
      },
      plugins: { legend: legendStyle() }
    }
  });
}

function renderCategoryChart(items) {
  const map = {};
  items.forEach((it) => {
    const cat = it.stock_items?.category || "Uncategorised";
    map[cat] = (map[cat] || 0) + Number(it.line_total || 0);
  });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const empty = entries.length === 0;
  toggleEmpty("chartCategory", "chartCategoryEmpty", empty);
  if (empty) { if (charts.chartCategory) charts.chartCategory.destroy(); return; }

  draw("chartCategory", {
    type: "doughnut",
    data: {
      labels: entries.map((e) => escapeHtml(e[0])),
      datasets: [{ data: entries.map((e) => e[1]), backgroundColor: PALETTE, borderWidth: 2, borderColor: "#fff" }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "62%",
      onClick: () => go("purchase-register.html?status=approved"),
      plugins: {
        legend: legendStyle("right"),
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${inr(ctx.parsed)}` } }
      }
    }
  });
}

function renderVendorChart(bills) {
  const map = {}; // vendor_id -> { name, total }
  bills.forEach((b) => {
    const id = b.vendor_id || "unknown";
    const name = b.vendors?.name || "Unknown";
    if (!map[id]) map[id] = { name, total: 0 };
    map[id].total += Number(b.total || 0);
  });
  const entries = Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
  const empty = entries.length === 0;
  toggleEmpty("chartVendor", "chartVendorEmpty", empty);
  if (empty) { if (charts.chartVendor) charts.chartVendor.destroy(); return; }

  clickIndex.vendorIds = entries.map((e) => e[0]);

  draw("chartVendor", {
    type: "bar",
    data: {
      labels: entries.map((e) => escapeHtml(e[1].name)),
      datasets: [{ label: "Spend", data: entries.map((e) => e[1].total), backgroundColor: C.ink, borderWidth: 0, borderRadius: 4 }]
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      onClick: (evt, els) => {
        const id = els[0] && clickIndex.vendorIds[els[0].index];
        go(id && id !== "unknown" ? `purchase-register.html?vendor_id=${encodeURIComponent(id)}` : "purchase-register.html?status=approved");
      },
      scales: { x: { grid: { color: C.line }, ticks: { ...tickStyle(), callback: moneyTick } }, y: { grid: { display: false }, ticks: tickStyle() } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => inr(ctx.parsed.x) } } }
    }
  });
}

function renderItemsChart(items) {
  const map = {}; // stock_item_id -> { name, total }
  items.forEach((it) => {
    const id = it.stock_items?.id || "unknown";
    const name = it.stock_items?.name || "Unknown";
    if (!map[id]) map[id] = { name, total: 0 };
    map[id].total += Number(it.line_total || 0);
  });
  const entries = Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
  const empty = entries.length === 0;
  toggleEmpty("chartItems", "chartItemsEmpty", empty);
  if (empty) { if (charts.chartItems) charts.chartItems.destroy(); return; }

  clickIndex.itemIds = entries.map((e) => e[0]);

  draw("chartItems", {
    type: "bar",
    data: {
      labels: entries.map((e) => escapeHtml(e[1].name)),
      datasets: [{ label: "Spend", data: entries.map((e) => e[1].total), backgroundColor: C.accent, borderWidth: 0, borderRadius: 4 }]
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      onClick: (evt, els) => {
        const id = els[0] && clickIndex.itemIds[els[0].index];
        go(id && id !== "unknown" ? `stock-ledger.html?item_id=${encodeURIComponent(id)}` : "stock-ledger.html");
      },
      scales: { x: { grid: { color: C.line }, ticks: { ...tickStyle(), callback: moneyTick } }, y: { grid: { display: false }, ticks: tickStyle() } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => inr(ctx.parsed.x) } } }
    }
  });
}

function renderStatusChart(bills) {
  const labelMap = { draft: "Draft", pending_review: "Pending", approved: "Approved", rejected: "Rejected" };
  const colorMap = { draft: C.muted, pending_review: C.warn, approved: C.ok, rejected: C.bad };
  const map = {};
  bills.forEach((b) => { map[b.status] = (map[b.status] || 0) + 1; });
  const keys = Object.keys(map);
  const empty = keys.length === 0;
  toggleEmpty("chartStatus", "chartStatusEmpty", empty);
  if (empty) { if (charts.chartStatus) charts.chartStatus.destroy(); return; }

  clickIndex.statusKeys = keys;

  draw("chartStatus", {
    type: "doughnut",
    data: {
      labels: keys.map((k) => labelMap[k] || k),
      datasets: [{ data: keys.map((k) => map[k]), backgroundColor: keys.map((k) => colorMap[k] || C.muted), borderWidth: 2, borderColor: "#fff" }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "62%",
      onClick: (evt, els) => {
        const k = els[0] && clickIndex.statusKeys[els[0].index];
        go(k ? `purchase-register.html?status=${encodeURIComponent(k)}` : "purchase-register.html");
      },
      plugins: { legend: legendStyle("right") }
    }
  });
}

// ── Shared chart styling ────────────────────────────────────────────

function tickStyle() {
  return { color: C.muted, font: { family: "Inter", size: 11 } };
}
function legendStyle(position) {
  return {
    position: position || "top", align: "start",
    labels: { color: C.ink, font: { family: "Inter", size: 12 }, boxWidth: 12, boxHeight: 12, usePointStyle: true, pointStyle: "circle", padding: 14 }
  };
}
function baseLineOpts(yTick, tooltipLabel) {
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      x: { grid: { display: false }, ticks: { ...tickStyle(), maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
      y: { grid: { color: C.line }, ticks: { ...tickStyle(), callback: yTick } }
    },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: tooltipLabel } } }
  };
}

// ── Setup error banner ──────────────────────────────────────────────

function showSetupError(msg) {
  const el = document.getElementById("setupAlert");
  if (!el) return;
  el.classList.remove("hidden");
  el.textContent = msg;
}
function hideSetupError() {
  const el = document.getElementById("setupAlert");
  if (el) { el.classList.add("hidden"); el.textContent = ""; }
}
