const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_H5hfJElwUFl-yJR35qtc2w_Fz2MfZRU";

const appState = {
  profile: null,
  setupError: "",
  records: {
    balances: [],
    recentBills: [],
    recentMovements: [],
    pendingBillsCount: 0
  }
};

let supabaseClient;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

document.addEventListener("DOMContentLoaded", async () => {
  const isLoginPage = document.getElementById("loginForm") !== null;

  if (isLoginPage) {
    setupLogin();
  }

  if (!supabaseClient) {
    renderBootError(isLoginPage, "Supabase client failed to load.");
    return;
  }

  try {
    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (isLoginPage) {
      if (session) {
        window.location.href = "dashboard.html";
      }
      return;
    }

    if (!session) {
      window.location.href = "index.html";
      return;
    }

    wireDashboardEvents();
    await setupDashboard(session.user);
  } catch (error) {
    console.error("Session bootstrap failed:", error);
    renderBootError(isLoginPage, "Could not verify the current session.");
  }
});

function renderBootError(isLoginPage, message) {
  console.error(message);

  if (isLoginPage) {
    const errorDiv = document.getElementById("loginError");
    if (errorDiv) {
      errorDiv.style.display = "block";
      errorDiv.textContent = message;
    }
    return;
  }

  const welcomeTitle = document.getElementById("welcomeTitle");
  const welcomeText = document.getElementById("welcomeText");

  if (welcomeTitle) {
    welcomeTitle.textContent = "Connection check needed";
  }

  if (welcomeText) {
    welcomeText.textContent = message;
  }
}

function setupLogin() {
  const loginBtn = document.getElementById("loginBtn");
  const errorDiv = document.getElementById("loginError");

  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    errorDiv.style.display = "none";

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      errorDiv.style.display = "block";
      errorDiv.textContent = error.message;
      return;
    }

    window.location.href = "dashboard.html";
  });
}

function wireDashboardEvents() {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  document.getElementById("closeOnboardingBtn")?.addEventListener("click", () => {
    document.getElementById("onboardingGuide").classList.add("hidden");
  });
}

async function setupDashboard(user) {
  document.getElementById("userEmail").textContent = user.email || "";

  const profile = await fetchCurrentUserProfile(user.id);

  if (!profile) {
    renderMissingProfileState();
    return;
  }

  appState.profile = profile;

  renderAccessCopy();
  await loadDashboardData();
}

async function fetchCurrentUserProfile(userId) {
  const { data, error } = await supabaseClient
    .from("user_access_view")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return data;
}

function renderMissingProfileState() {
  document.getElementById("userRole").textContent = "Needs setup";
  document.getElementById("welcomeTitle").textContent = "Profile missing";
  document.getElementById("welcomeText").textContent =
    "Add a matching row in public.users for this auth user, then reload the page.";
}

function renderAccessCopy() {
  const profile = appState.profile;
  if (!profile) {
    return;
  }

  const isOwner = profile.role_code === "owner";
  const roleLabel = isOwner ? "Owner" : "Staff";

  document.body.classList.add(`role-${profile.role_code}`);
  document.getElementById("userRole").textContent = roleLabel;

  if (isOwner) {
    document.getElementById("welcomeTitle").textContent = "Welcome back, Owner";
    document.getElementById("welcomeText").textContent =
      "Monitor stock levels, review recent purchase bills, and verify automated ledger status updates.";
  } else {
    document.getElementById("welcomeTitle").textContent = "Staff stock dashboard";
    document.getElementById("welcomeText").textContent =
      "View active warnings and stock records. Use the Purchase Register tab to submit new bills.";
  }
}

