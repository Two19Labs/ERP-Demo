const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_H5hfJElwUFl-yJR35qtc2w_Fz2MfZRU";

const appState = {
  profile: null,
  accessibleOutlets: [],
  selectedOutletId: null,
  selectedDate: "",
  setupError: "",
  menuId: null,
  selectedDishIds: [],
  records: {
    dishes: [],
    currentMenuItems: [],
    yesterdayMenuItems: [],
    overviewMenus: []
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

  document.getElementById("menuDate")?.addEventListener("change", async (event) => {
    appState.selectedDate = event.target.value;
    clearFeedback();
    await loadPlannerData();
  });

  document.getElementById("outletSelector")?.addEventListener("change", async (event) => {
    appState.selectedOutletId = event.target.value;
    clearFeedback();
    renderAccessCopy();
    await loadPlannerData();
  });

  document.getElementById("copyYesterdayBtn")?.addEventListener("click", copyYesterdayMenu);
  document.getElementById("saveMenuBtn")?.addEventListener("click", saveMenu);
  document.getElementById("clearMenuBtn")?.addEventListener("click", clearSelectedMenu);

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
  appState.accessibleOutlets = await fetchAccessibleOutlets();
  appState.selectedOutletId =
    profile.role_code === "hq"
      ? (appState.accessibleOutlets[0] && appState.accessibleOutlets[0].id) || null
      : profile.outlet_id;
  appState.selectedDate = getTomorrowDate();

  const dateInput = document.getElementById("menuDate");
  if (dateInput) {
    dateInput.value = appState.selectedDate;
  }

  renderAccessCopy();
  await loadPlannerData();
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
  document.getElementById("dishPicker").innerHTML =
    '<p class="summary-empty">No matching row found in public.users.</p>';
}

function renderAccessCopy() {
  const profile = appState.profile;
  if (!profile) {
    return;
  }

  const isHq = profile.role_code === "hq";
  const roleLabel = isHq ? "Owner" : "Staff";
  const selectorWrap = document.getElementById("outletSelectorWrap");
  const selector = document.getElementById("outletSelector");
  const badge = document.getElementById("managerOutletBadge");
  const currentOutlet = getCurrentOutlet();

  document.body.classList.add(`role-${profile.role_code}`);
  document.getElementById("userRole").textContent = roleLabel;
  document.getElementById("workspaceBadge").textContent = isHq ? "Owner review mode" : "Staff entry mode";

  if (isHq) {
    selectorWrap.classList.add("hidden");
    badge.classList.add("hidden");
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

    document.getElementById("welcomeTitle").textContent = "Review supplier bills before stock changes";
    document.getElementById("welcomeText").textContent =
      "Use this dashboard to see purchase drafts, recent stock entries, and bills that need owner attention.";
    document.getElementById("sidebarScope").textContent =
      "Owner reviews supplier bills, catches unusual rates, and approves entries before they affect stock.";
  } else {
    selectorWrap.classList.add("hidden");
    badge.classList.remove("hidden");
    badge.textContent = profile.full_name || "Staff access";
    document.getElementById("welcomeTitle").textContent = "Submit purchase bills for owner review";
    document.getElementById("welcomeText").textContent =
      "Capture supplier bill lines clearly so the owner can approve real stock movement.";
    document.getElementById("sidebarScope").textContent =
      "Staff can prepare bill drafts. Owner approval will become the gate before stock is updated.";
  }

  document.getElementById("selectedOutletTitle").textContent = currentOutlet
    ? "Purchase lines"
    : "Purchase lines";
}

async function loadPlannerData() {
  const results = await Promise.all([
    fetchDishes(),
    fetchCurrentMenu(),
    fetchYesterdayMenu(),
    fetchOverviewMenus()
  ]);

  appState.records.dishes = results[0].data;
  appState.records.currentMenuItems = results[1].items;
  appState.records.yesterdayMenuItems = results[2].items;
  appState.records.overviewMenus = results[3].data;
  appState.menuId = results[1].menuId;
  appState.selectedDishIds = results[1].items.map((item) => item.dish_id);
  appState.setupError = results.find((result) => result.error)?.error?.message || "";

  updateSummaryCounts();
  renderSetupAlert();
  renderDishPicker();
  renderSelectedMenu();
  renderOverviewGrid();
}

async function fetchDishes() {
  const { data, error } = await supabaseClient
    .from("dishes")
    .select("id, name, category, service_order, is_jain, is_active")
    .eq("is_active", true)
    .order("service_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching stock items:", error);
  }

  return { data: data || [], error };
}

