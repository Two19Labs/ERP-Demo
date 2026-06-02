// ── Analytics page (owner-only) ─────────────────────────────────────
// Revamped with interactive chart controls, period comparisons,
// item-level deep dives, and smart data caching.
// Charts via Chart.js v4 (CDN). Date range drives all queries.

const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYWloZHV0bXlkaWVseXB5bWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTg4MjAsImV4cCI6MjA5NDY5NDgyMH0.f_22JtIO0T3FenTxJHgO0LhFoYHH38UMg_-hJK1K0vE";

// ── Color palettes ──────────────────────────────────────────────────
// Mid-tone vibrant colors visible on both light and dark backgrounds.

const CATEGORY_COLORS = {
  "Vegetables": "#10b981",
  "Dairy": "#3b82f6",
  "Meat": "#f43f5e",
  "Dry Goods": "#f59e0b",
  "Spices": "#f97316",
  "Beverages": "#06b6d4",
  "Packaging": "#8b5cf6",
  "Cleaning": "#ec4899",
  "Other": "#64748b",
  "Uncategorised": "#94a3b8"
};

const MOVEMENT_COLORS = {
  "purchase_added": "#10b981",
  "usage": "#3b82f6",
  "wastage": "#f43f5e",
  "opening_stock": "#f59e0b",
  "return_to_vendor": "#8b5cf6",
  "correction": "#06b6d4"
};

const STATUS_COLORS = {
  "draft": "#64748b",
  "pending_review": "#f59e0b",
  "approved": "#10b981",
  "rejected": "#f43f5e"
};

const STATUS_LABELS = {
  "draft": "Draft",
  "pending_review": "Pending",
  "approved": "Approved",
  "rejected": "Rejected"
};

const CHART_PALETTE = [
  "#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#64748b", "#84cc16"
];

const C = {
  ink: "#18181b",
  muted: "#71717a",
  line: "#ececec",
  accent: "#e6332a"
};

// ── State ───────────────────────────────────────────────────────────

const state = {
  profile: null,
  fromDate: null,
  toDate: null,
  preset: "30",
  comparePrior: false,
  spendView: "total",
  usageItem: "all",
  breakdownView: "category",
  topItemsMetric: "spend",
  priceItem: ""
};

// ── Data cache (refreshed on date change, reused by dropdowns) ──────

const cache = {
  approvedBills: [],
  allBills: [],
  billItems: [],
  movements: [],
  priorApprovedBills: [],
  priorMovements: [],
  priorBillItems: [],
  stockItems: [],
  vendors: []
};

const charts = {};
const clickIndex = { vendorIds: [], itemIds: [], statusKeys: [] };

// ── Helpers ─────────────────────────────────────────────────────────

function go(url) { window.location.href = url; }

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function categoryColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS["Uncategorised"];
}

function paletteColor(i) {
  return CHART_PALETTE[i % CHART_PALETTE.length];
}

// ── Init ────────────────────────────────────────────────────────────

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

// ── Event wiring ────────────────────────────────────────────────────

function wireEvents() {
  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  // Date presets
  document.getElementById("datePresets")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".date-preset");
    if (!btn) return;
    document.querySelectorAll(".date-preset").forEach((b) => b.classList.remove("date-preset-active"));
    btn.classList.add("date-preset-active");
    applyPreset(btn.dataset.range);
  });

  // Custom date apply
  document.getElementById("applyCustom")?.addEventListener("click", () => {
    const from = document.getElementById("fromDate").value;
    const to = document.getElementById("toDate").value;
    if (!from || !to) return;
    if (from > to) {
      if (window.showToast) showToast("From date is after To date.", "error");
      return;
    }
    document.querySelectorAll(".date-preset").forEach((b) => b.classList.remove("date-preset-active"));
    state.fromDate = from;
    state.toDate = to;
    state.preset = "custom";
    syncInputs();
    loadAnalytics();
  });

  // Compare prior toggle
  document.getElementById("comparePriorToggle")?.addEventListener("change", (e) => {
    state.comparePrior = e.target.checked;
    renderSpendTrend();
    renderMonthlyComparison();
  });

  // Chart control dropdowns – each triggers only its own chart re-render
  document.getElementById("spendViewSelect")?.addEventListener("change", (e) => {
    state.spendView = e.target.value;
    renderSpendTrend();
  });

  document.getElementById("usageItemSelect")?.addEventListener("change", (e) => {
    state.usageItem = e.target.value;
    renderUsageVsWastage();
  });

  document.getElementById("breakdownViewSelect")?.addEventListener("change", (e) => {
    state.breakdownView = e.target.value;
    renderSpendBreakdown();
  });

  document.getElementById("topItemsMetric")?.addEventListener("change", (e) => {
    state.topItemsMetric = e.target.value;
    renderTopItems();
  });

  document.getElementById("priceItemSelect")?.addEventListener("change", (e) => {
    state.priceItem = e.target.value;
    renderPriceTracker();
  });
}

