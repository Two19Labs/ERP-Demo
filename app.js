const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_H5hfJElwUFl-yJR35qtc2w_Fz2MfZRU";

const appState = {
  profile: null,
  selectedDate: "",
  setupError: "",
  currentBillItems: [],
  records: {
    stock_items: [],
    vendors: [],
    purchase_bills: []
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
    const billDateInput = document.getElementById("billDate");
    if (billDateInput) {
      billDateInput.value = appState.selectedDate;
    }
    clearFeedback();
    await loadDashboardData();
  });

  document.getElementById("closeOnboardingBtn")?.addEventListener("click", () => {
    document.getElementById("onboardingGuide").classList.add("hidden");
  });

  document.getElementById("addLineItemBtn")?.addEventListener("click", addLineItem);
  document.getElementById("approveBillBtn")?.addEventListener("click", saveApprovedBill);
  document.getElementById("clearBillBtn")?.addEventListener("click", clearBillForm);

  wireStockItemDropdownChange();
  wireQuickStockModal();
}

async function setupDashboard(user) {
  document.getElementById("userEmail").textContent = user.email || "";

  const profile = await fetchCurrentUserProfile(user.id);

  if (!profile) {
    renderMissingProfileState();
    return;
  }

  appState.profile = profile;
  appState.selectedDate = toIsoDate(new Date());

  const dateInput = document.getElementById("menuDate");
  if (dateInput) {
    dateInput.value = appState.selectedDate;
  }

  const billDateInput = document.getElementById("billDate");
  if (billDateInput) {
    billDateInput.value = appState.selectedDate;
  }

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
  document.getElementById("welcomeTitle").textContent = "Your auth user exists, but the app profile is missing";
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
  document.getElementById("workspaceBadge").textContent = isOwner ? "Owner review mode" : "Staff entry mode";

  if (isOwner) {
    document.getElementById("welcomeTitle").textContent = "Review supplier bills before stock changes";
    document.getElementById("welcomeText").textContent =
      "Use this dashboard to see purchase drafts, recent stock entries, and bills that need owner attention.";
  } else {
    document.getElementById("welcomeTitle").textContent = "Submit purchase bills for owner review";
    document.getElementById("welcomeText").textContent =
      "Capture supplier bill lines clearly so the owner can approve real stock movement.";
  }
}

async function loadDashboardData() {
  // 1. Fetch active stock items
  const { data: stockItems, error: err1 } = await supabaseClient
    .from("stock_items")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  // 2. Fetch active vendors
  const { data: vendors, error: err2 } = await supabaseClient
    .from("vendors")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  // 3. Fetch purchase bills
  const { data: bills, error: err3 } = await supabaseClient
    .from("purchase_bills")
    .select(`
      id,
      bill_number,
      bill_date,
      total,
      status,
      vendors (name)
    `)
    .eq("bill_date", appState.selectedDate)
    .order("created_at", { ascending: false });

  appState.records.stock_items = stockItems || [];
  appState.records.vendors = vendors || [];
  appState.records.purchase_bills = bills || [];
  appState.setupError = (err1 || err2 || err3)?.message || "";

  updateSummaryCounts();
  renderSetupAlert();
  populateVendorDropdown();
  populateStockItemDropdown();
  renderBillItems();
  renderOverviewGrid();
}

function populateVendorDropdown() {
  const select = document.getElementById("billVendorId");
  if (!select) return;

  const prevVal = select.value;
  select.innerHTML = '<option value="">Select a vendor...</option>';

  appState.records.vendors.forEach((vendor) => {
    const opt = document.createElement("option");
    opt.value = vendor.id;
    opt.textContent = vendor.name;
    select.appendChild(opt);
  });

  if (prevVal) select.value = prevVal;
}

function populateStockItemDropdown() {
  const select = document.getElementById("billStockItemId");
  if (!select) return;

  const prevVal = select.value;
  select.innerHTML = '<option value="">Select a stock item...</option>';

  appState.records.stock_items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = `${item.name} (${item.category})`;
    select.appendChild(opt);
  });

  if (prevVal) select.value = prevVal;
}

function wireStockItemDropdownChange() {
  const select = document.getElementById("billStockItemId");
  const display = document.getElementById("billItemUnitDisplay");
  if (!select || !display) return;

  select.addEventListener("change", () => {
    const itemId = select.value;
    const item = appState.records.stock_items.find((x) => x.id === itemId);
    display.textContent = item ? item.default_unit : "unit";
  });
}