async function fetchCurrentMenu() {
  if (!appState.selectedOutletId || !appState.selectedDate) {
    return { menuId: null, items: [], error: null };
  }

  const { data, error } = await supabaseClient
    .from("daily_menus")
    .select(`
      id,
      menu_date,
      daily_menu_items (
        dish_id,
        display_order,
        dishes (
          id,
          name,
          category,
          service_order,
          is_jain
        )
      )
    `)
    .eq("outlet_id", appState.selectedOutletId)
    .eq("menu_date", appState.selectedDate)
    .maybeSingle();

  if (error) {
    console.error("Error fetching current purchase draft:", error);
    return { menuId: null, items: [], error };
  }

  const items = normalizeMenuItems(data?.daily_menu_items || []);
  return { menuId: data?.id || null, items, error: null };
}

async function fetchYesterdayMenu() {
  if (!appState.selectedOutletId || !appState.selectedDate) {
    return { items: [], error: null };
  }

  const previousDate = shiftDate(appState.selectedDate, -1);
  const { data, error } = await supabaseClient
    .from("daily_menus")
    .select(`
      id,
      daily_menu_items (
        dish_id,
        display_order,
        dishes (
          id,
          name,
          category,
          service_order,
          is_jain
        )
      )
    `)
    .eq("outlet_id", appState.selectedOutletId)
    .eq("menu_date", previousDate)
    .maybeSingle();

  if (error) {
    console.error("Error fetching previous purchase draft:", error);
    return { items: [], error };
  }

  return { items: normalizeMenuItems(data?.daily_menu_items || []), error: null };
}

async function fetchOverviewMenus() {
  if (!appState.selectedDate) {
    return { data: [], error: null };
  }

  const { data, error } = await supabaseClient
    .from("public_daily_menu_view")
    .select("outlet_id, outlet_code, outlet_name, city, menu_date, dish_count, dishes_json")
    .eq("menu_date", appState.selectedDate)
    .order("outlet_name", { ascending: true });

  if (error) {
    console.error("Error fetching purchase overview:", error);
    return { data: [], error };
  }

  return { data: data || [], error: null };
}

function normalizeMenuItems(items) {
  return (items || [])
    .map((item) => ({
      dish_id: item.dish_id,
      display_order: item.display_order ?? item.dishes?.service_order ?? 10,
      dish: item.dishes
    }))
    .sort((left, right) => left.display_order - right.display_order || left.dish.name.localeCompare(right.dish.name));
}

function updateSummaryCounts() {
  document.getElementById("selectedCountValue").textContent = String(appState.selectedDishIds.length);
  document.getElementById("yesterdayCountValue").textContent = String(appState.records.yesterdayMenuItems.length);
  document.getElementById("overviewCountValue").textContent = String(appState.records.overviewMenus.length);
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
    "Stock tracking tables are not ready in Supabase yet. Phase 1 will replace the legacy menu tables with stock tables. Latest error: " +
    appState.setupError;
}

function renderDishPicker() {
  const picker = document.getElementById("dishPicker");

  if (!appState.records.dishes.length) {
    picker.innerHTML = '<p class="summary-empty">No active stock items yet. Add items in Stock Setup first.</p>';
    return;
  }

  picker.innerHTML = appState.records.dishes
    .map((dish) => {
      const checked = appState.selectedDishIds.includes(dish.id);
      return `
        <label class="dish-option ${checked ? "dish-option-selected" : ""}">
          <input class="dish-checkbox" type="checkbox" value="${dish.id}" ${checked ? "checked" : ""}>
          <span class="dish-option-body">
            <strong>${dish.name}</strong>
            <small>${dish.category}${dish.is_jain ? " - Track closely" : ""}</small>
          </span>
        </label>
      `;
    })
    .join("");

  picker.querySelectorAll(".dish-checkbox").forEach((input) => {
    input.addEventListener("change", () => {
      const dishId = input.value;
      if (input.checked) {
        if (!appState.selectedDishIds.includes(dishId)) {
          appState.selectedDishIds.push(dishId);
        }
      } else {
        appState.selectedDishIds = appState.selectedDishIds.filter((id) => id !== dishId);
      }

      clearFeedback();
      updateSummaryCounts();
      renderDishPicker();
      renderSelectedMenu();
    });
  });
}