// ── Setup ───────────────────────────────────────────────────────────

async function setup(user) {
  document.getElementById("userEmail").textContent = user.email || "";

  const { data: profile, error } = await supabaseClient
    .from("user_access_view").select("*").eq("id", user.id).single();

  if (error || !profile) {
    showSetupError("Could not load your profile.");
    return;
  }
  state.profile = profile;

  const isOwner = profile.role_code === "owner";
  document.getElementById("userRole").textContent = isOwner ? "Owner" : "Staff";
  document.getElementById("userRole").classList.toggle("role-owner", isOwner);
  document.body.classList.add(`role-${profile.role_code}`);

  // Owner-only gate
  if (!isOwner) {
    document.getElementById("accessDenied").classList.remove("hidden");
    document.getElementById("analyticsRoot").classList.add("hidden");
    return;
  }

  document.getElementById("analyticsRoot").classList.remove("hidden");
  await loadReferenceData();
  wireKpiLinks();
  applyPreset("30"); // default range + first load
}

async function loadReferenceData() {
  const [items, vendors] = await Promise.all([
    supabaseClient.from("stock_items").select("id, name, category").eq("is_active", true).order("name"),
    supabaseClient.from("vendors").select("id, name").eq("is_active", true).order("name")
  ]);
  cache.stockItems = items.data || [];
  cache.vendors = vendors.data || [];
  populateDropdowns();
}

function populateDropdowns() {
  // Usage vs Wastage item filter
  const usageSel = document.getElementById("usageItemSelect");
  if (usageSel) {
    const frag = document.createDocumentFragment();
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All Items";
    frag.appendChild(all);
    cache.stockItems.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      frag.appendChild(opt);
    });
    usageSel.innerHTML = "";
    usageSel.appendChild(frag);
  }

  // Price tracker item select
  const priceSel = document.getElementById("priceItemSelect");
  if (priceSel) {
    const frag = document.createDocumentFragment();
    const def = document.createElement("option");
    def.value = "";
    def.textContent = "Select an item\u2026";
    frag.appendChild(def);
    cache.stockItems.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      frag.appendChild(opt);
    });
    priceSel.innerHTML = "";
    priceSel.appendChild(frag);
  }
}

// KPI cards jump to relevant pages
function wireKpiLinks() {
  const links = {
    kpiSpendCard: "purchase-register.html?status=approved",
    kpiBillsCard: "purchase-register.html?status=approved",
    kpiAvgCard: "purchase-register.html?status=approved",
    kpiWastageCard: "stock-ledger.html",
    kpiItemCountCard: "purchase-register.html?status=approved",
    kpiTopVendorCard: "purchase-register.html?status=approved"
  };
  Object.entries(links).forEach(([id, url]) => {
    const card = document.getElementById(id);
    if (!card) return;
    card.classList.add("clickable");
    card.addEventListener("click", () => go(url));
  });
}

