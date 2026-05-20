const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_H5hfJElwUFl-yJR35qtc2w_Fz2MfZRU";

const appState = {
  profile: null,
  currentTab: "stock_items",
  selectedRecordId: null,
  setupError: "",
  records: {
    stock_items: [],
    vendors: []
  }
};

let supabaseClient;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabaseClient) {
    renderBootError("Supabase client failed to load.");
    return;
  }

  try {
    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
      window.location.href = "index.html";
      return;
    }

    wireDashboardEvents();
    await setupDashboard(session.user);
  } catch (error) {
    console.error("Session bootstrap failed:", error);
    renderBootError("Could not verify the current session.");
  }
});

function renderBootError(message) {
  console.error(message);
  const welcomeTitle = document.getElementById("welcomeTitle");
  const welcomeText = document.getElementById("welcomeText");
  if (welcomeTitle) {
    welcomeTitle.textContent = "Connection check needed";
  }
  if (welcomeText) {
    welcomeText.textContent = message;
  }
}

function wireDashboardEvents() {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  document.getElementById("stockItemForm")?.addEventListener("submit", saveStockItem);
  document.getElementById("vendorForm")?.addEventListener("submit", saveVendor);
  document.getElementById("stockItemResetBtn")?.addEventListener("click", resetStockItemForm);
  document.getElementById("vendorResetBtn")?.addEventListener("click", resetVendorForm);

  document.getElementById("closeOnboardingBtn")?.addEventListener("click", () => {
    document.getElementById("onboardingGuide").classList.add("hidden");
  });

  document.getElementById("addRecordBtn")?.addEventListener("click", () => {
    if (appState.profile?.role_code !== "owner") return;
    appState.selectedRecordId = null;
    renderListPanel();
    if (appState.currentTab === "stock_items") {
      resetStockItemForm();
      showForm("stock_items");
    } else {
      resetVendorForm();
      showForm("vendors");
    }
  });

  // Prevent accidental changes to number inputs via mouse wheel scrolling
  window.addEventListener("wheel", () => {
    if (document.activeElement && document.activeElement.type === "number") {
      document.activeElement.blur();
    }
  });

  // Wire detail tabs
  document.getElementById("detailTabConfig")?.addEventListener("click", () => switchDetailTab("config"));
  document.getElementById("detailTabHistory")?.addEventListener("click", () => switchDetailTab("history"));
}

function showForm(tab) {
  document.getElementById("detailsPlaceholder")?.classList.add("hidden");
  const forms = {
    stock_items: document.getElementById("stockItemForm"),
    vendors: document.getElementById("vendorForm")
  };
  Object.entries(forms).forEach(([key, form]) => {
    if (form) {
      if (key === tab) {
        form.classList.remove("hidden");
      } else {
        form.classList.add("hidden");
      }
    }
  });
}

function showPlaceholder() {
  document.getElementById("detailsPlaceholder")?.classList.remove("hidden");
  document.getElementById("stockItemForm")?.classList.add("hidden");
  document.getElementById("vendorForm")?.classList.add("hidden");
  document.getElementById("detailTabs")?.classList.add("hidden");
  document.getElementById("historyContainer")?.classList.add("hidden");
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
  await loadMasterData();
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
  document.getElementById("welcomeTitle").textContent = "Your auth user exists, but the app profile is missing";
  document.getElementById("welcomeText").textContent =
    "Add a matching row in public.users for this auth user, then reload the page.";
  document.getElementById("stockItemCountValue").textContent = "0";
  document.getElementById("vendorCountValue").textContent = "0";
  document.getElementById("listBody").innerHTML =
    '<p class="summary-empty">No matching row found in public.users.</p>';
}

function renderAccessCopy() {
  const profile = appState.profile;
  if (!profile) {
    return;
  }

  const isOwner = profile.role_code === "owner";
  document.body.classList.add(`role-${profile.role_code}`);
  document.getElementById("userRole").textContent = isOwner ? "Owner" : "Staff";
  document.getElementById("workspaceBadge").textContent = isOwner ? "Owner setup mode" : "Staff setup mode";

  if (isOwner) {
    document.getElementById("welcomeTitle").textContent = "Set up stock items and approved suppliers";
    document.getElementById("welcomeText").textContent =
      "Keep the item and supplier lists clean so bills can be checked before they affect stock.";
  } else {
    const badge = document.getElementById("managerOutletBadge");
    if (badge) {
      badge.classList.remove("hidden");
      badge.textContent = profile.full_name || "Staff access";
    }
    document.getElementById("welcomeTitle").textContent = "Stock setup for bill capture";
    document.getElementById("welcomeText").textContent =
      "Staff can view suppliers and stock records, with owner controls added for edits.";
  }

  document.getElementById("sidebarScope").textContent = isOwner
    ? "Owner maintains the stock master and approved supplier list."
    : "Staff views stock records and approved suppliers.";
}

