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
  applyPreset("30"); // default range + first load
}

// ── Date range helpers ──────────────────────────────────────────────

function fmt(d) {
  // local date -> 'YYYY-MM-DD'
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function applyPreset(range) {
  const today = new Date();
  let from;
  if (range === "month") {
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
        .select("line_total, stock_items(name, category), purchase_bills!inner(bill_date, status)")
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

// Build a continuous list of YYYY-MM-DD between range (for time charts).
function dateSpan() {
  const out = [];
  const d = new Date(analyticsState.fromDate);
  const end = new Date(analyticsState.toDate);
  while (d <= end) {
    out.push(fmt(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const moneyTick = (v) => "₹" + Number(v).toLocaleString("en-IN");

// ── Charts ──────────────────────────────────────────────────────────

function renderSpendChart(bills) {
  const empty = bills.length === 0;
  toggleEmpty("chartSpend", "chartSpendEmpty", empty);
  if (empty) { if (charts.chartSpend) charts.chartSpend.destroy(); return; }

  const byDay = {};
  bills.forEach((b) => { byDay[b.bill_date] = (byDay[b.bill_date] || 0) + Number(b.total || 0); });
  const labels = dateSpan();
  const data = labels.map((d) => byDay[d] || 0);

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
    options: baseLineOpts(moneyTick, (ctx) => inr(ctx.parsed.y))
  });
}

function renderMovementsChart(movements) {
  const empty = movements.length === 0;
  toggleEmpty("chartMovements", "chartMovementsEmpty", empty);
  if (empty) { if (charts.chartMovements) charts.chartMovements.destroy(); return; }

  const labels = dateSpan();
  const types = [
    { key: "purchase_added", label: "Purchase", color: C.ok },
    { key: "usage", label: "Usage", color: C.ink },
    { key: "wastage", label: "Wastage", color: C.bad },
    { key: "opening_stock", label: "Opening", color: C.warn },
    { key: "return_to_vendor", label: "Return", color: C.muted },
    { key: "correction", label: "Correction", color: "#2563eb" }
  ];
  const idx = Object.fromEntries(labels.map((d, i) => [d, i]));
  const series = Object.fromEntries(types.map((t) => [t.key, new Array(labels.length).fill(0)]));
  movements.forEach((m) => {
    const day = m.created_at.slice(0, 10);
    if (idx[day] === undefined || !series[m.movement_type]) return;
    series[m.movement_type][idx[day]] += Number(m.quantity || 0);
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
      plugins: {
        legend: legendStyle("right"),
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${inr(ctx.parsed)}` } }
      }
    }
  });
}

function renderVendorChart(bills) {
  const map = {};
  bills.forEach((b) => {
    const v = b.vendors?.name || "Unknown";
    map[v] = (map[v] || 0) + Number(b.total || 0);
  });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const empty = entries.length === 0;
  toggleEmpty("chartVendor", "chartVendorEmpty", empty);
  if (empty) { if (charts.chartVendor) charts.chartVendor.destroy(); return; }

  draw("chartVendor", {
    type: "bar",
    data: {
      labels: entries.map((e) => escapeHtml(e[0])),
      datasets: [{ label: "Spend", data: entries.map((e) => e[1]), backgroundColor: C.ink, borderWidth: 0, borderRadius: 4 }]
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      scales: { x: { grid: { color: C.line }, ticks: { ...tickStyle(), callback: moneyTick } }, y: { grid: { display: false }, ticks: tickStyle() } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => inr(ctx.parsed.x) } } }
    }
  });
}

function renderItemsChart(items) {
  const map = {};
  items.forEach((it) => {
    const name = it.stock_items?.name || "Unknown";
    map[name] = (map[name] || 0) + Number(it.line_total || 0);
  });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const empty = entries.length === 0;
  toggleEmpty("chartItems", "chartItemsEmpty", empty);
  if (empty) { if (charts.chartItems) charts.chartItems.destroy(); return; }

  draw("chartItems", {
    type: "bar",
    data: {
      labels: entries.map((e) => escapeHtml(e[0])),
      datasets: [{ label: "Spend", data: entries.map((e) => e[1]), backgroundColor: C.accent, borderWidth: 0, borderRadius: 4 }]
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
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

  draw("chartStatus", {
    type: "doughnut",
    data: {
      labels: keys.map((k) => labelMap[k] || k),
      datasets: [{ data: keys.map((k) => map[k]), backgroundColor: keys.map((k) => colorMap[k] || C.muted), borderWidth: 2, borderColor: "#fff" }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: legendStyle("right") } }
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