// ── Date range helpers ──────────────────────────────────────────────

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
  state.fromDate = fmt(from);
  state.toDate = fmt(today);
  state.preset = range;
  syncInputs();
  loadAnalytics();
}

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
  document.getElementById("fromDate").value = state.fromDate;
  document.getElementById("toDate").value = state.toDate;
  const label = document.getElementById("rangeLabel");
  if (label) {
    const f = new Date(state.fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const t = new Date(state.toDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    label.textContent = `${f} — ${t}`;
  }
}

function priorRange() {
  const from = new Date(state.fromDate);
  const to = new Date(state.toDate);
  const lenDays = Math.round((to - from) / 86400000) + 1;
  const prevTo = new Date(from);
  prevTo.setDate(from.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevTo.getDate() - (lenDays - 1));
  return { from: fmt(prevFrom), to: fmt(prevTo) };
}

// ── Bucket helpers ──────────────────────────────────────────────────

function rangeDays() {
  return Math.round((new Date(state.toDate) - new Date(state.fromDate)) / 86400000) + 1;
}

function isMonthly() { return rangeDays() > 92; }

function bucketKey(dateStr) {
  return isMonthly() ? dateStr.slice(0, 7) : dateStr.slice(0, 10);
}

function bucketSpan() {
  return bucketSpanForRange(state.fromDate, state.toDate);
}

function bucketSpanForRange(fromStr, toStr) {
  const monthly = (Math.round((new Date(toStr) - new Date(fromStr)) / 86400000) + 1) > 92;
  const out = [];
  if (monthly) {
    const d = new Date(fromStr); d.setDate(1);
    const end = new Date(toStr);
    while (d <= end) { out.push(fmt(d).slice(0, 7)); d.setMonth(d.getMonth() + 1); }
  } else {
    const d = new Date(fromStr);
    const end = new Date(toStr);
    while (d <= end) { out.push(fmt(d)); d.setDate(d.getDate() + 1); }
  }
  return out;
}

function bucketKeyForRange(dateStr, fromStr, toStr) {
  const monthly = (Math.round((new Date(toStr) - new Date(fromStr)) / 86400000) + 1) > 92;
  return monthly ? dateStr.slice(0, 7) : dateStr.slice(0, 10);
}

function bucketLabel(key) {
  if (key.length === 7) {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }
  return new Date(key).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const moneyTick = (v) => "₹" + Number(v).toLocaleString("en-IN");

// ── Main data loader ────────────────────────────────────────────────

async function loadAnalytics() {
  const { fromDate, toDate } = state;
  const fromTs = `${fromDate}T00:00:00`;
  const toTs = `${toDate}T23:59:59`;
  const prior = priorRange();

  try {
    const [
      approvedBills, allBills, billItems, movements,
      priorApprovedBills, priorMovements, priorBillItems,
      alertsCount
    ] = await Promise.all([
      // 1. Approved bills in range
      supabaseClient.from("purchase_bills")
        .select("id, bill_date, total, vendor_id, vendors(name)")
        .eq("status", "approved").gte("bill_date", fromDate).lte("bill_date", toDate),
      // 2. All bills in range (status breakdown)
      supabaseClient.from("purchase_bills")
        .select("status, bill_date").gte("bill_date", fromDate).lte("bill_date", toDate),
      // 3. Approved bill items in range (category/item/price data)
      supabaseClient.from("purchase_bill_items")
        .select("stock_item_id, line_total, quantity, unit_price, stock_items(id, name, category), purchase_bills!inner(bill_date, status)")
        .eq("purchase_bills.status", "approved")
        .gte("purchase_bills.bill_date", fromDate).lte("purchase_bills.bill_date", toDate),
      // 4. Stock movements in range
      supabaseClient.from("stock_movements")
        .select("stock_item_id, created_at, movement_type, quantity")
        .gte("created_at", fromTs).lte("created_at", toTs),
      // 5. Prior period approved bills
      supabaseClient.from("purchase_bills")
        .select("id, bill_date, total, vendor_id, vendors(name)")
        .eq("status", "approved").gte("bill_date", prior.from).lte("bill_date", prior.to),
      // 6. Prior period movements
      supabaseClient.from("stock_movements")
        .select("stock_item_id, movement_type, quantity")
        .gte("created_at", `${prior.from}T00:00:00`).lte("created_at", `${prior.to}T23:59:59`),
      // 7. Prior period bill items (for monthly comparison)
      supabaseClient.from("purchase_bill_items")
        .select("stock_item_id, line_total, quantity, stock_items(category), purchase_bills!inner(bill_date, status)")
        .eq("purchase_bills.status", "approved")
        .gte("purchase_bills.bill_date", prior.from).lte("purchase_bills.bill_date", prior.to),
      // 8. Active alerts count (for nav badge)
      supabaseClient.from("bill_alerts").select("id", { count: "exact", head: true }).eq("status", "active")
    ]);

    const firstErr = [approvedBills, allBills, billItems, movements, priorApprovedBills, priorMovements, priorBillItems]
      .map((r) => r.error).find(Boolean);
    if (firstErr) throw firstErr;
    hideSetupError();

    // Update cache
    cache.approvedBills = approvedBills.data || [];
    cache.allBills = allBills.data || [];
    cache.billItems = billItems.data || [];
    cache.movements = movements.data || [];
    cache.priorApprovedBills = priorApprovedBills.data || [];
    cache.priorMovements = priorMovements.data || [];
    cache.priorBillItems = priorBillItems.data || [];

    // Alerts badge
    const badge = document.getElementById("alertsCountBadge");
    const count = alertsCount.count || 0;
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle("hidden", count === 0);
    }

    // Render everything
    renderAll();
  } catch (err) {
    console.error("Analytics load failed:", err);
    showSetupError("Could not load analytics: " + (err.message || err));
  }
}

function renderAll() {
  renderKpis();
  renderSpendTrend();
  renderUsageVsWastage();
  renderSpendBreakdown();
  renderMonthlyComparison();
  renderTopItems();
  renderPriceTracker();
  renderVendorSpend();
  renderStatusChart();
}

// ── Chart helpers ───────────────────────────────────────────────────

function toggleEmpty(canvasId, emptyId, isEmpty) {
  document.getElementById(canvasId).style.display = isEmpty ? "none" : "block";
  document.getElementById(emptyId)?.classList.toggle("hidden", !isEmpty);
}

function draw(id, config) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), config);
}