async function loadMasterData() {
  const queries = await Promise.all([fetchStockItems(), fetchVendors()]);
  appState.records.stock_items = queries[0].data;
  appState.records.vendors = queries[1].data;
  appState.setupError = queries.find((query) => query.error)?.error?.message || "";
  updateSummaryCounts();
  renderSetupAlert();
  renderCurrentTab();
}

async function fetchStockItems() {
  const { data, error } = await supabaseClient
    .from("stock_items")
    .select("id, name, category, default_unit, low_stock_threshold, is_active, notes")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  return { data: data || [], error };
}

async function fetchVendors() {
  const { data, error } = await supabaseClient
    .from("vendors")
    .select("id, name, contact_name, phone, category_supplied, notes, is_active")
    .order("name", { ascending: true });
  return { data: data || [], error };
}

function updateSummaryCounts() {
  document.getElementById("stockItemCountValue").textContent = String(appState.records.stock_items.length);
  document.getElementById("vendorCountValue").textContent = String(appState.records.vendors.length);
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
  alert.textContent =
    "Stock setup tables are not ready in Supabase yet. Latest error: " +
    appState.setupError;
}

function switchTab(tabName) {
  appState.currentTab = tabName;
  appState.selectedRecordId = null;
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("tab-button-active", button.dataset.tab === tabName);
  });
  resetStockItemForm();
  resetVendorForm();
  renderCurrentTab();
}

function renderCurrentTab() {
  renderFormPanel();
  renderListPanel();
}

function renderFormPanel() {
  const isOwner = appState.profile?.role_code === "owner";
  const tab = appState.currentTab;
  const tabConfig = {
    stock_items: {
      title: "Stock item details",
      eyebrow: "Stock master",
      hint: isOwner ? "Keep item names, categories, and thresholds clean so bills are easy to verify." : "Stock items are controlled by the owner.",
      editable: isOwner
    },
    vendors: {
      title: "Vendor details",
      eyebrow: "Approved supplier list",
      hint: isOwner
        ? "Approved suppliers help the owner spot unknown or suspicious bills."
        : "Suppliers are controlled by the owner.",
      editable: isOwner
    }
  }[tab];

  document.getElementById("formTitle").textContent = tabConfig.title;
  document.getElementById("formEyebrow").textContent = tabConfig.eyebrow;
  document.getElementById("formHint").textContent = tabConfig.hint;

  const placeholderText = document.getElementById("placeholderText");
  if (placeholderText) {
    placeholderText.textContent = tab === "stock_items"
      ? "Select a stock item from the list to view and edit details, or click the button above the list to create a new one."
      : "Select a vendor from the list to view and edit details, or click the button above the list to create a new one.";
  }

  const addRecordBtn = document.getElementById("addRecordBtn");
  if (addRecordBtn) {
    addRecordBtn.textContent = tab === "stock_items" ? "+ New Stock Item" : "+ New Vendor";
    addRecordBtn.style.display = isOwner ? "inline-flex" : "none";
  }

  const forms = {
    stock_items: document.getElementById("stockItemForm"),
    vendors: document.getElementById("vendorForm")
  };

  Object.entries(forms).forEach(([key, form]) => {
    if (form) {
      const shouldDisable = !isOwner;
      form.querySelectorAll("input, select, textarea, button").forEach((element) => {
        element.disabled = shouldDisable;
      });
    }
  });
}

function renderListPanel() {
  const tab = appState.currentTab;
  const listBody = document.getElementById("listBody");
  const listEyebrow = document.getElementById("listEyebrow");
  const listTitle = document.getElementById("listTitle");

  const configs = {
    stock_items: { eyebrow: "Stock master", title: "Stock items", records: appState.records.stock_items, renderer: renderStockItemCard },
    vendors: { eyebrow: "Approved supplier list", title: "Vendors", records: appState.records.vendors, renderer: renderVendorCard }
  };

  const config = configs[tab];
  listEyebrow.textContent = config.eyebrow;
  listTitle.textContent = config.title;

  if (!config.records.length) {
    listBody.innerHTML = '<p class="summary-empty">No records yet.</p>';
    return;
  }

  listBody.innerHTML = config.records.map(config.renderer).join("");
}