function renderSelectedMenu() {
  const selectedStack = document.getElementById("selectedMenuList");
  const selectedRecords = appState.records.dishes.filter((dish) => appState.selectedDishIds.includes(dish.id));
  const sortedSelected = selectedRecords.sort((left, right) => {
    const leftIndex = appState.selectedDishIds.indexOf(left.id);
    const rightIndex = appState.selectedDishIds.indexOf(right.id);
    return leftIndex - rightIndex;
  });

  if (!sortedSelected.length) {
    selectedStack.innerHTML = '<p class="summary-empty">No bill items selected yet.</p>';
    return;
  }

  selectedStack.innerHTML = sortedSelected
    .map(
      (dish, index) => `
        <article class="selected-card">
          <div>
            <strong>${index + 1}. ${dish.name}</strong>
            <p>${dish.category}${dish.is_jain ? " - Track closely" : ""}</p>
          </div>
          <button class="btn btn-outline btn-small" type="button" data-remove-dish="${dish.id}">
            Remove
          </button>
        </article>
      `
    )
    .join("");

  selectedStack.querySelectorAll("[data-remove-dish]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.selectedDishIds = appState.selectedDishIds.filter((id) => id !== button.dataset.removeDish);
      clearFeedback();
      updateSummaryCounts();
      renderDishPicker();
      renderSelectedMenu();
    });
  });
}

function renderOverviewGrid() {
  const container = document.getElementById("overviewGrid");
  container.innerHTML = `
    <article class="overview-card">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Bill review</p>
          <h3>Supplier bills will appear here</h3>
        </div>
      </div>
      <p class="summary-empty">Phase 1 will add purchase bills and stock movements. For now this screen is reframed around the stock-control workflow.</p>
    </article>
  `;
}

async function copyYesterdayMenu() {
  appState.selectedDishIds = appState.records.yesterdayMenuItems.map((item) => item.dish_id);
  setFeedback(
    appState.selectedDishIds.length
      ? "The previous purchase draft has been copied for review."
      : "There was no previous purchase draft, so this draft stayed empty."
  );
  updateSummaryCounts();
  renderDishPicker();
  renderSelectedMenu();
}

function clearSelectedMenu() {
  appState.selectedDishIds = [];
  clearFeedback();
  updateSummaryCounts();
  renderDishPicker();
  renderSelectedMenu();
}

async function saveMenu() {
  clearFeedback();

  if (!appState.selectedOutletId || !appState.selectedDate) {
    setFeedback("Choose a purchase date before saving.", true);
    return;
  }

  if (!appState.selectedDishIds.length) {
    setFeedback("Select at least one bill item before saving.", true);
    return;
  }

  let menuId = appState.menuId;

  if (!menuId) {
    const { data, error } = await supabaseClient
      .from("daily_menus")
      .insert({
        outlet_id: appState.selectedOutletId,
        menu_date: appState.selectedDate
      })
      .select("id")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    menuId = data.id;
  } else {
    const { error } = await supabaseClient
      .from("daily_menu_items")
      .delete()
      .eq("daily_menu_id", menuId);

    if (error) {
      alert(error.message);
      return;
    }
  }

  const dishMap = new Map(appState.records.dishes.map((dish) => [dish.id, dish]));
  const payload = appState.selectedDishIds.map((dishId, index) => ({
    daily_menu_id: menuId,
    dish_id: dishId,
    display_order: index + 1,
    dish_name_snapshot: dishMap.get(dishId)?.name || null
  }));

  const { error } = await supabaseClient.from("daily_menu_items").insert(payload);
  if (error) {
    alert(error.message);
    return;
  }

  appState.menuId = menuId;
  setFeedback("Purchase draft saved.");
  await loadPlannerData();
}

function setFeedback(message, isError = false) {
  const feedback = document.getElementById("saveFeedback");
  feedback.classList.remove("hidden", "inline-feedback-error");
  feedback.textContent = message;
  if (isError) {
    feedback.classList.add("inline-feedback-error");
  }
}

function clearFeedback() {
  const feedback = document.getElementById("saveFeedback");
  feedback.classList.add("hidden");
  feedback.classList.remove("inline-feedback-error");
  feedback.textContent = "";
}

function getCurrentOutlet() {
  return appState.accessibleOutlets.find((outlet) => outlet.id === appState.selectedOutletId) || null;
}

function getTomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toIsoDate(date);
}

function shiftDate(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