function tickStyle() {
  return { color: C.muted, font: { family: "Inter", size: 11 } };
}

function legendStyle(position) {
  return {
    position: position || "top",
    align: "start",
    labels: {
      color: C.ink, font: { family: "Inter", size: 12 },
      boxWidth: 12, boxHeight: 12, usePointStyle: true, pointStyle: "circle", padding: 14
    }
  };
}

function baseLineOpts(yTick, tooltipLabel) {
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      x: { grid: { display: false }, ticks: { ...tickStyle(), maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
      y: { grid: { color: C.line }, ticks: { ...tickStyle(), callback: yTick } }
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: tooltipLabel } }
    }
  };
}

// ── KPIs ────────────────────────────────────────────────────────────

function renderKpis() {
  const bills = cache.approvedBills;
  const movements = cache.movements;
  const priorBills = cache.priorApprovedBills;
  const priorMovements = cache.priorMovements;

  const spend = bills.reduce((s, b) => s + Number(b.total || 0), 0);
  const count = bills.length;
  const avg = count ? spend / count : 0;
  const wastage = movements.filter((m) => m.movement_type === "wastage").length;

  // Unique items purchased
  const itemIds = new Set();
  cache.billItems.forEach((it) => { if (it.stock_item_id) itemIds.add(it.stock_item_id); });
  const itemCount = itemIds.size;

  const priorItemIds = new Set();
  cache.priorBillItems.forEach((it) => { if (it.stock_item_id) priorItemIds.add(it.stock_item_id); });
  const priorItemCount = priorItemIds.size;

  // Top vendor
  const vendorMap = {};
  bills.forEach((b) => {
    const vid = b.vendor_id || "unknown";
    const vname = b.vendors?.name || "Unknown";
    if (!vendorMap[vid]) vendorMap[vid] = { name: vname, total: 0 };
    vendorMap[vid].total += Number(b.total || 0);
  });
  const topVendor = Object.values(vendorMap).sort((a, b) => b.total - a.total)[0];

  const priorSpend = priorBills.reduce((s, b) => s + Number(b.total || 0), 0);
  const priorCount = priorBills.length;
  const priorAvg = priorCount ? priorSpend / priorCount : 0;
  const priorWastage = priorMovements.filter((m) => m.movement_type === "wastage").length;

  setKpi("kpiSpend", inr(spend), "kpiSpendDelta", spend, priorSpend, true);
  setKpi("kpiBills", String(count), "kpiBillsDelta", count, priorCount, true);
  setKpi("kpiAvg", inr(avg), "kpiAvgDelta", avg, priorAvg, true);
  setKpi("kpiWastage", String(wastage), "kpiWastageDelta", wastage, priorWastage, false);
  setKpi("kpiItemCount", String(itemCount), "kpiItemCountDelta", itemCount, priorItemCount, true);

  // Top vendor (special rendering)
  document.getElementById("kpiTopVendorAmount").textContent = topVendor ? inr(topVendor.total) : "₹0";
  document.getElementById("kpiTopVendorName").textContent = topVendor ? topVendor.name : "—";
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

// ── 1. Spend Trend ──────────────────────────────────────────────────

function renderSpendTrend() {
  const view = state.spendView;
  const bills = cache.approvedBills;
  const items = cache.billItems;
  const empty = (view === "total" || view === "vendor") ? bills.length === 0 : items.length === 0;
  toggleEmpty("chartSpend", "chartSpendEmpty", empty);
  if (empty) { if (charts.chartSpend) charts.chartSpend.destroy(); return; }

  const keys = bucketSpan();
  const labels = keys.map(bucketLabel);

  let datasets = [];

  if (view === "total") {
    // Single line: total spend per day/month
    const byKey = {};
    bills.forEach((b) => {
      const k = bucketKey(b.bill_date);
      byKey[k] = (byKey[k] || 0) + Number(b.total || 0);
    });
    const data = keys.map((k) => byKey[k] || 0);
    datasets.push({
      label: "Spend",
      data,
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,0.08)",
      fill: true,
      tension: 0.3,
      pointRadius: labels.length > 45 ? 0 : 3,
      pointBackgroundColor: "#3b82f6",
      borderWidth: 2
    });

    // Prior period overlay
    if (state.comparePrior && cache.priorApprovedBills.length) {
      const prior = priorRange();
      const priorKeys = bucketSpanForRange(prior.from, prior.to);
      const priorByKey = {};
      cache.priorApprovedBills.forEach((b) => {
        const k = bucketKeyForRange(b.bill_date, prior.from, prior.to);
        priorByKey[k] = (priorByKey[k] || 0) + Number(b.total || 0);
      });
      // Map positionally: priorKeys[i] → keys[i]
      const priorData = keys.map((_, i) => {
        const pk = priorKeys[i];
        return pk != null ? (priorByKey[pk] || 0) : null;
      });
      datasets.push({
        label: "Prior period",
        data: priorData,
        borderColor: "#93c5fd",
        backgroundColor: "transparent",
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
        borderDash: [6, 4]
      });
    }
  } else if (view === "category") {
    // Multi-line: one per category
    const catMap = {}; // category -> { bucketKey -> amount }
    items.forEach((it) => {
      const cat = it.stock_items?.category || "Uncategorised";
      const k = bucketKey(it.purchase_bills?.bill_date || "");
      if (!k) return;
      if (!catMap[cat]) catMap[cat] = {};
      catMap[cat][k] = (catMap[cat][k] || 0) + Number(it.line_total || 0);
    });
    // Sort categories by total spend
    const catTotals = Object.entries(catMap).map(([cat, byKey]) => ({
      cat, total: Object.values(byKey).reduce((a, b) => a + b, 0), byKey
    })).sort((a, b) => b.total - a.total);

    catTotals.forEach((entry, i) => {
      datasets.push({
        label: entry.cat,
        data: keys.map((k) => entry.byKey[k] || 0),
        borderColor: categoryColor(entry.cat),
        backgroundColor: "transparent",
        fill: false,
        tension: 0.3,
        pointRadius: labels.length > 45 ? 0 : 2,
        pointBackgroundColor: categoryColor(entry.cat),
        borderWidth: 2
      });
    });
  } else if (view === "vendor") {
    // Multi-line: top 5 vendors
    const vendorMap = {};
    bills.forEach((b) => {
      const vname = b.vendors?.name || "Unknown";
      const k = bucketKey(b.bill_date);
      if (!vendorMap[vname]) vendorMap[vname] = { total: 0, byKey: {} };
      vendorMap[vname].total += Number(b.total || 0);
      vendorMap[vname].byKey[k] = (vendorMap[vname].byKey[k] || 0) + Number(b.total || 0);
    });
    const top5 = Object.entries(vendorMap).sort((a, b) => b[1].total - a[1].total).slice(0, 5);

    top5.forEach(([name, data], i) => {
      datasets.push({
        label: name,
        data: keys.map((k) => data.byKey[k] || 0),
        borderColor: paletteColor(i),
        backgroundColor: "transparent",
        fill: false,
        tension: 0.3,
        pointRadius: labels.length > 45 ? 0 : 2,
        pointBackgroundColor: paletteColor(i),
        borderWidth: 2
      });
    });
  }

  const opts = baseLineOpts(moneyTick, (ctx) => `${ctx.dataset.label}: ${inr(ctx.parsed.y)}`);
  opts.plugins.legend = datasets.length > 1 ? legendStyle() : { display: false };
  opts.onClick = () => go("purchase-register.html?status=approved");

  draw("chartSpend", { type: "line", data: { labels, datasets }, options: opts });
}