function wireQuickStockModal() {
  const modal = document.getElementById("quickStockModal");
  const openBtn = document.getElementById("addStockItemBtn");
  const closeBtn = document.getElementById("closeQuickStockModal");
  const cancelBtn = document.getElementById("cancelQuickStockModal");
  const form = document.getElementById("quickStockForm");

  if (!modal) return;

  const openModal = () => {
    form.reset();
    modal.classList.remove("hidden");
  };
  const closeModal = () => {
    modal.classList.add("hidden");
  };

  openBtn?.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("quickStockName").value.trim();
    const category = document.getElementById("quickStockCategory").value;
    const default_unit = document.getElementById("quickStockUnit").value;
    const low_stock_threshold = Number(document.getElementById("quickStockThreshold").value || 0);
    const notes = document.getElementById("quickStockNotes").value.trim() || null;

    if (!name || !category || !default_unit) {
      alert("Please fill out all required fields.");
      return;
    }

    const { data, error } = await supabaseClient
      .from("stock_items")
      .insert({
        name,
        category,
        default_unit,
        low_stock_threshold,
        notes
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    closeModal();

    // Reload items
    const { data: updatedItems } = await supabaseClient
      .from("stock_items")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    appState.records.stock_items = updatedItems || [];
    populateStockItemDropdown();

    // Automatically select the new item
    document.getElementById("billStockItemId").value = data.id;
    document.getElementById("billItemUnitDisplay").textContent = data.default_unit;
  });
}

function addLineItem() {
  const stockSelect = document.getElementById("billStockItemId");
  const qtyInput = document.getElementById("billItemQuantity");
  const priceInput = document.getElementById("billItemUnitPrice");

  const itemId = stockSelect.value;
  const quantity = Number(qtyInput.value);
  const unitPrice = Number(priceInput.value);

  if (!itemId) {
    alert("Please select a stock item.");
    return;
  }
  if (!qtyInput.value || quantity <= 0) {
    alert("Please enter a valid quantity greater than zero.");
    return;
  }
  if (!priceInput.value || unitPrice < 0) {
    alert("Please enter a valid unit price.");
    return;
  }

  const item = appState.records.stock_items.find((x) => x.id === itemId);
  if (!item) return;

  const existingIndex = appState.currentBillItems.findIndex((x) => x.stock_item_id === itemId);
  const lineTotal = Number((quantity * unitPrice).toFixed(2));

  if (existingIndex > -1) {
    appState.currentBillItems[existingIndex].quantity += quantity;
    appState.currentBillItems[existingIndex].line_total = Number(
      (appState.currentBillItems[existingIndex].quantity * appState.currentBillItems[existingIndex].unit_price).toFixed(2)
    );
  } else {
    appState.currentBillItems.push({
      stock_item_id: itemId,
      name: item.name,
      quantity,
      unit: item.default_unit,
      unit_price: unitPrice,
      line_total: lineTotal
    });
  }

  stockSelect.value = "";
  qtyInput.value = "";
  priceInput.value = "";
  document.getElementById("billItemUnitDisplay").textContent = "unit";

  renderBillItems();
  updateSummaryCounts();
}

// Exposed globally so inline HTML onclick attributes can access it
window.removeBillItem = function (index) {
  appState.currentBillItems.splice(index, 1);
  renderBillItems();
  updateSummaryCounts();
};