window.selectRecord = function (type, id) {
  appState.selectedRecordId = id;
  
  const detailTabs = document.getElementById("detailTabs");
  if (detailTabs) {
    detailTabs.classList.remove("hidden");
    const historyBtn = document.getElementById("detailTabHistory");
    if (historyBtn) {
      historyBtn.textContent = type === "stock_item" ? "Price History" : "Purchase History";
    }
  }

  if (type === "stock_item") {
    populateStockItemForm(id);
    showForm("stock_items");
  } else {
    populateVendorForm(id);
    showForm("vendors");
  }
  
  switchDetailTab("config");
  renderListPanel();
};

function renderStockItemCard(item) {
  const isOwner = appState.profile?.role_code === "owner";
  const actionText = isOwner ? "Edit" : "View";
  const isSelected = appState.selectedRecordId === item.id;
  const statusClass = item.is_active ? "record-pill-live" : "record-pill-muted";
  const statusText = item.is_active ? "Active" : "Inactive";

  return `
    <article class="record-card ${isSelected ? 'record-card-selected' : ''}" onclick="window.selectRecord('stock_item', '${item.id}')">
      <div class="record-main" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; width: 100%;">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 6px 0; font-size: 1rem; font-weight: 700; color: var(--ink);">${item.name}</h4>
          <p style="margin: 0; font-size: 0.85rem; color: var(--clay); line-height: 1.4;">
            <span style="font-weight: 600; color: var(--saffron);">${item.category}</span> &bull; Base Unit: <strong>${item.default_unit}</strong> &bull; Alert at: <strong>${item.low_stock_threshold}</strong>
          </p>
          ${item.notes ? `<small style="color: var(--clay); display: block; margin-top: 6px; font-size: 0.78rem; opacity: 0.85; line-height: 1.3;">${item.notes}</small>` : ""}
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; shrink: 0;">
          <span class="record-pill ${statusClass}" style="font-size: 0.72rem; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(0, 0, 0, 0.05);">${statusText}</span>
          <span class="btn btn-outline btn-small" style="font-size: 0.72rem; padding: 4px 8px; height: auto; border-radius: 4px; pointer-events: none;">${actionText}</span>
        </div>
      </div>
    </article>
  `;
}

function renderVendorCard(vendor) {
  const isOwner = appState.profile?.role_code === "owner";
  const actionText = isOwner ? "Edit" : "View";
  const isSelected = appState.selectedRecordId === vendor.id;
  const secondaryLine = [vendor.contact_name, vendor.phone].filter(Boolean).join(" &bull; ");
  const statusClass = vendor.is_active ? "record-pill-live" : "record-pill-muted";
  const statusText = vendor.is_active ? "Active" : "Inactive";

  return `
    <article class="record-card ${isSelected ? 'record-card-selected' : ''}" onclick="window.selectRecord('vendor', '${vendor.id}')">
      <div class="record-main" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; width: 100%;">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 6px 0; font-size: 1rem; font-weight: 700; color: var(--ink);">${vendor.name}</h4>
          ${secondaryLine ? `<p style="margin: 0 0 4px 0; font-size: 0.85rem; color: var(--clay); line-height: 1.4;">${secondaryLine}</p>` : ""}
          ${vendor.category_supplied ? `<small style="display: block; margin-top: 4px; font-size: 0.78rem; color: var(--leaf); font-weight: 600;">Supplies: ${vendor.category_supplied}</small>` : ""}
          ${vendor.notes ? `<small style="color: var(--clay); display: block; margin-top: 6px; font-size: 0.78rem; opacity: 0.85; line-height: 1.3;">${vendor.notes}</small>` : ""}
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; shrink: 0;">
          <span class="record-pill ${statusClass}" style="font-size: 0.72rem; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(0, 0, 0, 0.05);">${statusText}</span>
          <span class="btn btn-outline btn-small" style="font-size: 0.72rem; padding: 4px 8px; height: auto; border-radius: 4px; pointer-events: none;">${actionText}</span>
        </div>
      </div>
    </article>
  `;
}

function populateStockItemForm(id) {
  const record = appState.records.stock_items.find((item) => item.id === id);
  if (!record) return;
  document.getElementById("stockItemId").value = record.id;
  document.getElementById("stockItemName").value = record.name;
  document.getElementById("stockItemCategory").value = record.category;
  document.getElementById("stockItemDefaultUnit").value = record.default_unit;
  document.getElementById("stockItemLowStockThreshold").value = record.low_stock_threshold;
  document.getElementById("stockItemIsActive").checked = record.is_active;
  document.getElementById("stockItemNotes").value = record.notes || "";
}