// ── 2. Usage vs Wastage ─────────────────────────────────────────────

function renderUsageVsWastage() {
  let movements = cache.movements.filter(
    (m) => m.movement_type === "usage" || m.movement_type === "wastage"
  );

  // Item filter
  if (state.usageItem !== "all") {
    movements = movements.filter((m) => m.stock_item_id === state.usageItem);
  }

  const empty = movements.length === 0;
  toggleEmpty("chartUsageWastage", "chartUsageWastageEmpty", empty);
  if (empty) { if (charts.chartUsageWastage) charts.chartUsageWastage.destroy(); return; }

  const keys = bucketSpan();
  const labels = keys.map(bucketLabel);
  const usageByKey = {};
  const wastageByKey = {};

  movements.forEach((m) => {
    const k = bucketKey(m.created_at);
    if (m.movement_type === "usage") {
      usageByKey[k] = (usageByKey[k] || 0) + Number(m.quantity || 0);
    } else {
      wastageByKey[k] = (wastageByKey[k] || 0) + Number(m.quantity || 0);
    }
  });

  const datasets = [
    {
      label: "Usage",
      data: keys.map((k) => usageByKey[k] || 0),
      borderColor: MOVEMENT_COLORS.usage,
      backgroundColor: "rgba(59,130,246,0.06)",
      fill: true,
      tension: 0.3,
      pointRadius: labels.length > 45 ? 0 : 3,
      pointBackgroundColor: MOVEMENT_COLORS.usage,
      borderWidth: 2
    },
    {
      label: "Wastage",
      data: keys.map((k) => wastageByKey[k] || 0),
      borderColor: MOVEMENT_COLORS.wastage,
      backgroundColor: "rgba(244,63,94,0.06)",
      fill: true,
      tension: 0.3,
      pointRadius: labels.length > 45 ? 0 : 3,
      pointBackgroundColor: MOVEMENT_COLORS.wastage,
      borderWidth: 2
    }
  ];

  const opts = baseLineOpts(
    (v) => Number(v).toLocaleString("en-IN"),
    (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString("en-IN")}`
  );
  opts.plugins.legend = legendStyle();

  draw("chartUsageWastage", { type: "line", data: { labels, datasets }, options: opts });
}

// ── 3. Spend Breakdown (Doughnut) ───────────────────────────────────

function renderSpendBreakdown() {
  const view = state.breakdownView;
  let entries = [];
  let colors = [];

  if (view === "category") {
    const map = {};
    cache.billItems.forEach((it) => {
      const cat = it.stock_items?.category || "Uncategorised";
      map[cat] = (map[cat] || 0) + Number(it.line_total || 0);
    });
    entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    colors = entries.map((e) => categoryColor(e[0]));
  } else if (view === "vendor") {
    const map = {};
    cache.approvedBills.forEach((b) => {
      const vname = b.vendors?.name || "Unknown";
      map[vname] = (map[vname] || 0) + Number(b.total || 0);
    });
    entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
    colors = entries.map((_, i) => paletteColor(i));
  } else if (view === "item") {
    const map = {};
    cache.billItems.forEach((it) => {
      const name = it.stock_items?.name || "Unknown";
      map[name] = (map[name] || 0) + Number(it.line_total || 0);
    });
    entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
    colors = entries.map((_, i) => paletteColor(i));
  }

  const empty = entries.length === 0;
  toggleEmpty("chartBreakdown", "chartBreakdownEmpty", empty);
  if (empty) { if (charts.chartBreakdown) charts.chartBreakdown.destroy(); return; }

  draw("chartBreakdown", {
    type: "doughnut",
    data: {
      labels: entries.map((e) => escapeHtml(e[0])),
      datasets: [{
        data: entries.map((e) => e[1]),
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: "#fff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      onClick: () => go("purchase-register.html?status=approved"),
      plugins: {
        legend: legendStyle("right"),
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.label}: ${inr(ctx.parsed)}` }
        }
      }
    }
  });
}

