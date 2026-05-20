const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_H5hfJElwUFl-yJR35qtc2w_Fz2MfZRU";

const appState = {
  profile: null,
  accessibleOutlets: [],
  selectedOutletId: null,
  currentTab: "dishes",
  setupError: "",
  records: {
    dishes: [],
    ingredients: [],
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

  document.getElementById("outletSelector")?.addEventListener("change", async (event) => {
    appState.selectedOutletId = event.target.value;
    renderAccessCopy();
    await loadMasterData();
  });

  document.getElementById("dishForm")?.addEventListener("submit", saveDish);
  document.getElementById("ingredientForm")?.addEventListener("submit", saveIngredient);
  document.getElementById("vendorForm")?.addEventListener("submit", saveVendor);
  document.getElementById("dishResetBtn")?.addEventListener("click", resetDishForm);
  document.getElementById("ingredientResetBtn")?.addEventListener("click", resetIngredientForm);
  document.getElementById("vendorResetBtn")?.addEventListener("click", resetVendorForm);
}

async function setupDashboard(user) {
  document.getElementById("userEmail").textContent = user.email || "";
  const profile = await fetchCurrentUserProfile(user.id);
  if (!profile) {
    renderMissingProfileState();
    return;
  }

  appState.profile = profile;
  appState.accessibleOutlets = await fetchAccessibleOutlets();
  appState.selectedOutletId =
    profile.role_code === "hq"
      ? (appState.accessibleOutlets[0] && appState.accessibleOutlets[0].id) || null
      : profile.outlet_id;

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

async function fetchAccessibleOutlets() {
  const { data, error } = await supabaseClient
    .from("outlets")
    .select("id, code, name, city, state_region")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    console.error("Error fetching outlets:", error);
    return [];
  }
  return data || [];
}

function renderMissingProfileState() {
  document.getElementById("userRole").textContent = "Needs setup";
  document.getElementById("welcomeTitle").textContent = "Your auth user exists, but the app profile is missing";
  document.getElementById("welcomeText").textContent =
    "Add a matching row in public.users for this auth user, then reload the page.";
  document.getElementById("dishCountValue").textContent = "0";
  document.getElementById("ingredientCountValue").textContent = "0";
  document.getElementById("vendorCountValue").textContent = "0";
  document.getElementById("listBody").innerHTML =
    '<p class="summary-empty">No matching row found in public.users.</p>';
}

function renderAccessCopy() {
  const profile = appState.profile;
  if (!profile) {
    return;
  }

  const isHq = profile.role_code === "hq";
  document.body.classList.add(`role-${profile.role_code}`);
  document.getElementById("userRole").textContent = isHq ? "Owner" : "Staff";
  document.getElementById("workspaceBadge").textContent = isHq ? "Owner setup mode" : "Staff setup mode";

  if (isHq) {
    const selectorWrap = document.getElementById("outletSelectorWrap");
    const selector = document.getElementById("outletSelector");
    selectorWrap.classList.add("hidden");
    selector.innerHTML = "";
    appState.accessibleOutlets.forEach((outlet) => {
      const option = document.createElement("option");
      option.value = outlet.id;
      option.textContent = `${outlet.name} (${outlet.city})`;
      selector.appendChild(option);
    });
    if (appState.selectedOutletId) {
      selector.value = appState.selectedOutletId;
    }
    document.getElementById("welcomeTitle").textContent = "Set up stock items and approved suppliers";
    document.getElementById("welcomeText").textContent =
      "Keep the item and supplier lists clean so bills can be checked before they affect stock.";
  } else {
    const badge = document.getElementById("managerOutletBadge");
    badge.classList.remove("hidden");
    badge.textContent = profile.full_name || "Staff access";
    document.getElementById("welcomeTitle").textContent = "Stock setup for bill capture";
    document.getElementById("welcomeText").textContent =
      "Staff can help maintain suppliers and stock records, with owner controls added in the next phase.";
  }

  document.getElementById("sidebarScope").textContent = isHq
    ? "Owner maintains the stock master and approved supplier list."
    : "Staff prepares stock records for owner review.";
}

async function loadMasterData() {
  const queries = await Promise.all([fetchDishes(), fetchIngredients(), fetchVendors()]);
  appState.records.dishes = queries[0].data;
  appState.records.ingredients = queries[1].data;
  appState.records.vendors = queries[2].data;
  appState.setupError = queries.find((query) => query.error)?.error?.message || "";
  updateSummaryCounts();
  renderSetupAlert();
  renderCurrentTab();
}

async function fetchDishes() {
  const { data, error } = await supabaseClient
    .from("dishes")
    .select("id, name, category, service_order, is_jain, is_active")
    .order("service_order", { ascending: true })
    .order("name", { ascending: true });
  return { data: data || [], error };
}

async function fetchIngredients() {
  const { data, error } = await supabaseClient
    .from("ingredients")
    .select("id, name, category, base_unit, is_active")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  return { data: data || [], error };
}

async function fetchVendors() {
  let query = supabaseClient
    .from("vendors")
    .select("id, outlet_id, name, contact_name, phone, notes, is_active")
    .order("name", { ascending: true });
  if (appState.profile?.role_code === "hq" && appState.selectedOutletId) {
    query = query.eq("outlet_id", appState.selectedOutletId);
  }
  const { data, error } = await query;
  return { data: data || [], error };
}

function updateSummaryCounts() {
  document.getElementById("dishCountValue").textContent = String(appState.records.dishes.length);
  document.getElementById("ingredientCountValue").textContent = String(appState.records.ingredients.length);
  document.getElementById("vendorCountValue").textContent = String(appState.records.vendors.length);
}

function renderSetupAlert() {
  const alert = document.getElementById("setupAlert");
  if (!appState.setupError) {
    alert.classList.add("hidden");
    alert.textContent = "";
    return;
  }
  alert.classList.remove("hidden");
  alert.textContent =
    "Stock setup tables are not ready in Supabase yet. Phase 1 will replace the legacy master data tables with stock tables. Latest error: " +
    appState.setupError;
}

function switchTab(tabName) {
  appState.currentTab = tabName;
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("tab-button-active", button.dataset.tab === tabName);
  });
  renderCurrentTab();
}