function populateVendorForm(id) {
  const record = appState.records.vendors.find((item) => item.id === id);
  if (!record) return;
  document.getElementById("vendorId").value = record.id;
  document.getElementById("vendorName").value = record.name;
  document.getElementById("vendorContactName").value = record.contact_name || "";
  document.getElementById("vendorPhone").value = record.phone || "";
  document.getElementById("vendorCategorySupplied").value = record.category_supplied || "";
  document.getElementById("vendorNotes").value = record.notes || "";
  document.getElementById("vendorIsActive").checked = record.is_active;
}

function resetStockItemForm() {
  document.getElementById("stockItemForm").reset();
  document.getElementById("stockItemId").value = "";
  document.getElementById("stockItemIsActive").checked = true;
  appState.selectedRecordId = null;
  document.getElementById("detailTabs")?.classList.add("hidden");
  document.getElementById("historyContainer")?.classList.add("hidden");
  showPlaceholder();
  renderListPanel();
}

function resetVendorForm() {
  document.getElementById("vendorForm").reset();
  document.getElementById("vendorId").value = "";
  document.getElementById("vendorIsActive").checked = true;
  appState.selectedRecordId = null;
  document.getElementById("detailTabs")?.classList.add("hidden");
  document.getElementById("historyContainer")?.classList.add("hidden");
  showPlaceholder();
  renderListPanel();
}

function switchDetailTab(tab) {
  appState.activeDetailTab = tab;
  
  const configBtn = document.getElementById("detailTabConfig");
  const historyBtn = document.getElementById("detailTabHistory");
  
  configBtn?.classList.toggle("tab-button-active", tab === "config");
  historyBtn?.classList.toggle("tab-button-active", tab === "history");
  
  const historyContainer = document.getElementById("historyContainer");
  const stockItemForm = document.getElementById("stockItemForm");
  const vendorForm = document.getElementById("vendorForm");
  
  if (tab === "config") {
    historyContainer?.classList.add("hidden");
    if (appState.currentTab === "stock_items") {
      stockItemForm?.classList.remove("hidden");
      vendorForm?.classList.add("hidden");
    } else {
      vendorForm?.classList.remove("hidden");
      stockItemForm?.classList.add("hidden");
    }
  } else {
    stockItemForm?.classList.add("hidden");
    vendorForm?.classList.add("hidden");
    historyContainer?.classList.remove("hidden");
    
    if (appState.currentTab === "stock_items") {
      renderStockItemHistory(appState.selectedRecordId);
    } else {
      renderVendorHistory(appState.selectedRecordId);
    }
  }
}