// ── 4. Monthly Comparison (Grouped Bar) ─────────────────────────────

function renderMonthlyComparison() {
  // Compare current vs prior by category spend
  const curCatMap = {};
  cache.billItems.forEach((it) => {
    const cat = it.stock_items?.category || "Uncategorised";
    curCatMap[cat] = (curCatMap[cat] || 0) + Number(it.line_total || 0);
  });

  const priorCatMap = {};
  cache.priorBillItems.forEach((it) => {
    const cat = it.stock_items?.category || "Uncategorised";
    priorCatMap[cat] = (priorCatMap[cat] || 0) + Number(it.line_total || 0);
  });

  // Merge all categories from both periods
  const allCats = [...new Set([...Object.keys(curCatMap), ...Object.keys(priorCatMap)])];
  // Sort by current spend
  allCats.sort((a, b) => (curCatMap[b] || 0) - (curCatMap[a] || 0));

  const empty = allCats.length === 0;
  toggleEmpty("chartMonthlyComparison", "chartMonthlyComparisonEmpty", empty);
  if (empty) { if (charts.chartMonthlyComparison) charts.chartMonthlyComparison.destroy(); return; }

  draw("chartMonthlyComparison", {
    type: "bar",
    data: {
      labels: allCats.map((c) => escapeHtml(c)),
      datasets: [
        {
          label: "Current period",
          data: allCats.map((c) => curCatMap[c] || 0),
          backgroundColor: "#3b82f6",
          borderWidth: 0,
          borderRadius: 4
        },
        {
          label: "Prior period",
          data: allCats.map((c) => priorCatMap[c] || 0),
          backgroundColor: "#93c5fd",
          borderWidth: 0,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: tickStyle() },
        y: { grid: { color: C.line }, ticks: { ...tickStyle(), callback: moneyTick } }
      },
      plugins: {
        legend: legendStyle(),
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${inr(ctx.parsed.y)}` }
        }
      }
    }
  });
}

// ── 5. Top Items (Horizontal Bar) ───────────────────────────────────

function renderTopItems() {
  const metric = state.topItemsMetric;
  const map = {}; // itemName -> value

  if (metric === "spend") {
    cache.billItems.forEach((it) => {
      const name = it.stock_items?.name || "Unknown";
      const id = it.stock_items?.id || "unknown";
      if (!map[name]) map[name] = { value: 0, id };
      map[name].value += Number(it.line_total || 0);
    });
  } else if (metric === "quantity") {
    cache.billItems.forEach((it) => {
      const name = it.stock_items?.name || "Unknown";
      const id = it.stock_items?.id || "unknown";
      if (!map[name]) map[name] = { value: 0, id };
      map[name].value += Number(it.quantity || 0);
    });
  } else if (metric === "frequency") {
    cache.billItems.forEach((it) => {
      const name = it.stock_items?.name || "Unknown";
      const id = it.stock_items?.id || "unknown";
      if (!map[name]) map[name] = { value: 0, id };
      map[name].value += 1;
    });
  }

  const entries = Object.entries(map).sort((a, b) => b[1].value - a[1].value).slice(0, 10);
  const empty = entries.length === 0;
  toggleEmpty("chartTopItems", "chartTopItemsEmpty", empty);
  if (empty) { if (charts.chartTopItems) charts.chartTopItems.destroy(); return; }

  clickIndex.itemIds = entries.map((e) => e[1].id);

  const isMoney = metric === "spend";
  const yTickFn = isMoney ? moneyTick : (v) => Number(v).toLocaleString("en-IN");
  const tooltipFn = isMoney ? (ctx) => inr(ctx.parsed.x) : (ctx) => Number(ctx.parsed.x).toLocaleString("en-IN");

  draw("chartTopItems", {
    type: "bar",
    data: {
      labels: entries.map((e) => escapeHtml(e[0])),
      datasets: [{
        label: metric === "spend" ? "Spend" : metric === "quantity" ? "Quantity" : "Purchases",
        data: entries.map((e) => e[1].value),
        backgroundColor: entries.map((_, i) => paletteColor(i)),
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      onClick: (evt, els) => {
        const id = els[0] && clickIndex.itemIds[els[0].index];
        go(id && id !== "unknown" ? `stock-ledger.html?item_id=${encodeURIComponent(id)}` : "stock-ledger.html");
      },
      scales: {
        x: { grid: { color: C.line }, ticks: { ...tickStyle(), callback: yTickFn } },
        y: { grid: { display: false }, ticks: tickStyle() }
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: tooltipFn } }
      }
    }
  });
}

// ── 6. Price Tracker (Line) ─────────────────────────────────────────

function renderPriceTracker() {
  const itemId = state.priceItem;

  if (!itemId) {
    toggleEmpty("chartPriceTracker", "chartPriceTrackerEmpty", true);
    if (charts.chartPriceTracker) charts.chartPriceTracker.destroy();
    return;
  }

  // Get bill items for this specific item, sorted by date
  const itemData = cache.billItems
    .filter((it) => it.stock_item_id === itemId && it.unit_price != null)
    .map((it) => ({
      date: it.purchase_bills?.bill_date,
      price: Number(it.unit_price),
      qty: Number(it.quantity || 0)
    }))
    .filter((d) => d.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  const empty = itemData.length === 0;
  toggleEmpty("chartPriceTracker", "chartPriceTrackerEmpty", empty);
  if (empty) {
    document.getElementById("chartPriceTrackerEmpty").textContent = "No price data for this item in the selected range.";
    if (charts.chartPriceTracker) charts.chartPriceTracker.destroy();
    return;
  }

  // Reset empty message
  document.getElementById("chartPriceTrackerEmpty").textContent = "Select an item to see its price history.";

  // Group by date (average price if multiple entries on same date)
  const byDate = {};
  itemData.forEach((d) => {
    if (!byDate[d.date]) byDate[d.date] = { prices: [], total: 0, count: 0 };
    byDate[d.date].prices.push(d.price);
    byDate[d.date].total += d.price;
    byDate[d.date].count += 1;
  });

  const dates = Object.keys(byDate).sort();
  const labels = dates.map((d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
  );
  const avgPrices = dates.map((d) => byDate[d].total / byDate[d].count);

  // Find the item name for the label
  const itemName = cache.stockItems.find((s) => s.id === itemId)?.name || "Item";

  draw("chartPriceTracker", {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: `${itemName} — Unit Price`,
        data: avgPrices,
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139,92,246,0.08)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#8b5cf6",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { ...tickStyle(), maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
        y: { grid: { color: C.line }, ticks: { ...tickStyle(), callback: moneyTick } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Unit price: ${inr(ctx.parsed.y)}`
          }
        }
      }
    }
  });
}

