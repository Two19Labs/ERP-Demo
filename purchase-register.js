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

    wireRegisterEvents();
    await setupRegister(session.user);
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

function wireRegisterEvents() {
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
    await loadRegisterData();
  });

  document.getElementById("addLineItemBtn")?.addEventListener("click", addLineItem);
  document.getElementById("approveBillBtn")?.addEventListener("click", saveApprovedBill);
  document.getElementById("clearBillBtn")?.addEventListener("click", clearBillForm);

  wireStockItemDropdownChange();
  wireQuickStockModal();

  // Prevent accidental changes to number inputs via mouse wheel scrolling
  window.addEventListener("wheel", () => {
    if (document.activeElement && document.activeElement.type === "number") {
      document.activeElement.blur();
    }
  });

  // Wire global delete modal
  document.getElementById("cancelDeleteBtn")?.addEventListener("click", hideDeleteModal);
  document.getElementById("confirmDeleteBtn")?.addEventListener("click", executeGlobalDelete);
}

async function setupRegister(user) {
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
  await loadActiveAlertsBadge();
  await loadRegisterData();
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
  document.getElementById("workspaceBadge").textContent = isOwner ? "Owner review mode" : "Staff entry mode";

  if (isOwner) {
    document.getElementById("welcomeTitle").textContent = "Review supplier bills before stock changes";
    document.getElementById("welcomeText").textContent =
      "Use this workspace to log and immediately approve purchase bills. Approved bills write to the stock ledger.";
  } else {
    document.getElementById("welcomeTitle").textContent = "Submit purchase bills for owner review";
    document.getElementById("welcomeText").textContent =
      "Capture supplier bill lines clearly so the owner can approve real stock movement.";
  }
}