async function renderStockItemHistory(stockItemId) {
  const container = document.getElementById("historyContainer");
  container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--clay);">Loading price history...</div>';

  try {
    const { data, error } = await supabaseClient
      .from("purchase_bill_items")
      .select(`
        id,
        quantity,
        unit,
        unit_price,
        line_total,
        purchase_bills!inner (
          bill_date,
          bill_number,
          status,
          vendors (
            id,
            name
          )
        )
      `)
      .eq("stock_item_id", stockItemId)
      .eq("purchase_bills.status", "approved");

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="placeholder-view" style="padding: 30px 15px;">
          <div class="placeholder-icon" style="font-size: 2.5rem; margin-bottom: 10px;">📈</div>
          <h4 style="margin: 0 0 6px 0; font-size: 1.05rem; color: var(--ink);">No approved purchases yet</h4>
          <p style="margin: 0; font-size: 0.85rem; color: var(--clay); max-width: 280px; line-height: 1.4;">Approved purchase bills containing this stock item will populate price history and trends.</p>
        </div>
      `;
      return;
    }

    const sortedTimeline = [...data].sort((a, b) => new Date(a.purchase_bills.bill_date) - new Date(b.purchase_bills.bill_date));
    const recentTimeline = [...data].sort((a, b) => new Date(b.purchase_bills.bill_date) - new Date(a.purchase_bills.bill_date));

    const unitPrices = data.map(d => d.unit_price);
    const lastPurchase = recentTimeline[0];
    const lastPrice = lastPurchase.unit_price;
    const lastDate = lastPurchase.purchase_bills.bill_date;
    const lastVendor = lastPurchase.purchase_bills.vendors?.name || "Unknown";

    const totalQty = data.reduce((sum, d) => sum + d.quantity, 0);
    const totalSpent = data.reduce((sum, d) => sum + d.line_total, 0);
    const avgPrice = totalQty > 0 ? (totalSpent / totalQty) : 0;

    const minPrice = Math.min(...unitPrices);
    const maxPrice = Math.max(...unitPrices);

    const vendorMap = {};
    data.forEach(item => {
      const vendorName = item.purchase_bills.vendors?.name || "Unknown";
      if (!vendorMap[vendorName]) {
        vendorMap[vendorName] = {
          name: vendorName,
          totalQty: 0,
          totalSpent: 0,
          minPrice: item.unit_price,
          maxPrice: item.unit_price,
          lastPrice: item.unit_price,
          lastDate: item.purchase_bills.bill_date
        };
      }
      const vendor = vendorMap[vendorName];
      vendor.totalQty += item.quantity;
      vendor.totalSpent += item.line_total;
      vendor.minPrice = Math.min(vendor.minPrice, item.unit_price);
      vendor.maxPrice = Math.max(vendor.maxPrice, item.unit_price);
      
      if (new Date(item.purchase_bills.bill_date) >= new Date(vendor.lastDate)) {
        vendor.lastPrice = item.unit_price;
        vendor.lastDate = item.purchase_bills.bill_date;
      }
    });

    const vendorComparison = Object.values(vendorMap);

    let html = `
      <div class="status-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 15px;">
        <article class="status-card" style="padding: 10px;">
          <p class="card-label" style="font-size: 0.72rem; margin-bottom: 2px;">Last Price</p>
          <strong style="font-size: 1.15rem; color: var(--ink);">₹${lastPrice.toFixed(2)}</strong>
          <span style="font-size: 0.68rem; color: var(--clay); display: block; margin-top: 4px; line-height: 1.2;">
            ${lastVendor}<br/>on ${lastDate}
          </span>
        </article>
        <article class="status-card" style="padding: 10px;">
          <p class="card-label" style="font-size: 0.72rem; margin-bottom: 2px;">Weighted Avg</p>
          <strong style="font-size: 1.15rem; color: var(--leaf);">₹${avgPrice.toFixed(2)}</strong>
          <span style="font-size: 0.68rem; color: var(--clay); display: block; margin-top: 4px; line-height: 1.2;">
            Across ${totalQty.toFixed(1)} ${lastPurchase.unit}s purchased
          </span>
        </article>
        <article class="status-card" style="padding: 10px;">
          <p class="card-label" style="font-size: 0.72rem; margin-bottom: 2px;">Price Range</p>
          <strong style="font-size: 1.1rem; color: var(--saffron);">₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}</strong>
          <span style="font-size: 0.68rem; color: var(--clay); display: block; margin-top: 4px; line-height: 1.2;">
            Min/Max paid historically
          </span>
        </article>
      </div>
    `;

    if (sortedTimeline.length > 1) {
      html += `
        <div class="panel panel-soft" style="margin-bottom: 15px; padding: 12px; background: rgba(255, 255, 255, 0.4);">
          <h4 style="margin: 0 0 10px 0; font-size: 0.82rem; font-weight: 700; color: var(--ink);">Price Trend Over Time (₹ per ${lastPurchase.unit})</h4>
          <div style="width: 100%; height: 110px; position: relative;">
            ${generatePriceTrendSVG(sortedTimeline)}
          </div>
        </div>
      `;
    }

    html += `
      <div class="panel panel-soft" style="margin-bottom: 15px; padding: 12px; background: rgba(255, 255, 255, 0.4);">
        <h4 style="margin: 0 0 10px 0; font-size: 0.82rem; font-weight: 700; color: var(--ink);">Vendor Price Comparison</h4>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--line); color: var(--clay); font-weight: 600;">
                <th style="padding: 6px 4px;">Vendor</th>
                <th style="padding: 6px 4px; text-align: right;">Last Price</th>
                <th style="padding: 6px 4px; text-align: right;">Avg Price</th>
                <th style="padding: 6px 4px; text-align: right;">Min Price</th>
                <th style="padding: 6px 4px; text-align: right;">Max Price</th>
              </tr>
            </thead>
            <tbody>
              ${vendorComparison.map(vc => `
                <tr style="border-bottom: 1px solid var(--line);">
                  <td style="padding: 6px 4px; font-weight: 500; color: var(--ink);">${vc.name}</td>
                  <td style="padding: 6px 4px; text-align: right; color: var(--ink); font-weight: 600;">₹${vc.lastPrice.toFixed(2)}</td>
                  <td style="padding: 6px 4px; text-align: right; color: var(--leaf);">₹${(vc.totalSpent / vc.totalQty).toFixed(2)}</td>
                  <td style="padding: 6px 4px; text-align: right; color: var(--clay);">₹${vc.minPrice.toFixed(2)}</td>
                  <td style="padding: 6px 4px; text-align: right; color: var(--clay);">₹${vc.maxPrice.toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    html += `
      <div class="panel panel-soft" style="padding: 12px; background: rgba(255, 255, 255, 0.4);">
        <h4 style="margin: 0 0 10px 0; font-size: 0.82rem; font-weight: 700; color: var(--ink);">Purchase Timeline</h4>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--line); color: var(--clay); font-weight: 600;">
                <th style="padding: 6px 4px;">Date</th>
                <th style="padding: 6px 4px;">Vendor</th>
                <th style="padding: 6px 4px; text-align: right;">Qty</th>
                <th style="padding: 6px 4px; text-align: right;">Price</th>
                <th style="padding: 6px 4px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${recentTimeline.slice(0, 10).map(t => `
                <tr style="border-bottom: 1px solid var(--line);">
                  <td style="padding: 6px 4px; color: var(--ink); font-weight: 500;">${t.purchase_bills.bill_date}</td>
                  <td style="padding: 6px 4px; color: var(--clay);">${t.purchase_bills.vendors?.name || "Unknown"}</td>
                  <td style="padding: 6px 4px; text-align: right; color: var(--ink);">${t.quantity} ${t.unit}</td>
                  <td style="padding: 6px 4px; text-align: right; color: var(--ink); font-weight: 500;">₹${t.unit_price.toFixed(2)}</td>
                  <td style="padding: 6px 4px; text-align: right; color: var(--ink);">₹${t.line_total.toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error("Error loading price history:", error);
    container.innerHTML = `<div style="padding: 20px; color: var(--saffron); text-align: center; font-size: 0.85rem;">Error loading price history: ${error.message}</div>`;
  }
}

