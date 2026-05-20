const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_H5hfJElwUFl-yJR35qtc2w_Fz2MfZRU";

const appState = {
  profile: null,
  records: {
    stock_items: [],
    movements: []
  },
  setupError: ""
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

    wireLedgerEvents();
    await setupLedger(session.user);
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

function wireLedgerEvents() {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  // Filter change listeners
  document.getElementById("filterStockItemId")?.addEventListener("change", loadLedgerData);
  document.getElementById("filterMovementType")?.addEventListener("change", loadLedgerData);
  document.getElementById("filterStartDate")?.addEventListener("change", loadLedgerData);
  document.getElementById("filterEndDate")?.addEventListener("change", loadLedgerData);

  // Manual movement unit display listener
  document.getElementById("moveStockItemId")?.addEventListener("change", (e) => {
    const itemId = e.target.value;
    const item = appState.records.stock_items.find((x) => x.id === itemId);
    const unitDisplay = document.getElementById("moveUnitDisplay");
    if (unitDisplay) {
      unitDisplay.textContent = item ? item.default_unit : "unit";
    }
  });

  // Manual movement submission listener
  document.getElementById("logMovementBtn")?.addEventListener("click", saveManualMovement);

  // Prevent accidental changes to number inputs via mouse wheel scrolling
  window.addEventListener("wheel", () => {
    if (document.activeElement && document.activeElement.type === "number") {
      document.activeElement.blur();
    }
  });
}

async function setupLedger(user) {
  document.getElementById("userEmail").textContent = user.email || "";

  const profile = await fetchCurrentUserProfile(user.id);

  if (!profile) {
    renderMissingProfileState();
    return;
  }

  appState.profile = profile;

  renderAccessCopy();
  await initReferences();
  await loadLedgerData();
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

  const adjFormPanel = document.getElementById("manualAdjustmentPanel");
  const adjStaffPlaceholder = document.getElementById("manualAdjustmentStaffPlaceholder");

  if (isOwner) {
    adjFormPanel?.classList.remove("hidden");
    adjStaffPlaceholder?.classList.add("hidden");
  } else {
    adjFormPanel?.classList.add("hidden");
    adjStaffPlaceholder?.classList.remove("hidden");
  }
}

async function initReferences() {
  // Load active stock items
  const { data: items, error } = await supabaseClient
    .from("stock_items")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading references:", error.message);
    appState.setupError = "Could not load stock item list: " + error.message;
    renderSetupAlert();
    return;
  }

  appState.records.stock_items = items || [];
  populateDropdowns();
}

function populateDropdowns() {
  const filterSelect = document.getElementById("filterStockItemId");
  const moveSelect = document.getElementById("moveStockItemId");

  if (filterSelect) {
    filterSelect.innerHTML = '<option value="">All items...</option>';
    appState.records.stock_items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = `${item.name} (${item.category})`;
      filterSelect.appendChild(opt);
    });
  }

  if (moveSelect) {
    moveSelect.innerHTML = '<option value="">Select an item...</option>';
    appState.records.stock_items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = `${item.name} (${item.category})`;
      moveSelect.appendChild(opt);
    });
  }
}

async function loadLedgerData() {
  try {
    const filterItem = document.getElementById("filterStockItemId")?.value || "";
    const filterType = document.getElementById("filterMovementType")?.value || "";
    const filterStart = document.getElementById("filterStartDate")?.value || "";
    const filterEnd = document.getElementById("filterEndDate")?.value || "";

    let query = supabaseClient
      .from("stock_movements")
      .select("id, created_at, quantity, unit, movement_type, notes, stock_items(name)")
      .order("created_at", { ascending: false });

    if (filterItem) {
      query = query.eq("stock_item_id", filterItem);
    }

    if (filterType) {
      query = query.eq("movement_type", filterType);
    }

    if (filterStart) {
      query = query.gte("created_at", `${filterStart}T00:00:00Z`);
    }

    if (filterEnd) {
      query = query.lte("created_at", `${filterEnd}T23:59:59Z`);
    }

    const { data: movements, error } = await query;

    if (error) {
      throw error;
    }

    appState.records.movements = movements || [];
    renderLedgerTable();
  } catch (e) {
    console.error(e);
    appState.setupError = "Could not fetch ledger details: " + e.message;
    renderSetupAlert();
  }
}

function renderLedgerTable() {
  const body = document.getElementById("ledgerBody");
  if (!body) return;

  if (appState.records.movements.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="summary-empty" style="text-align: center; padding: 30px 10px;">No matching stock movements found in ledger history.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = appState.records.movements
    .map((m) => {
      const dateObj = new Date(m.created_at);
      const timeStr = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      const dateStr = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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

async function saveManualMovement() {
  clearFeedback();

  const itemSelect = document.getElementById("moveStockItemId");
  const typeSelect = document.getElementById("moveType");
  const qtyInput = document.getElementById("moveQuantity");
  const notesInput = document.getElementById("moveNotes");

  const itemId = itemSelect.value;
  const movementType = typeSelect.value;
  const quantity = Number(qtyInput.value);
  const notes = notesInput.value.trim();

  if (!itemId) {
    setFeedback("Please select a stock item.", true);
    return;
  }
  if (!movementType) {
    setFeedback("Please select a movement type.", true);
    return;
  }
  if (!qtyInput.value || quantity <= 0) {
    setFeedback("Please enter a valid quantity greater than zero.", true);
    return;
  }
  if (!notes) {
    setFeedback("Please enter a reason or notes for the adjustment.", true);
    return;
  }

  const selectedItem = appState.records.stock_items.find((x) => x.id === itemId);
  if (!selectedItem) {
    setFeedback("Selected item not found.", true);
    return;
  }

  const { error } = await supabaseClient
    .from("stock_movements")
    .insert({
      stock_item_id: itemId,
      movement_type: movementType,
      quantity: quantity,
      unit: selectedItem.default_unit,
      notes: notes,
      created_by: appState.profile?.id
    });

  if (error) {
    alert("Error logging movement: " + error.message);
    return;
  }

  setFeedback("Stock movement logged successfully!");
  
  // Reset form
  itemSelect.value = "";
  qtyInput.value = "";
  notesInput.value = "";
  document.getElementById("moveUnitDisplay").textContent = "unit";

  // Reload history
  await loadLedgerData();
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
  alert.textContent = "Error: " + appState.setupError;
}

function setFeedback(message, isError = false) {
  const feedback = document.getElementById("saveFeedback");
  if (!feedback) return;
  feedback.classList.remove("hidden", "inline-feedback-error");
  feedback.textContent = message;
  if (isError) {
    feedback.classList.add("inline-feedback-error");
  }
}

function clearFeedback() {
  const feedback = document.getElementById("saveFeedback");
  if (!feedback) return;
  feedback.classList.add("hidden");
  feedback.classList.remove("inline-feedback-error");
  feedback.textContent = "";
}