function renderCurrentTab() {
  renderFormPanel();
  renderListPanel();
}

function renderFormPanel() {
  const isHq = appState.profile?.role_code === "hq";
  const tab = appState.currentTab;
  const tabConfig = {
    dishes: {
      title: "Stock item details",
      eyebrow: "Stock master",
      hint: isHq ? "Keep item names, categories, and thresholds clean so bills are easy to verify." : "Stock items are controlled by the owner.",
      editable: isHq
    },
    ingredients: {
      title: "Ingredient details",
      eyebrow: "Raw material master",
      hint: isHq ? "Use a stable base unit so purchase tracking and stock calculations stay clean later." : "Ingredients are controlled by the owner.",
      editable: isHq
    },
    vendors: {
      title: "Vendor details",
      eyebrow: "Approved supplier list",
      hint: appState.profile?.role_code === "hq"
        ? "Approved suppliers help the owner spot unknown or suspicious bills."
        : "Supplier edits should be reviewed by the owner.",
      editable: true
    }
  }[tab];

  document.getElementById("formTitle").textContent = tabConfig.title;
  document.getElementById("formEyebrow").textContent = tabConfig.eyebrow;
  document.getElementById("formHint").textContent = tabConfig.hint;

  const forms = {
    dishes: document.getElementById("dishForm"),
    ingredients: document.getElementById("ingredientForm"),
    vendors: document.getElementById("vendorForm")
  };

  Object.entries(forms).forEach(([key, form]) => {
    form.classList.toggle("hidden", key !== tab);
    const shouldDisable = key !== tab || !tabConfig.editable;
    form.querySelectorAll("input, select, textarea, button").forEach((element) => {
      element.disabled = shouldDisable;
    });
  });
}

function renderListPanel() {
  const tab = appState.currentTab;
  const listBody = document.getElementById("listBody");
  const listEyebrow = document.getElementById("listEyebrow");
  const listTitle = document.getElementById("listTitle");

  const configs = {
    dishes: { eyebrow: "Stock master", title: "Stock items", records: appState.records.dishes, renderer: renderDishCard },
    ingredients: { eyebrow: "Raw material list", title: "Ingredients", records: appState.records.ingredients, renderer: renderIngredientCard },
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
  bindEditButtons();
}

function bindEditButtons() {
  document.querySelectorAll("[data-edit-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const { editType, editId } = button.dataset;
      if (editType === "dish") {
        populateDishForm(editId);
      } else if (editType === "ingredient") {
        populateIngredientForm(editId);
      } else if (editType === "vendor") {
        populateVendorForm(editId);
      }
    });
  });
}

function renderDishCard(dish) {
  const canEdit = appState.profile?.role_code === "hq";
  return `
    <article class="record-card">
      <div class="record-main">
        <div>
          <h4>${dish.name}</h4>
          <p>${dish.category} - Low stock threshold ${dish.service_order}</p>
        </div>
        <div class="pill-row">
          ${dish.is_jain ? '<span class="record-pill">Track closely</span>' : ""}
          <span class="record-pill ${dish.is_active ? "record-pill-live" : "record-pill-muted"}">${dish.is_active ? "Active" : "Inactive"}</span>
        </div>
      </div>
      ${canEdit ? `<button class="btn btn-outline btn-small" type="button" data-edit-type="dish" data-edit-id="${dish.id}">Edit</button>` : ""}
    </article>
  `;
}

function renderIngredientCard(ingredient) {
  const canEdit = appState.profile?.role_code === "hq";
  return `
    <article class="record-card">
      <div class="record-main">
        <div>
          <h4>${ingredient.name}</h4>
          <p>${ingredient.category} - ${ingredient.base_unit}</p>
        </div>
        <span class="record-pill ${ingredient.is_active ? "record-pill-live" : "record-pill-muted"}">${ingredient.is_active ? "Active" : "Inactive"}</span>
      </div>
      ${canEdit ? `<button class="btn btn-outline btn-small" type="button" data-edit-type="ingredient" data-edit-id="${ingredient.id}">Edit</button>` : ""}
    </article>
  `;
}