function generatePriceTrendSVG(timeline) {
  const prices = timeline.map(t => t.unit_price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const priceRange = maxP - minP || 1;

  const dates = timeline.map(t => new Date(t.purchase_bills.bill_date).getTime());
  const minD = Math.min(...dates);
  const maxD = Math.max(...dates);
  const dateRange = maxD - minD || 1;

  const width = 400;
  const height = 90;
  const paddingX = 35;
  const paddingY = 10;

  const points = timeline.map(t => {
    const dTime = new Date(t.purchase_bills.bill_date).getTime();
    const x = paddingX + ((dTime - minD) / dateRange) * (width - 2 * paddingX);
    const y = height - paddingY - ((t.unit_price - minP) / priceRange) * (height - 2 * paddingY);
    return { x, y, price: t.unit_price, date: t.purchase_bills.bill_date };
  });

  const pathD = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const yMin = height - paddingY;
  const yMax = paddingY;
  const yMid = paddingY + (height - 2 * paddingY) / 2;

  const midPrice = minP + priceRange / 2;

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible; font-family: inherit;">
      <line x1="${paddingX}" y1="${yMin}" x2="${width - paddingX}" y2="${yMin}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3"/>
      <line x1="${paddingX}" y1="${yMid}" x2="${width - paddingX}" y2="${yMid}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3"/>
      <line x1="${paddingX}" y1="${yMax}" x2="${width - paddingX}" y2="${yMax}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3"/>
      
      <text x="${paddingX - 5}" y="${yMin + 3}" fill="var(--clay)" font-size="8" text-anchor="end">₹${minP.toFixed(1)}</text>
      <text x="${paddingX - 5}" y="${yMid + 3}" fill="var(--clay)" font-size="8" text-anchor="end">₹${midPrice.toFixed(1)}</text>
      <text x="${paddingX - 5}" y="${yMax + 3}" fill="var(--clay)" font-size="8" text-anchor="end">₹${maxP.toFixed(1)}</text>

      <text x="${paddingX}" y="${height}" fill="var(--clay)" font-size="8" text-anchor="start">${timeline[0].purchase_bills.bill_date}</text>
      <text x="${width - paddingX}" y="${height}" fill="var(--clay)" font-size="8" text-anchor="end">${timeline[timeline.length - 1].purchase_bills.bill_date}</text>

      <path d="${pathD}" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      
      ${points.map(p => `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="var(--teal)" stroke="white" stroke-width="1.2">
          <title>₹${p.price.toFixed(2)} on ${p.date}</title>
        </circle>
      `).join("")}
    </svg>
  `;
}

async function renderVendorHistory(vendorId) {
  const container = document.getElementById("historyContainer");
  container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--clay);">Loading purchase history...</div>';

  try {
    const { data, error } = await supabaseClient
      .from("purchase_bills")
      .select(`
        id,
        bill_number,
        bill_date,
        total,
        purchase_bill_items (
          id,
          quantity,
          unit,
          unit_price,
          line_total,
          stock_items (
            name
          )
        )
      `)
      .eq("vendor_id", vendorId)
      .eq("status", "approved")
      .order("bill_date", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="placeholder-view" style="padding: 30px 15px;">
          <div class="placeholder-icon" style="font-size: 2.5rem; margin-bottom: 10px;">🧾</div>
          <h4 style="margin: 0 0 6px 0; font-size: 1.05rem; color: var(--ink);">No approved bills yet</h4>
          <p style="margin: 0; font-size: 0.85rem; color: var(--clay); max-width: 280px; line-height: 1.4;">Approved purchase bills from this supplier will show up here as purchase history.</p>
        </div>
      `;
      return;
    }

    const totalSpent = data.reduce((sum, bill) => sum + bill.total, 0);
    const billsCount = data.length;

    const itemsMap = {};
    data.forEach(bill => {
      bill.purchase_bill_items.forEach(item => {
        const name = item.stock_items?.name || "Unknown";
        if (!itemsMap[name]) {
          itemsMap[name] = {
            name: name,
            totalQty: 0,
            unit: item.unit,
            totalSpent: 0,
            lastPrice: item.unit_price,
            lastDate: bill.bill_date
          };
        }
        const mapped = itemsMap[name];
        mapped.totalQty += item.quantity;
        mapped.totalSpent += item.line_total;
        
        if (new Date(bill.bill_date) >= new Date(mapped.lastDate)) {
          mapped.lastPrice = item.unit_price;
          mapped.lastDate = bill.bill_date;
        }
      });
    });

    const itemsSupplied = Object.values(itemsMap);

    let html = `
      <div class="status-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 15px;">
        <article class="status-card" style="padding: 10px;">
          <p class="card-label" style="font-size: 0.72rem; margin-bottom: 2px;">Total Purchases</p>
          <strong style="font-size: 1.15rem; color: var(--ink);">₹${totalSpent.toFixed(2)}</strong>
          <span style="font-size: 0.68rem; color: var(--clay); display: block; margin-top: 4px; line-height: 1.2;">
            Cumulative spend with vendor
          </span>
        </article>
        <article class="status-card" style="padding: 10px;">
          <p class="card-label" style="font-size: 0.72rem; margin-bottom: 2px;">Approved Bills</p>
          <strong style="font-size: 1.15rem; color: var(--leaf);">${billsCount}</strong>
          <span style="font-size: 0.68rem; color: var(--clay); display: block; margin-top: 4px; line-height: 1.2;">
            Validated and logged in ledger
          </span>
        </article>
        <article class="status-card" style="padding: 10px;">
          <p class="card-label" style="font-size: 0.72rem; margin-bottom: 2px;">Unique Items</p>
          <strong style="font-size: 1.15rem; color: var(--saffron);">${itemsSupplied.length}</strong>
          <span style="font-size: 0.68rem; color: var(--clay); display: block; margin-top: 4px; line-height: 1.2;">
            Different catalog items supplied
          </span>
        </article>
      </div>
    `;

    html += `
      <div class="panel panel-soft" style="margin-bottom: 15px; padding: 12px; background: rgba(255, 255, 255, 0.4);">
        <h4 style="margin: 0 0 10px 0; font-size: 0.82rem; font-weight: 700; color: var(--ink);">Approved Bills History</h4>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--line); color: var(--clay); font-weight: 600;">
                <th style="padding: 6px 4px;">Date</th>
                <th style="padding: 6px 4px;">Bill Number</th>
                <th style="padding: 6px 4px;">Items Summary</th>
                <th style="padding: 6px 4px; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(bill => {
                const summary = bill.purchase_bill_items.map(item => item.stock_items?.name || "Unknown").join(", ");
                const truncatedSummary = summary.length > 30 ? summary.substring(0, 27) + "..." : summary;
                return `
                  <tr style="border-bottom: 1px solid var(--line);">
                    <td style="padding: 6px 4px; font-weight: 500; color: var(--ink);">${bill.bill_date}</td>
                    <td style="padding: 6px 4px; color: var(--clay);">${bill.bill_number || "N/A"}</td>
                    <td style="padding: 6px 4px; color: var(--clay);" title="${summary}">${truncatedSummary}</td>
                    <td style="padding: 6px 4px; text-align: right; color: var(--ink); font-weight: 600;">₹${bill.total.toFixed(2)}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    html += `
      <div class="panel panel-soft" style="padding: 12px; background: rgba(255, 255, 255, 0.4);">
        <h4 style="margin: 0 0 10px 0; font-size: 0.82rem; font-weight: 700; color: var(--ink);">Catalog Items Supplied</h4>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--line); color: var(--clay); font-weight: 600;">
                <th style="padding: 6px 4px;">Item Name</th>
                <th style="padding: 6px 4px; text-align: right;">Total Quantity</th>
                <th style="padding: 6px 4px; text-align: right;">Last Rate Paid</th>
                <th style="padding: 6px 4px; text-align: right;">Avg Rate Paid</th>
              </tr>
            </thead>
            <tbody>
              ${itemsSupplied.map(item => `
                <tr style="border-bottom: 1px solid var(--line);">
                  <td style="padding: 6px 4px; font-weight: 500; color: var(--ink);">${item.name}</td>
                  <td style="padding: 6px 4px; text-align: right; color: var(--clay);">${item.totalQty.toFixed(1)} ${item.unit}</td>
                  <td style="padding: 6px 4px; text-align: right; color: var(--ink); font-weight: 600;">₹${item.lastPrice.toFixed(2)}</td>
                  <td style="padding: 6px 4px; text-align: right; color: var(--leaf);">₹${(item.totalSpent / item.totalQty).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error("Error loading vendor purchase history:", error);
    container.innerHTML = `<div style="padding: 20px; color: var(--saffron); text-align: center; font-size: 0.85rem;">Error loading purchase history: ${error.message}</div>`;
  }
}