async function loadDashboardData() {
  try {
    // 1. Fetch current stock balances
    const { data: balances, error: err1 } = await supabaseClient
      .from("stock_item_balances")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    // 2. Fetch last purchase rate for each item to compute valuation
    const { data: ratesData, error: err2 } = await supabaseClient
      .from("purchase_bill_items")
      .select("stock_item_id, unit_price, purchase_bills!inner(bill_date, status)")
      .eq("purchase_bills.status", "approved");

    // 3. Fetch count of pending review/draft bills
    const { count: pendingBillsCount, error: err3 } = await supabaseClient
      .from("purchase_bills")
      .select("*", { count: "exact", head: true })
      .in("status", ["draft", "pending_review"]);

    // 4. Fetch last 5 purchase bills
    const { data: recentBills, error: err4 } = await supabaseClient
      .from("purchase_bills")
      .select("id, bill_number, bill_date, total, status, vendors(name)")
      .order("created_at", { ascending: false })
      .limit(5);

    // 5. Fetch last 10 movements
    const { data: recentMovements, error: err5 } = await supabaseClient
      .from("stock_movements")
      .select("created_at, quantity, unit, movement_type, notes, stock_items(name)")
      .order("created_at", { ascending: false })
      .limit(10);

    appState.records.balances = balances || [];
    appState.records.recentBills = recentBills || [];
    appState.records.recentMovements = recentMovements || [];
    appState.records.pendingBillsCount = pendingBillsCount || 0;

    appState.setupError = (err1 || err2 || err3 || err4 || err5)?.message || "";
    renderSetupAlert();

    // Process rates to find last price for each stock item
    const lastRates = {};
    if (ratesData && ratesData.length > 0) {
      const sortedRates = [...ratesData].sort((a, b) => {
        const dateA = new Date(a.purchase_bills.bill_date);
        const dateB = new Date(b.purchase_bills.bill_date);
        return dateB - dateA;
      });
      sortedRates.forEach((row) => {
        if (lastRates[row.stock_item_id] === undefined) {
          lastRates[row.stock_item_id] = Number(row.unit_price);
        }
      });
    }

    // Render stock valuation
    let totalValuation = 0;
    appState.records.balances.forEach((item) => {
      const qty = Number(item.current_quantity);
      const rate = lastRates[item.stock_item_id] || 0;
      if (qty > 0) {
        totalValuation += qty * rate;
      }
    });

    document.getElementById("valuationDisplay").textContent = `₹${totalValuation.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

    // Render metrics
    const lowStockItems = appState.records.balances.filter((x) => x.is_low_stock);
    document.getElementById("lowStockCountDisplay").textContent = String(lowStockItems.length);
    document.getElementById("pendingBillsDisplay").textContent = String(appState.records.pendingBillsCount);

    // Render lists
    renderLowStockTable(lowStockItems);
    renderRecentPurchasesTable();
    renderRecentMovementsTable();
  } catch (e) {
    console.error(e);
    appState.setupError = "Could not fetch dashboard metrics: " + e.message;
    renderSetupAlert();
  }
}

function renderSetupAlert() {
  const alert = document.getElementById("setupAlert");
  if (!alert) return;

  if (!appState.setupError) {
    alert.classList.add("hidden");
    alert.textContent = "";
    return;
  }

  alert.classList.remove("hidden");
  alert.textContent = "Data load error: " + appState.setupError;
}

function renderLowStockTable(lowStockItems) {
  const body = document.getElementById("lowStockBody");
  if (!body) return;

  if (lowStockItems.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="summary-empty" style="text-align: center; padding: 30px 10px; color: var(--emerald);">
          ✓ All stock items are healthy and above their warning thresholds.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = lowStockItems
    .map((item) => {
      const stockQty = Number(item.current_quantity);
      const threshold = Number(item.low_stock_threshold);
      const statusPill = stockQty <= 0 
        ? `<span class="record-pill record-pill-rejected" style="font-size: 0.7rem; padding: 2px 6px;">Out of Stock</span>`
        : `<span class="record-pill record-pill-pending" style="font-size: 0.7rem; padding: 2px 6px;">Low Stock</span>`;

      return `
      <tr>
        <td style="padding: 10px 4px;"><strong>${item.name}</strong></td>
        <td style="padding: 10px 4px; color: var(--clay);">${item.category}</td>
        <td style="padding: 10px 4px; text-align: right; font-weight: bold; color: var(--crimson);">${stockQty.toFixed(3)}</td>
        <td style="padding: 10px 4px; text-align: right; color: var(--clay);">${threshold.toFixed(3)}</td>
        <td style="padding: 10px 4px; color: var(--clay);">${item.default_unit}</td>
        <td style="padding: 10px 4px; text-align: center;">${statusPill}</td>
      </tr>
    `;
    })
    .join("");
}

function renderRecentPurchasesTable() {
  const body = document.getElementById("recentPurchasesBody");
  if (!body) return;

  if (appState.records.recentBills.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="4" class="summary-empty" style="text-align: center; padding: 30px 10px;">No purchase bills found.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = appState.records.recentBills
    .map((bill) => {
      let badgeClass = "record-pill-muted";
      let statusText = "Draft";

      if (bill.status === "approved") {
        badgeClass = "record-pill-live";
        statusText = "Approved";
      } else if (bill.status === "pending_review") {
        badgeClass = "record-pill-pending";
        statusText = "Pending";
      } else if (bill.status === "rejected") {
        badgeClass = "record-pill-rejected";
        statusText = "Rejected";
      }

      const formattedDate = new Date(bill.bill_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short"
      });

      return `
      <tr>
        <td style="padding: 10px 4px;">${formattedDate}</td>
        <td style="padding: 10px 4px;"><strong>${bill.vendors?.name || "Unknown"}</strong></td>
        <td style="padding: 10px 4px; text-align: right; font-weight: 500;">₹${bill.total.toFixed(2)}</td>
        <td style="padding: 10px 4px; text-align: center;">
          <span class="record-pill ${badgeClass}" style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">${statusText}</span>
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderRecentMovementsTable() {
  const body = document.getElementById("recentMovementsBody");
  if (!body) return;

  if (appState.records.recentMovements.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="summary-empty" style="text-align: center; padding: 30px 10px;">No stock movements recorded yet.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = appState.records.recentMovements
    .map((m) => {
      const dateObj = new Date(m.created_at);
      const timeStr = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      const dateStr = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const timestamp = `${dateStr} ${timeStr}`;

      let typeClass = "record-pill-muted";
      let typeText = m.movement_type;

      if (m.movement_type === "purchase_added") {
        typeClass = "record-pill-live";
        typeText = "Purchase";
      } else if (m.movement_type === "usage") {
        typeClass = "record-pill-muted";
        typeText = "Usage";
      } else if (m.movement_type === "wastage") {
        typeClass = "record-pill-rejected";
        typeText = "Wastage";
      } else if (m.movement_type === "opening_stock") {
        typeClass = "record-pill-pending";
        typeText = "Opening";
      } else if (m.movement_type === "return_to_vendor") {
        typeClass = "record-pill-rejected";
        typeText = "Return";
      } else if (m.movement_type === "correction") {
        typeClass = "record-pill-pending";
        typeText = "Correction";
      }

      const qty = Number(m.quantity);
      // Format with '+' or '-' sign based on movement type direction
      const isNegative = ["usage", "wastage", "return_to_vendor"].includes(m.movement_type);
      const sign = isNegative ? "-" : "+";
      const qtyColor = isNegative ? "var(--crimson)" : "var(--emerald)";

      return `
      <tr>
        <td style="padding: 10px 4px; font-size: 0.85rem; color: var(--clay);">${timestamp}</td>
        <td style="padding: 10px 4px;"><strong>${m.stock_items?.name || "Unknown"}</strong></td>
        <td style="padding: 10px 4px; text-align: center;">
          <span class="record-pill ${typeClass}" style="font-size: 0.7rem; padding: 2px 6px;">${typeText}</span>
        </td>
        <td style="padding: 10px 4px; text-align: right; font-weight: bold; color: ${qtyColor};">${sign}${qty.toFixed(3)}</td>
        <td style="padding: 10px 4px; color: var(--clay);">${m.unit}</td>
        <td style="padding: 10px 4px; font-size: 0.85rem; color: var(--ink);">${m.notes || ""}</td>
      </tr>
    `;
    })
    .join("");
}