function renderVendorCard(vendor) {
  const outlet = appState.accessibleOutlets.find((item) => item.id === vendor.outlet_id);
  const secondaryLine = [vendor.contact_name, vendor.phone].filter(Boolean).join(" - ");
  return `
    <article class="record-card">
      <div class="record-main">
        <div>
          <h4>${vendor.name}</h4>
          <p>${secondaryLine || "No contact details yet"}</p>
          <p>${outlet ? "Approved supplier" : ""}</p>
        </div>
        <span class="record-pill ${vendor.is_active ? "record-pill-live" : "record-pill-muted"}">${vendor.is_active ? "Active" : "Inactive"}</span>
      </div>
      <button class="btn btn-outline btn-small" type="button" data-edit-type="vendor" data-edit-id="${vendor.id}">Edit</button>
    </article>
  `;
}

function populateDishForm(id) {
  const record = appState.records.dishes.find((item) => item.id === id);
  if (!record) return;
  document.getElementById("dishId").value = record.id;
  document.getElementById("dishName").value = record.name;
  document.getElementById("dishCategory").value = record.category;
  document.getElementById("dishSortOrder").value = record.service_order;
  document.getElementById("dishIsJain").checked = record.is_jain;
  document.getElementById("dishIsActive").checked = record.is_active;
}

function populateIngredientForm(id) {
  const record = appState.records.ingredients.find((item) => item.id === id);
  if (!record) return;
  document.getElementById("ingredientId").value = record.id;
  document.getElementById("ingredientName").value = record.name;
  document.getElementById("ingredientCategory").value = record.category;
  document.getElementById("ingredientUnit").value = record.base_unit;
  document.getElementById("ingredientIsActive").checked = record.is_active;
}

function populateVendorForm(id) {
  const record = appState.records.vendors.find((item) => item.id === id);
  if (!record) return;
  document.getElementById("vendorId").value = record.id;
  document.getElementById("vendorName").value = record.name;
  document.getElementById("vendorContactName").value = record.contact_name || "";
  document.getElementById("vendorPhone").value = record.phone || "";
  document.getElementById("vendorNotes").value = record.notes || "";
  document.getElementById("vendorIsActive").checked = record.is_active;
}

function resetDishForm() {
  document.getElementById("dishForm").reset();
  document.getElementById("dishId").value = "";
  document.getElementById("dishSortOrder").value = "10";
  document.getElementById("dishIsActive").checked = true;
}

function resetIngredientForm() {
  document.getElementById("ingredientForm").reset();
  document.getElementById("ingredientId").value = "";
  document.getElementById("ingredientIsActive").checked = true;
}

function resetVendorForm() {
  document.getElementById("vendorForm").reset();
  document.getElementById("vendorId").value = "";
  document.getElementById("vendorIsActive").checked = true;
}

async function saveDish(event) {
  event.preventDefault();
  if (appState.profile?.role_code !== "hq") return;
  const id = document.getElementById("dishId").value;
  const payload = {
    name: document.getElementById("dishName").value.trim(),
    category: document.getElementById("dishCategory").value,
    service_order: Number(document.getElementById("dishSortOrder").value),
    is_jain: document.getElementById("dishIsJain").checked,
    is_active: document.getElementById("dishIsActive").checked
  };
  const query = id ? supabaseClient.from("dishes").update(payload).eq("id", id) : supabaseClient.from("dishes").insert(payload);
  const { error } = await query;
  if (error) {
    alert(error.message);
    return;
  }
  resetDishForm();
  await loadMasterData();
}

async function saveIngredient(event) {
  event.preventDefault();
  if (appState.profile?.role_code !== "hq") return;
  const id = document.getElementById("ingredientId").value;
  const payload = {
    name: document.getElementById("ingredientName").value.trim(),
    category: document.getElementById("ingredientCategory").value,
    base_unit: document.getElementById("ingredientUnit").value,
    is_active: document.getElementById("ingredientIsActive").checked
  };
  const query = id ? supabaseClient.from("ingredients").update(payload).eq("id", id) : supabaseClient.from("ingredients").insert(payload);
  const { error } = await query;
  if (error) {
    alert(error.message);
    return;
  }
  resetIngredientForm();
  await loadMasterData();
}

async function saveVendor(event) {
  event.preventDefault();
  const id = document.getElementById("vendorId").value;
  const payload = {
    outlet_id: appState.profile?.role_code === "hq" ? appState.selectedOutletId : appState.profile?.outlet_id,
    name: document.getElementById("vendorName").value.trim(),
    contact_name: document.getElementById("vendorContactName").value.trim() || null,
    phone: document.getElementById("vendorPhone").value.trim() || null,
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

function getCurrentOutlet() {
  return appState.accessibleOutlets.find((outlet) => outlet.id === appState.selectedOutletId) || null;
}
