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
  if (type === "stock_item") {
    populateStockItemForm(id);
    showForm("stock_items");
  } else {
    populateVendorForm(id);
    showForm("vendors");
  }
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
  showPlaceholder();
  renderListPanel();
}

function resetVendorForm() {
  document.getElementById("vendorForm").reset();
  document.getElementById("vendorId").value = "";
  document.getElementById("vendorIsActive").checked = true;
  appState.selectedRecordId = null;
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