function resetStockItemForm() {
  document.getElementById("stockItemForm").reset();
  document.getElementById("stockItemId").value = "";
  document.getElementById("stockItemIsActive").checked = true;
  appState.selectedRecordId = null;
  document.getElementById("detailTabs")?.classList.add("hidden");
  document.getElementById("historyContainer")?.classList.add("hidden");
  showPlaceholder();
  renderListPanel();
}

function resetVendorForm() {
  document.getElementById("vendorForm").reset();
  document.getElementById("vendorId").value = "";
  document.getElementById("vendorIsActive").checked = true;
  appState.selectedRecordId = null;
  document.getElementById("detailTabs")?.classList.add("hidden");
  document.getElementById("historyContainer")?.classList.add("hidden");
  showPlaceholder();
  renderListPanel();
}

async function saveStockItem(event) {
  event.preventDefault();
  if (appState.profile?.role_code !== "owner") return;
  const id = document.getElementById("stockItemId").value;
  const payload = {
    name: document.getElementById("stockItemName").value.trim(),
    category: document.getElementById("stockItemCategory").value,
    default_unit: document.getElementById("stockItemDefaultUnit").value,
    low_stock_threshold: Number(document.getElementById("stockItemLowStockThreshold").value),
    is_active: document.getElementById("stockItemIsActive").checked,
    notes: document.getElementById("stockItemNotes").value.trim() || null
  };
  const query = id ? supabaseClient.from("stock_items").update(payload).eq("id", id) : supabaseClient.from("stock_items").insert(payload);
  const { error } = await query;
  if (error) {
    alert(error.message);
    return;
  }
  resetStockItemForm();
  await loadMasterData();
}

async function saveVendor(event) {
  event.preventDefault();
  if (appState.profile?.role_code !== "owner") return;
  const id = document.getElementById("vendorId").value;
  const payload = {
    name: document.getElementById("vendorName").value.trim(),
    contact_name: document.getElementById("vendorContactName").value.trim() || null,
    phone: document.getElementById("vendorPhone").value.trim() || null,
    category_supplied: document.getElementById("vendorCategorySupplied").value.trim() || null,
    notes: document.getElementById("vendorNotes").value.trim() || null,
    is_active: document.getElementById("vendorIsActive").checked
  };
  const query = id ? supabaseClient.from("vendors").update(payload).eq("id", id) : supabaseClient.from("vendors").insert(payload);
  const { error } = await query;
  if (error) {
    alert(error.message);
    return;
  }
  resetVendorForm();
  await loadMasterData();
}