// ── 7. Vendor Spend (Horizontal Bar) ────────────────────────────────

function renderVendorSpend() {
  const map = {};
  cache.approvedBills.forEach((b) => {
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
      datasets: [{
        label: "Spend",
        data: entries.map((e) => e[1].total),
        backgroundColor: entries.map((_, i) => paletteColor(i)),
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      onClick: (evt, els) => {
        const id = els[0] && clickIndex.vendorIds[els[0].index];
        go(id && id !== "unknown"
          ? `purchase-register.html?vendor_id=${encodeURIComponent(id)}`
          : "purchase-register.html?status=approved");
      },
      scales: {
        x: { grid: { color: C.line }, ticks: { ...tickStyle(), callback: moneyTick } },
        y: { grid: { display: false }, ticks: tickStyle() }
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => inr(ctx.parsed.x) } }
      }
    }
  });
}

// ── 8. Bills by Status (Doughnut) ───────────────────────────────────

function renderStatusChart() {
  const map = {};
  cache.allBills.forEach((b) => { map[b.status] = (map[b.status] || 0) + 1; });
  const keys = Object.keys(map);

  const empty = keys.length === 0;
  toggleEmpty("chartStatus", "chartStatusEmpty", empty);
  if (empty) { if (charts.chartStatus) charts.chartStatus.destroy(); return; }

  clickIndex.statusKeys = keys;

  draw("chartStatus", {
    type: "doughnut",
    data: {
      labels: keys.map((k) => STATUS_LABELS[k] || k),
      datasets: [{
        data: keys.map((k) => map[k]),
        backgroundColor: keys.map((k) => STATUS_COLORS[k] || "#64748b"),
        borderWidth: 2,
        borderColor: "#fff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      onClick: (evt, els) => {
        const k = els[0] && clickIndex.statusKeys[els[0].index];
        go(k ? `purchase-register.html?status=${encodeURIComponent(k)}` : "purchase-register.html");
      },
      plugins: {
        legend: legendStyle("right"),
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed} bill${ctx.parsed !== 1 ? "s" : ""}`
          }
        }
      }
    }
  });
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