function renderBillItems() {
  const body = document.getElementById("billItemsBody");
  const totalDisplay = document.getElementById("billTotalDisplay");
  const approveBtn = document.getElementById("approveBillBtn");

  if (!body) return;

  if (appState.currentBillItems.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="summary-empty" style="text-align: center; padding: 30px 10px;">No bill items added yet.</td>
      </tr>
    `;
    totalDisplay.textContent = "₹0.00";
    approveBtn.disabled = true;
    return;
  }

  body.innerHTML = appState.currentBillItems
    .map((line, idx) => {
      return `
      <tr>
        <td style="padding: 10px 4px;"><strong>${line.name}</strong></td>
        <td style="padding: 10px 4px; text-align: right;">${line.quantity.toFixed(3)}</td>
        <td style="padding: 10px 4px; color: var(--clay);">${line.unit}</td>
        <td style="padding: 10px 4px; text-align: right;">₹${line.unit_price.toFixed(2)}</td>
        <td style="padding: 10px 4px; text-align: right; font-weight: 500;">₹${line.line_total.toFixed(2)}</td>
        <td style="padding: 10px 4px; text-align: center;">
          <button class="btn-delete-row" onclick="window.removeBillItem(${idx})" title="Remove item">&times;</button>
        </td>
      </tr>
    `;
    })
    .join("");

  const grandTotal = appState.currentBillItems.reduce((sum, item) => sum + item.line_total, 0);
  totalDisplay.textContent = `₹${grandTotal.toFixed(2)}`;
  approveBtn.disabled = false;
}

function clearBillForm() {
  appState.currentBillItems = [];
  document.getElementById("purchaseEntryForm").reset();
  
  // Set default values back
  const dateInput = document.getElementById("billDate");
  if (dateInput) {
    dateInput.value = appState.selectedDate;
  }
  
  renderBillItems();
  updateSummaryCounts();
  clearFeedback();
}

async function saveApprovedBill() {
  clearFeedback();

  const vendorSelect = document.getElementById("billVendorId");
  const dateInput = document.getElementById("billDate");
  const billNumberInput = document.getElementById("billNumber");

  const vendorId = vendorSelect.value;
  const billDate = dateInput.value;
  const billNumber = billNumberInput.value.trim() || null;

  if (!vendorId) {
    setFeedback("Please select a vendor.", true);
    return;
  }
  if (!billDate) {
    setFeedback("Please enter a bill date.", true);
    return;
  }
  if (appState.currentBillItems.length === 0) {
    setFeedback("Please add at least one line item.", true);
    return;
  }

  const grandTotal = appState.currentBillItems.reduce((sum, item) => sum + item.line_total, 0);
  const isOwner = appState.profile?.role_code === "owner";
  const status = isOwner ? "approved" : "pending_review";

  const { data: billData, error: headerErr } = await supabaseClient
    .from("purchase_bills")
    .insert({
      vendor_id: vendorId,
      bill_date: billDate,
      bill_number: billNumber,
      subtotal: grandTotal,
      total: grandTotal,
      status: status
    })
    .select()
    .single();

  if (headerErr) {
    alert("Error saving bill: " + headerErr.message);
    return;
  }

  const payloadItems = appState.currentBillItems.map((item) => ({
    purchase_bill_id: billData.id,
    stock_item_id: item.stock_item_id,
    raw_item_name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    line_total: item.line_total,
    match_status: "matched"
  }));

  const { error: itemsErr } = await supabaseClient
    .from("purchase_bill_items")
    .insert(payloadItems);

  if (itemsErr) {
    alert("Error saving bill items: " + itemsErr.message);
    return;
  }

  const successMsg = isOwner
    ? "Purchase bill approved! Stock quantities updated."
    : "Purchase bill submitted for owner review.";

  setFeedback(successMsg);
  clearBillForm();
  await loadDashboardData();
}

function updateSummaryCounts() {
  const currentCount = appState.currentBillItems.length;
  // Needing review count
  const needingReview = appState.records.purchase_bills.filter((x) => x.status === "pending_review" || x.status === "draft").length;
  
  document.getElementById("selectedCountValue").textContent = String(currentCount);
  document.getElementById("yesterdayCountValue").textContent = String(appState.records.purchase_bills.filter(x => x.status === 'approved').length);
  document.getElementById("overviewCountValue").textContent = String(needingReview);
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
  alert.textContent = "Database check: " + appState.setupError;
}

function renderOverviewGrid() {
  const container = document.getElementById("overviewGrid");
  if (!container) return;

  if (appState.records.purchase_bills.length === 0) {
    container.innerHTML = `
      <article class="overview-card" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; width: 100%;">
        <p class="summary-empty">No purchase bills recorded for this date.</p>
      </article>
    `;
    return;
  }

  container.innerHTML = appState.records.purchase_bills
    .map((bill) => {
      let badgeClass = "record-pill-muted";
      let statusText = "Draft";

      if (bill.status === "approved") {
        badgeClass = "record-pill-live";
        statusText = "Approved & Added";
      } else if (bill.status === "pending_review") {
        badgeClass = "record-pill-pending";
        statusText = "Pending Review";
      } else if (bill.status === "rejected") {
        badgeClass = "record-pill-rejected";
        statusText = "Rejected";
      }

      const formattedDate = new Date(bill.bill_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });

      const billRef = bill.bill_number ? `#${bill.bill_number}` : `ID: ${bill.id.slice(0, 8)}`;

      return `
      <article class="record-card">
        <div class="record-main" style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
          <div>
            <h4 style="margin: 0 0 4px 0;">${bill.vendors?.name || "Unknown Vendor"}</h4>
            <p style="margin: 0 0 4px 0; font-size: 0.85rem; color: var(--clay);">${formattedDate} - ${billRef}</p>
            <strong style="font-size: 1.05rem; color: var(--ink);">₹${bill.total.toFixed(2)}</strong>
          </div>
          <span class="record-pill ${badgeClass}" style="font-size: 0.72rem; padding: 3px 8px; border-radius: 4px;">${statusText}</span>
        </div>
      </article>
    `;
    })
    .join("");
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

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