async function loadRegisterData() {
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
      file_url,
      vendors (name)
    `)
    .eq("bill_date", appState.selectedDate)
    .order("created_at", { ascending: false });

  appState.records.stock_items = stockItems || [];
  appState.records.vendors = vendors || [];
  appState.records.purchase_bills = bills || [];
  appState.setupError = (err1 || err2 || err3)?.message || "";

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
}

window.removeBillItem = function (index) {
  appState.currentBillItems.splice(index, 1);
  renderBillItems();
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
  
  const dateInput = document.getElementById("billDate");
  if (dateInput) {
    dateInput.value = appState.selectedDate;
  }
  
  renderBillItems();
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
  
  // Always insert as 'pending_review' initially so that purchase_bill_items 
  // can be inserted before the status transitions to 'approved'.
  // Setting status to 'approved' directly on insert violates the database check 
  // constraint (approved_by and approved_at must not be null) and bypasses the stock trigger.
  const initialStatus = "pending_review";

  const { data: billData, error: headerErr } = await supabaseClient
    .from("purchase_bills")
    .insert({
      vendor_id: vendorId,
      bill_date: billDate,
      bill_number: billNumber,
      subtotal: grandTotal,
      total: grandTotal,
      status: initialStatus
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

  // If owner is inserting, transition status to 'approved' to fire the trigger 
  // and log stock movements.
  if (isOwner) {
    const { error: approveErr } = await supabaseClient
      .from("purchase_bills")
      .update({ status: "approved" })
      .eq("id", billData.id);

    if (approveErr) {
      alert("Error approving bill: " + approveErr.message);
      return;
    }
  }

  const successMsg = isOwner
    ? "Purchase bill approved! Stock quantities updated."
    : "Purchase bill submitted for owner review.";

  setFeedback(successMsg);
  window.showToast?.(successMsg, "success");
  clearBillForm();
  await loadRegisterData();
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
      <article class="overview-card" style="grid-column: 1 / -1; padding: 40px 20px; width: 100%;">
        <div class="placeholder-view" style="padding: 0;">
          <div class="placeholder-icon" style="font-size: 2.2rem;">🧾</div>
          <h4 style="margin: 4px 0 6px 0;">No bills for this date</h4>
          <p style="margin: 0; font-size: 0.85rem; color: var(--clay); max-width: 320px; line-height: 1.4;">
            Try another date, or add a bill using the form on the left.
          </p>
        </div>
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

      const fileLink = bill.file_url 
        ? `<div style="margin-top: 6px;"><a href="${bill.file_url}" target="_blank" title="View PDF/Image Attachment" style="text-decoration: none; color: var(--saffron); font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>View Attachment
           </a></div>`
        : "";

      return `
      <article class="record-card">
        <div class="record-main" style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
          <div>
            <h4 style="margin: 0 0 4px 0;">${bill.vendors?.name || "Unknown Vendor"}</h4>
            <p style="margin: 0 0 4px 0; font-size: 0.85rem; color: var(--clay);">${formattedDate} - ${billRef}</p>
            <strong style="font-size: 1.05rem; color: var(--ink);">₹${bill.total.toFixed(2)}</strong>
            ${fileLink}
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            <span class="record-pill ${badgeClass}" style="font-size: 0.72rem; padding: 3px 8px; border-radius: 4px;">${statusText}</span>
            ${appState.profile?.role_code === 'owner' && bill.status === 'pending_review' ? `
              <div style="display: flex; gap: 6px; margin-top: 4px;">
                <button class="btn btn-outline" style="font-size: 0.75rem; padding: 4px 10px; height: auto; border-color: var(--danger-color); color: var(--danger-color);" onclick="window.actionBill('${bill.id}', 'rejected')">Reject</button>
                <button class="btn btn-primary" style="font-size: 0.75rem; padding: 4px 10px; height: auto;" onclick="window.actionBill('${bill.id}', 'approved')">Approve</button>
              </div>
            ` : ''}
            ${appState.profile?.role_code === 'owner' ? `<button class="btn btn-danger" style="font-size: 0.75rem; padding: 4px 10px; height: auto;" onclick="window.showBillDeleteModal('${bill.id}', '${bill.vendors?.name || 'Unknown'}', '${billRef}')">Delete</button>` : ''}
          </div>
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

async function loadActiveAlertsBadge() {
  try {
    const { count, error } = await supabaseClient
      .from('bill_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
      
    if (error) throw error;
    
    const badge = document.getElementById('alertsCountBadge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error('Failed to load active alerts badge:', err);
  }
}

// ---- Global Delete Modal (Bills) ----
let deleteBillTarget = null; // { id: string }

window.showBillDeleteModal = function(billId, vendorName, billRef) {
  deleteBillTarget = { id: billId };
  const modal = document.getElementById("globalDeleteModal");
  const title = document.getElementById("deleteModalTitle");
  const text = document.getElementById("deleteModalText");

  title.textContent = "Delete Bill";
  text.textContent = `Are you sure you want to delete the bill ${billRef} from ${vendorName}? All stock movements created from this bill will also be deleted permanently.`;
  modal.classList.add("active");
};

function hideDeleteModal() {
  deleteBillTarget = null;
  document.getElementById("globalDeleteModal")?.classList.remove("active");
}

async function executeGlobalDelete() {
  if (!deleteBillTarget) return;
  const { id } = deleteBillTarget;

  const { error } = await supabaseClient.from("purchase_bills").delete().eq("id", id);

  if (error) {
    window.showToast?.("Delete failed: " + error.message, "error");
  } else {
    window.showToast?.("Purchase bill deleted.", "success");
    await loadRegisterData();
  }
  hideDeleteModal();
}

window.actionBill = async function(billId, newStatus) {
  if (appState.profile?.role_code !== "owner") return;

  try {
    const payload = {
      status: newStatus,
      approved_by: newStatus === "approved" ? appState.profile.id : null,
      approved_at: newStatus === "approved" ? new Date().toISOString() : null
    };

    const { error } = await supabaseClient
      .from("purchase_bills")
      .update(payload)
      .eq("id", billId);

    if (error) throw error;

    const msg = newStatus === "approved" ? "Bill approved! Stock ledger updated." : "Bill rejected.";
    window.showToast?.(msg, "success");
    await loadRegisterData();
    await loadActiveAlertsBadge();
  } catch (err) {
    alert(`Failed to update bill: ${err.message}`);
  }
};
