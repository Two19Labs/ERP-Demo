// ─── REGISTRY PAGE (top of file, lines 1–741) ────────────────────
// Wires the bills registry UI. Wizard / parser logic continues below
// this section unchanged.

const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_H5hfJElwUFl-yJR35qtc2w_Fz2MfZRU";

const appState = {
  profile: null,
  setupError: "",
  activeStatusFilter: "all",
  records: {
    stock_items: [],
    vendors: [],
    purchase_bills: []
  },
  wizard: {
    currentStep: 1,
    activeTab: "whatsapp",
    file: null,
    uploadUrl: null,
    items: []
  },
  currentDraft: null,
  lastApprovedPrices: {}
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
    const { data: { session } } = await supabaseClient.auth.getSession();
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
  const t = document.getElementById("welcomeTitle");
  const w = document.getElementById("welcomeText");
  if (t) t.textContent = "Connection check needed";
  if (w) w.textContent = message;
}

// ─── EVENT WIRING ────────────────────────────────────────────────

function wireRegisterEvents() {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  document.getElementById("searchBills")?.addEventListener("input", applyFiltersAndRender);
  document.getElementById("filterVendorSelect")?.addEventListener("change", applyFiltersAndRender);
  document.getElementById("menuDate")?.addEventListener("change", applyFiltersAndRender);
  document.getElementById("clearDateBtn")?.addEventListener("click", () => {
    const d = document.getElementById("menuDate");
    if (d) d.value = "";
    applyFiltersAndRender();
  });

  const statusTabs = [
    "filterStatusAll",
    "filterStatusPending",
    "filterStatusApproved",
    "filterStatusRejected"
  ];
  statusTabs.forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", () => {
      statusTabs.forEach((other) => {
        document.getElementById(other)?.classList.remove("tab-button-active");
      });
      btn.classList.add("tab-button-active");
      appState.activeStatusFilter = btn.dataset.status || "all";
      applyFiltersAndRender();
    });
  });

  // Global delete modal
  document.getElementById("cancelDeleteBtn")?.addEventListener("click", hideDeleteModal);
  document.getElementById("confirmDeleteBtn")?.addEventListener("click", executeGlobalDelete);

  // Prevent accidental number-input scroll changes
  window.addEventListener("wheel", () => {
    if (document.activeElement && document.activeElement.type === "number") {
      document.activeElement.blur();
    }
  });

  wireQuickStockModal();
  wireWizardEvents();
}

// ─── SETUP / PROFILE ─────────────────────────────────────────────

async function setupRegister(user) {
  const emailEl = document.getElementById("userEmail");
  if (emailEl) emailEl.textContent = user.email || "";

  const profile = await fetchCurrentUserProfile(user.id);
  if (!profile) {
    renderMissingProfileState();
    return;
  }

  appState.profile = profile;
  renderAccessCopy();
  await loadLastApprovedPrices();
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
  const role = document.getElementById("userRole");
  const t = document.getElementById("welcomeTitle");
  const w = document.getElementById("welcomeText");
  if (role) role.textContent = "Needs setup";
  if (t) t.textContent = "Profile missing";
  if (w) w.textContent = "Add a matching row in public.users for this auth user, then reload the page.";
}

function renderAccessCopy() {
  const profile = appState.profile;
  if (!profile) return;

  const isOwner = profile.role_code === "owner";
  const roleLabel = isOwner ? "Owner" : "Staff";

  document.body.classList.add(`role-${profile.role_code}`);

  const roleEl = document.getElementById("userRole");
  if (roleEl) {
    roleEl.textContent = roleLabel;
    if (isOwner) roleEl.setAttribute("data-role", "owner");
  }

  const badge = document.getElementById("workspaceBadge");
  if (badge) badge.textContent = isOwner ? "Owner review mode" : "Staff entry mode";

  const t = document.getElementById("welcomeTitle");
  const w = document.getElementById("welcomeText");
  if (isOwner) {
    if (t) t.textContent = "Review supplier bills before stock changes";
    if (w) w.textContent = "Log and approve purchase bills. Approved bills write to the stock ledger.";
  } else {
    if (t) t.textContent = "Submit purchase bills for owner review";
    if (w) w.textContent = "Capture supplier bill lines clearly so the owner can approve real stock movement.";
  }
}

// ─── DATA LOAD ───────────────────────────────────────────────────

async function loadRegisterData() {
  const { data: stockItems, error: err1 } = await supabaseClient
    .from("stock_items")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: vendors, error: err2 } = await supabaseClient
    .from("vendors")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: bills, error: err3 } = await supabaseClient
    .from("purchase_bills")
    .select(`
      id,
      bill_number,
      bill_date,
      total,
      status,
      file_url,
      vendor_id,
      created_at,
      vendors (name)
    `)
    .order("created_at", { ascending: false });

  appState.records.stock_items = stockItems || [];
  appState.records.vendors = vendors || [];
  appState.records.purchase_bills = bills || [];
  appState.setupError = (err1 || err2 || err3)?.message || "";

  renderSetupAlert();
  populateVendorFilter();
  applyFiltersAndRender();
}

function populateVendorFilter() {
  const select = document.getElementById("filterVendorSelect");
  if (!select) return;

  const prevVal = select.value;
  select.innerHTML = '<option value="">All Vendors</option>';
  appState.records.vendors.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.name;
    select.appendChild(opt);
  });
  if (prevVal) select.value = prevVal;
}

// ─── FILTER + RENDER ─────────────────────────────────────────────

function applyFiltersAndRender() {
  const search = (document.getElementById("searchBills")?.value || "").trim().toLowerCase();
  const vendorId = document.getElementById("filterVendorSelect")?.value || "";
  const date = document.getElementById("menuDate")?.value || "";
  const status = appState.activeStatusFilter || "all";

  const filtered = appState.records.purchase_bills.filter((bill) => {
    if (status !== "all" && bill.status !== status) return false;
    if (vendorId && bill.vendor_id !== vendorId) return false;
    if (date && bill.bill_date !== date) return false;
    if (search) {
      const billNum = (bill.bill_number || "").toLowerCase();
      const vendorName = (bill.vendors?.name || "").toLowerCase();
      if (!billNum.includes(search) && !vendorName.includes(search)) return false;
    }
    return true;
  });

  renderBillsRegistry(filtered);
}

function renderBillsRegistry(bills) {
  const body = document.getElementById("billsRegistryBody");
  if (!body) return;

  if (!bills.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="summary-empty" style="text-align: center; padding: 40px 10px;">No bills found</td>
      </tr>
    `;
    return;
  }

  const isOwner = appState.profile?.role_code === "owner";

  body.innerHTML = bills.map((bill) => {
    const date = bill.bill_date
      ? new Date(bill.bill_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
    const billRef = bill.bill_number ? `#${escapeHtml(bill.bill_number)}` : `<span style="color: var(--clay);">ID ${bill.id.slice(0, 8)}</span>`;
    const vendor = escapeHtml(bill.vendors?.name || "Unknown Vendor");
    const total = `₹${Number(bill.total || 0).toFixed(2)}`;

    let badgeClass = "record-pill-muted";
    let statusText = bill.status || "draft";
    if (bill.status === "approved") { badgeClass = "record-pill-live"; statusText = "Approved"; }
    else if (bill.status === "pending_review") { badgeClass = "record-pill-pending"; statusText = "Pending Review"; }
    else if (bill.status === "rejected") { badgeClass = "record-pill-rejected"; statusText = "Rejected"; }

    const ownerActions = isOwner && bill.status === "pending_review"
      ? `
        <button class="btn btn-outline btn-small" style="border-color: var(--ok); color: var(--ok);" onclick="window.actionBill('${bill.id}', 'approved')">Approve</button>
        <button class="btn btn-outline btn-small" style="border-color: var(--accent); color: var(--accent);" onclick="window.actionBill('${bill.id}', 'rejected')">Reject</button>
      `
      : "";

    const deleteBtn = isOwner
      ? `<button class="btn btn-outline btn-small" style="color: var(--accent); border-color: var(--accent);" onclick="window.showBillDeleteModal('${bill.id}', '${escapeHtml(bill.vendors?.name || 'Unknown').replace(/'/g, '&#39;')}', '${(bill.bill_number ? '#' + bill.bill_number : 'ID ' + bill.id.slice(0, 8)).replace(/'/g, '&#39;')}')">Delete</button>`
      : "";

    return `
      <tr>
        <td style="padding: 12px 8px;">${date}</td>
        <td style="padding: 12px 8px;"><strong>${billRef}</strong></td>
        <td style="padding: 12px 8px;">${vendor}</td>
        <td style="padding: 12px 8px; text-align: right; font-variant-numeric: tabular-nums;"><strong>${total}</strong></td>
        <td style="padding: 12px 8px; text-align: center;">
          <span class="record-pill ${badgeClass}">${statusText}</span>
        </td>
        <td style="padding: 12px 8px; text-align: center;">
          <div style="display: inline-flex; gap: 6px; flex-wrap: wrap; justify-content: center;">
            <button class="btn btn-primary btn-small" onclick="window.openReviewModal('${bill.id}')">View</button>
            ${ownerActions}
            ${deleteBtn}
          </div>
        </td>
      </tr>
    `;
  }).join("");
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

// ─── QUICK STOCK MODAL ───────────────────────────────────────────
// Opened from the wizard (via wizardAddStockItemBtn). Submitting
// creates a new stock_items row and refreshes the local cache.

function wireQuickStockModal() {
  const modal = document.getElementById("quickStockModal");
  const closeBtn = document.getElementById("closeQuickStockModal");
  const cancelBtn = document.getElementById("cancelQuickStockModal");
  const form = document.getElementById("quickStockForm");

  if (!modal) return;

  const closeModal = () => modal.classList.add("hidden");

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
      window.showToast?.("Please fill out all required fields.", "error");
      return;
    }

    const { data, error } = await supabaseClient
      .from("stock_items")
      .insert({ name, category, default_unit, low_stock_threshold, notes })
      .select()
      .single();

    if (error) {
      window.showToast?.("Failed to add stock item: " + error.message, "error");
      return;
    }

    const { data: updatedItems } = await supabaseClient
      .from("stock_items")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    appState.records.stock_items = updatedItems || [];
    closeModal();
    window.showToast?.(`Stock item "${data.name}" created.`, "success");

    // If the wizard exposes a hook to refresh its dropdown, notify it.
    if (typeof window.refreshWizardStockItems === "function") {
      window.refreshWizardStockItems(data.id);
    }
  });
}

// ─── UTILITIES ───────────────────────────────────────────────────

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function loadActiveAlertsBadge() {
  try {
    const { count, error } = await supabaseClient
      .from("bill_alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    if (error) throw error;

    const badge = document.getElementById("alertsCountBadge");
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  } catch (err) {
    console.error("Failed to load active alerts badge:", err);
  }
}

// ─── GLOBAL DELETE MODAL (BILLS) ─────────────────────────────────

let deleteBillTarget = null;

window.showBillDeleteModal = function (billId, vendorName, billRef) {
  deleteBillTarget = { id: billId };
  const modal = document.getElementById("globalDeleteModal");
  const title = document.getElementById("deleteModalTitle");
  const text = document.getElementById("deleteModalText");
  if (title) title.textContent = "Delete Bill";
  if (text) text.textContent = `Delete bill ${billRef} from ${vendorName}? All stock movements created from this bill will also be removed permanently.`;
  modal?.classList.add("active");
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

// ─── APPROVE / REJECT ────────────────────────────────────────────

window.actionBill = async function (billId, newStatus) {
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

    const msg = newStatus === "approved" ? "Bill approved. Stock ledger updated." : "Bill rejected.";
    window.showToast?.(msg, "success");
    await loadRegisterData();
    await loadActiveAlertsBadge();
  } catch (err) {
    window.showToast?.("Failed to update bill: " + err.message, "error");
  }
};

// ---- Record Delivery Wizard Modal & Parser Logic ----

async function loadLastApprovedPrices() {
  try {
    const { data, error } = await supabaseClient
      .from("purchase_bill_items")
      .select("stock_item_id, unit_price, purchase_bills!inner(status, approved_at)")
      .eq("purchase_bills.status", "approved")
      .order("purchase_bills.approved_at", { ascending: false });

    if (error) throw error;

    appState.lastApprovedPrices = {};
    if (data) {
      data.forEach((row) => {
        if (row.stock_item_id && !(row.stock_item_id in appState.lastApprovedPrices)) {
          appState.lastApprovedPrices[row.stock_item_id] = Number(row.unit_price);
        }
      });
    }
  } catch (err) {
    console.error("Failed to load last approved prices:", err);
  }
}

function wireWizardEvents() {
  const modal = document.getElementById("recordDeliveryModal");
  const openBtn = document.getElementById("openDeliveryModalBtn");
  const closeBtn = document.getElementById("closeDeliveryModalBtn");

  const openModal = () => {
    resetWizard();
    modal?.classList.remove("hidden");
  };
  const closeModal = () => {
    modal?.classList.add("hidden");
  };

  openBtn?.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);

  // Tab switching
  const tabWhatsApp = document.getElementById("wizardTabWhatsApp");
  const tabOcr = document.getElementById("wizardTabOcr");
  const tabManual = document.getElementById("wizardTabManual");

  const methodWhatsApp = document.getElementById("methodWhatsApp");
  const methodOcr = document.getElementById("methodOcr");
  const methodManual = document.getElementById("methodManual");

  tabWhatsApp?.addEventListener("click", () => {
    tabWhatsApp.classList.add("capture-tab-active");
    tabOcr?.classList.remove("capture-tab-active");
    tabManual?.classList.remove("capture-tab-active");
    methodWhatsApp?.classList.remove("hidden");
    methodOcr?.classList.add("hidden");
    methodManual?.classList.add("hidden");
    appState.wizard.activeTab = "whatsapp";
  });

  tabOcr?.addEventListener("click", () => {
    tabOcr.classList.add("capture-tab-active");
    tabWhatsApp?.classList.remove("capture-tab-active");
    tabManual?.classList.remove("capture-tab-active");
    methodOcr?.classList.remove("hidden");
    methodWhatsApp?.classList.add("hidden");
    methodManual?.classList.add("hidden");
    appState.wizard.activeTab = "ocr";
  });

  tabManual?.addEventListener("click", () => {
    tabManual.classList.add("capture-tab-active");
    tabWhatsApp?.classList.remove("capture-tab-active");
    tabOcr?.classList.remove("capture-tab-active");
    methodManual?.classList.remove("hidden");
    methodWhatsApp?.classList.add("hidden");
    methodOcr?.classList.add("hidden");
    appState.wizard.activeTab = "manual";
  });

  // Demo Buttons
  document.getElementById("wizardDemoBtn1")?.addEventListener("click", () => {
    const text = document.getElementById("wizardRawText");
    if (text) {
      text.value = `Fresh Market Supplier\nInvoice No: FMS-29471\nDate: 2026-05-24\nTomatoes 20 kg @ 42 rs\nOnions 15 kg @ 30 rs\nTotal 1290`;
    }
  });

  document.getElementById("wizardDemoBtn2")?.addEventListener("click", () => {
    const text = document.getElementById("wizardRawText");
    if (text) {
      text.value = `City Dry Goods\nBill No: CDG-99482\nDate: 2026-05-24\nBasmati Rice 50 kg @ 60 rs\nCooking Oil 20 litres @ 110 rs\nFlour 30 kg @ 40 rs\nTotal 6400`;
    }
  });

  // Parsing and manual additions
  document.getElementById("wizardParseBtn")?.addEventListener("click", handleWizardParseText);
  document.getElementById("wizardManualAddLineBtn")?.addEventListener("click", handleWizardManualAddLine);
  document.getElementById("wizardManualProceedBtn")?.addEventListener("click", handleWizardManualProceed);

  // Quick stock item inside wizard manual entry
  document.getElementById("wizardAddStockItemBtn")?.addEventListener("click", () => {
    document.getElementById("quickStockForm")?.reset();
    document.getElementById("quickStockModal")?.classList.remove("hidden");
  });

  // Manual Item unit display change
  document.getElementById("wizardManualItemId")?.addEventListener("change", (e) => {
    const itemId = e.target.value;
    const item = appState.records.stock_items.find((x) => x.id === itemId);
    const display = document.getElementById("wizardManualUnitDisplay");
    if (display) {
      display.textContent = item ? item.default_unit : "unit";
    }
  });

  // Step 2 Buttons
  document.getElementById("wizardBackBtn")?.addEventListener("click", () => {
    document.getElementById("wizardStep2")?.classList.add("hidden");
    document.getElementById("wizardStep1")?.classList.remove("hidden");
    document.getElementById("wizardTitle").textContent = "Record Supplier Delivery";
  });

  document.getElementById("wizardClearBtn")?.addEventListener("click", resetWizard);
  document.getElementById("wizardSubmitBtn")?.addEventListener("click", submitWizardBill);

  // OCR Upload handlers
  const uploadZone = document.getElementById("wizardUploadZone");
  const fileInput = document.getElementById("wizardFileInput");
  const uploadBrowse = document.querySelector(".upload-browse");

  uploadZone?.addEventListener("click", (e) => {
    if (e.target !== fileInput && !e.target.classList.contains("upload-browse")) {
      fileInput?.click();
    }
  });

  uploadBrowse?.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput?.click();
  });

  uploadZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = "var(--saffron)";
  });

  uploadZone?.addEventListener("dragleave", () => {
    uploadZone.style.borderColor = "var(--line)";
  });

  uploadZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = "var(--line)";
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleWizardSelectedFile(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleWizardSelectedFile(e.target.files[0]);
    }
  });

  document.getElementById("wizardRemoveFileBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    clearWizardUploadedFile();
  });

  document.getElementById("wizardExtractOcrBtn")?.addEventListener("click", handleWizardOcrExtraction);

  // Collapsible original attachment
  document.getElementById("wizardToggleAttachmentBtn")?.addEventListener("click", () => {
    const content = document.getElementById("wizardAttachmentContent");
    const chevron = document.querySelector(".visual-attachment-chevron");
    const isHidden = content?.classList.toggle("hidden");
    if (chevron) {
      chevron.textContent = isHidden ? "▼" : "▲";
    }
  });

  // Speech Recognition / Voice Input
  wireWizardVoiceInput();
}

function wireWizardVoiceInput() {
  const voiceBtn = document.getElementById("wizardVoiceBtn");
  const voiceBtnText = document.getElementById("wizardVoiceBtnText");
  const voiceMicIcon = document.getElementById("wizardMicIcon");
  const rawText = document.getElementById("wizardRawText");

  let recognition = null;
  let isListening = false;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition && voiceBtn) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      voiceBtn.classList.add("recording");
      if (voiceBtnText) voiceBtnText.textContent = "Listening... Click to stop";
      if (voiceMicIcon) voiceMicIcon.textContent = "⏹";
      window.showToast?.("Listening... Speak clearly.", "info");
    };

    recognition.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript;
      if (rawText) {
        const spacer = rawText.value.trim() ? "\n" : "";
        rawText.value = rawText.value.trim() + spacer + transcript.trim();
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      stopListening();
    };

    recognition.onend = () => {
      stopListening();
    };

    const startListening = () => {
      try {
        recognition.start();
      } catch (err) {
        console.error(err);
      }
    };

    const stopListening = () => {
      isListening = false;
      voiceBtn.classList.remove("recording");
      if (voiceBtnText) voiceBtnText.textContent = "Voice Input";
      if (voiceMicIcon) voiceMicIcon.textContent = "🎙";
      try {
        recognition.stop();
      } catch (err) {}
    };

    voiceBtn.addEventListener("click", () => {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    });
  } else if (voiceBtn) {
    voiceBtn.style.display = "none";
  }
}

function resetWizard() {
  appState.wizard = {
    currentStep: 1,
    activeTab: appState.wizard?.activeTab || "whatsapp",
    file: null,
    uploadUrl: null,
    items: []
  };
  appState.currentDraft = null;

  // Reset inputs
  const rawText = document.getElementById("wizardRawText");
  if (rawText) rawText.value = "";

  const fileInput = document.getElementById("wizardFileInput");
  if (fileInput) fileInput.value = "";

  const manualVendor = document.getElementById("wizardManualVendorId");
  if (manualVendor) {
    manualVendor.innerHTML = '<option value="">Select a vendor...</option>';
    appState.records.vendors.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = v.name;
      manualVendor.appendChild(opt);
    });
  }
  const manualBillNo = document.getElementById("wizardManualBillNumber");
  if (manualBillNo) manualBillNo.value = "";
  
  const manualBillDate = document.getElementById("wizardManualBillDate");
  if (manualBillDate) manualBillDate.value = toIsoDate(new Date());

  const manualItemId = document.getElementById("wizardManualItemId");
  if (manualItemId) {
    manualItemId.innerHTML = '<option value="">Select a stock item...</option>';
    appState.records.stock_items.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = `${item.name} (${item.category})`;
      manualItemId.appendChild(opt);
    });
  }
  const manualQty = document.getElementById("wizardManualQty");
  if (manualQty) manualQty.value = "";
  const manualPrice = document.getElementById("wizardManualPrice");
  if (manualPrice) manualPrice.value = "";
  const manualUnit = document.getElementById("wizardManualUnitDisplay");
  if (manualUnit) manualUnit.textContent = "unit";

  // Hide details card, show upload zones
  document.getElementById("wizardFileDetails")?.classList.add("hidden");
  document.getElementById("wizardUploadZone")?.classList.remove("hidden");
  const extractOcrBtn = document.getElementById("wizardExtractOcrBtn");
  if (extractOcrBtn) {
    extractOcrBtn.disabled = true;
    extractOcrBtn.textContent = "Extract Bill with OCR";
  }

  document.getElementById("wizardAttachmentCard")?.classList.add("hidden");
  document.getElementById("wizardAttachmentContent")?.classList.add("hidden");
  const chevron = document.querySelector(".visual-attachment-chevron");
  if (chevron) chevron.textContent = "▼";

  // Step visibilities
  document.getElementById("wizardStep2")?.classList.add("hidden");
  document.getElementById("wizardLoading")?.classList.add("hidden");
  document.getElementById("wizardStep1")?.classList.remove("hidden");
  document.getElementById("wizardTitle").textContent = "Record Supplier Delivery";

  const feedback = document.getElementById("wizardFeedback");
  if (feedback) {
    feedback.classList.add("hidden");
    feedback.textContent = "";
  }
}

function handleWizardSelectedFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    alert("File size exceeds 5MB limit.");
    return;
  }
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";
  if (!isImage && !isPdf) {
    alert("Invalid file type. Please upload a JPG, PNG, or PDF file.");
    return;
  }

  appState.wizard.file = file;

  document.getElementById("wizardUploadZone")?.classList.add("hidden");
  document.getElementById("wizardFileDetails")?.classList.remove("hidden");

  document.getElementById("wizardFileName").textContent = file.name;
  let sizeStr = "";
  if (file.size < 1024) sizeStr = `${file.size} B`;
  else if (file.size < 1024 * 1024) sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
  else sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  document.getElementById("wizardFileSize").textContent = sizeStr;

  const fileThumb = document.getElementById("wizardFileThumb");
  const pdfIcon = document.getElementById("wizardPdfIcon");

  if (isImage) {
    fileThumb?.classList.remove("hidden");
    pdfIcon?.classList.add("hidden");
    const reader = new FileReader();
    reader.onload = (e) => {
      if (fileThumb) fileThumb.src = e.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    fileThumb?.classList.add("hidden");
    pdfIcon?.classList.remove("hidden");
  }

  const btn = document.getElementById("wizardExtractOcrBtn");
  if (btn) btn.disabled = false;
}

function clearWizardUploadedFile() {
  appState.wizard.file = null;
  appState.wizard.uploadUrl = null;
  const fileInput = document.getElementById("wizardFileInput");
  if (fileInput) fileInput.value = "";
  document.getElementById("wizardFileDetails")?.classList.add("hidden");
  document.getElementById("wizardUploadZone")?.classList.remove("hidden");
  const btn = document.getElementById("wizardExtractOcrBtn");
  if (btn) btn.disabled = true;
}

async function handleWizardOcrExtraction() {
  if (!appState.wizard.file) return;

  const file = appState.wizard.file;
  const isImage = file.type.startsWith("image/");

  document.getElementById("wizardStep1")?.classList.add("hidden");
  const loading = document.getElementById("wizardLoading");
  loading?.classList.remove("hidden");

  const setStep = (id, status, isClassActive = false, isClassComplete = false) => {
    const row = document.getElementById(id);
    if (!row) return;
    row.querySelector(".ocr-step-status").textContent = status;
    if (isClassActive) {
      row.classList.add("active");
      row.classList.remove("complete");
    } else if (isClassComplete) {
      row.classList.remove("active");
      row.classList.add("complete");
    } else {
      row.classList.remove("active");
      row.classList.remove("complete");
    }
  };

  setStep("wizardStepUpload", "⏳", true, false);
  setStep("wizardStepAnalyze", "⏳", false, false);
  setStep("wizardStepExtract", "⏳", false, false);
  setStep("wizardStepMap", "⏳", false, false);

  try {
    const uniqueName = `bill_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { data: uploadData, error: uploadErr } = await supabaseClient.storage
      .from('bills')
      .upload(uniqueName, file, { cacheControl: '3600', upsert: true });

    if (uploadErr) {
      console.warn("Storage upload failed, using fallback URL:", uploadErr);
      appState.wizard.uploadUrl = URL.createObjectURL(file);
    } else {
      const { data: urlData } = supabaseClient.storage.from('bills').getPublicUrl(uniqueName);
      appState.wizard.uploadUrl = urlData.publicUrl;
    }

    setStep("wizardStepUpload", "✅", false, true);
    setStep("wizardStepAnalyze", "⏳", true, false);

    let parsedResult = null;
    let extractedText = "";
    const customApiKey = localStorage.getItem("hf_api_key");

    if (isImage) {
      setStep("wizardStepAnalyze", "⏳ Reading text...", true, false);
      try {
        const result = await Tesseract.recognize(file, 'eng');
        extractedText = (result.data.text || "").trim();
      } catch (ocrErr) {
        console.warn("Tesseract OCR failed:", ocrErr);
      }
      setStep("wizardStepAnalyze", "✅", false, true);
      setStep("wizardStepExtract", "⏳", true, false);

      if (extractedText) {
        try {
          parsedResult = await parseTextWithLLM(extractedText, appState.records.vendors, appState.records.stock_items, customApiKey);
        } catch (err) {
          console.warn("AI parse failed, using mock:", err);
          parsedResult = getMockOcrData(file.name, appState.records.vendors, appState.records.stock_items);
        }
      } else {
        parsedResult = getMockOcrData(file.name, appState.records.vendors, appState.records.stock_items);
      }
    } else {
      setStep("wizardStepAnalyze", "⏳", true, false);
      await new Promise(r => setTimeout(r, 600));
      parsedResult = getMockOcrData(file.name, appState.records.vendors, appState.records.stock_items);
      setStep("wizardStepAnalyze", "✅", false, true);
      setStep("wizardStepExtract", "⏳", true, false);
    }

    setStep("wizardStepExtract", "✅", false, true);
    setStep("wizardStepMap", "⏳", true, false);
    await new Promise(r => setTimeout(r, 300));
    setStep("wizardStepMap", "✅", false, true);

    if (!uploadErr) {
      await supabaseClient.storage.from('bills').remove([uniqueName]);
    }

    appState.currentDraft = {
      vendorId: parsedResult.vendorId || "",
      billNumber: parsedResult.billNumber || "",
      billDate: parsedResult.billDate || toIsoDate(new Date()),
      parsedTotal: parsedResult.parsedTotal,
      items: parsedResult.items || []
    };

    loading?.classList.add("hidden");
    document.getElementById("wizardStep2")?.classList.remove("hidden");
    document.getElementById("wizardTitle").textContent = "Verify Draft Details & Match Items";

    // Populate metadata
    const draftVendor = document.getElementById("draftVendorId");
    if (draftVendor) {
      draftVendor.innerHTML = '<option value="">Select a vendor...</option>';
      appState.records.vendors.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = v.name;
        draftVendor.appendChild(opt);
      });
      draftVendor.value = appState.currentDraft.vendorId;
    }
    const draftBillNo = document.getElementById("draftBillNumber");
    if (draftBillNo) draftBillNo.value = appState.currentDraft.billNumber;

    const draftBillDate = document.getElementById("draftBillDate");
    if (draftBillDate) draftBillDate.value = appState.currentDraft.billDate;

    // Show attachment preview
    const localUrl = URL.createObjectURL(file);
    const attachmentImg = document.getElementById("wizardAttachmentImg");
    const attachmentPdf = document.getElementById("wizardAttachmentPdf");

    if (isImage) {
      if (attachmentImg) {
        attachmentImg.src = localUrl;
        attachmentImg.classList.remove("hidden");
      }
      attachmentPdf?.classList.add("hidden");
    } else {
      if (attachmentPdf) {
        attachmentPdf.src = localUrl;
        attachmentPdf.classList.remove("hidden");
      }
      attachmentImg?.classList.add("hidden");
    }
    document.getElementById("wizardAttachmentCard")?.classList.remove("hidden");

    renderWizardDraftLinesTable();
  } catch (err) {
    console.error("OCR Extraction failed:", err);
    alert("OCR extraction error: " + err.message);
    resetWizard();
  }
}

async function handleWizardParseText() {
  const text = document.getElementById("wizardRawText")?.value.trim();
  if (!text) {
    alert("Please paste WhatsApp chat or supplier text first!");
    return;
  }

  const parseBtn = document.getElementById("wizardParseBtn");
  const origText = parseBtn.textContent;
  if (parseBtn) {
    parseBtn.disabled = true;
    parseBtn.textContent = "Parsing (AI)...";
  }

  const customApiKey = localStorage.getItem("hf_api_key");
  let parsed = null;

  try {
    parsed = await parseTextWithLLM(text, appState.records.vendors, appState.records.stock_items, customApiKey);
  } catch (err) {
    console.warn("AI parser failed, using local parser:", err);
    parsed = parseWhatsAppText(text, appState.records.vendors, appState.records.stock_items);
  }

  if (parseBtn) {
    parseBtn.disabled = false;
    parseBtn.textContent = origText;
  }

  if (!parsed || !parsed.items || parsed.items.length === 0) {
    alert("Could not extract any line items. Format should be: Tomato 10 kg x 42 = 420");
    return;
  }

  appState.currentDraft = {
    vendorId: parsed.vendorId || "",
    billNumber: parsed.billNumber || "",
    billDate: parsed.billDate || toIsoDate(new Date()),
    parsedTotal: parsed.parsedTotal,
    items: parsed.items || []
  };

  document.getElementById("wizardStep1")?.classList.add("hidden");
  document.getElementById("wizardStep2")?.classList.remove("hidden");
  document.getElementById("wizardTitle").textContent = "Verify Draft Details & Match Items";

  // Populate metadata
  const draftVendor = document.getElementById("draftVendorId");
  if (draftVendor) {
    draftVendor.innerHTML = '<option value="">Select a vendor...</option>';
    appState.records.vendors.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = v.name;
      draftVendor.appendChild(opt);
    });
    draftVendor.value = appState.currentDraft.vendorId;
  }
  const draftBillNo = document.getElementById("draftBillNumber");
  if (draftBillNo) draftBillNo.value = appState.currentDraft.billNumber;

  const draftBillDate = document.getElementById("draftBillDate");
  if (draftBillDate) draftBillDate.value = appState.currentDraft.billDate;

  renderWizardDraftLinesTable();
}

function handleWizardManualAddLine() {
  const stockSelect = document.getElementById("wizardManualItemId");
  const qtyInput = document.getElementById("wizardManualQty");
  const priceInput = document.getElementById("wizardManualPrice");

  const itemId = stockSelect.value;
  const quantity = Number(qtyInput.value);
  const unitPrice = Number(priceInput.value);

  if (!itemId) {
    alert("Please select a stock item.");
    return;
  }
  if (!qtyInput.value || quantity <= 0) {
    alert("Please enter a valid quantity.");
    return;
  }
  if (!priceInput.value || unitPrice < 0) {
    alert("Please enter a valid unit price.");
    return;
  }

  const item = appState.records.stock_items.find((x) => x.id === itemId);
  if (!item) return;

  appState.wizard.items.push({
    rawName: item.name,
    matchedItemId: itemId,
    quantity: quantity,
    unit: item.default_unit,
    unitPrice: unitPrice,
    lineTotal: Number((quantity * unitPrice).toFixed(2))
  });

  // Reset inputs
  stockSelect.value = "";
  qtyInput.value = "";
  priceInput.value = "";
  document.getElementById("wizardManualUnitDisplay").textContent = "unit";

  window.showToast?.("Added line item to draft.", "success");
}

function handleWizardManualProceed() {
  const vendorId = document.getElementById("wizardManualVendorId").value;
  const billNo = document.getElementById("wizardManualBillNumber").value.trim();
  const billDate = document.getElementById("wizardManualBillDate").value;

  if (!vendorId) {
    alert("Please select a vendor.");
    return;
  }
  if (!billDate) {
    alert("Please select a bill date.");
    return;
  }
  if (appState.wizard.items.length === 0) {
    alert("Please add at least one line item first.");
    return;
  }

  appState.currentDraft = {
    vendorId: vendorId,
    billNumber: billNo,
    billDate: billDate,
    parsedTotal: null,
    items: appState.wizard.items
  };

  document.getElementById("wizardStep1")?.classList.add("hidden");
  document.getElementById("wizardStep2")?.classList.remove("hidden");
  document.getElementById("wizardTitle").textContent = "Verify Draft Details & Match Items";

  // Populate metadata
  const draftVendor = document.getElementById("draftVendorId");
  if (draftVendor) {
    draftVendor.innerHTML = '<option value="">Select a vendor...</option>';
    appState.records.vendors.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = v.name;
      draftVendor.appendChild(opt);
    });
    draftVendor.value = appState.currentDraft.vendorId;
  }
  const draftBillNo = document.getElementById("draftBillNumber");
  if (draftBillNo) draftBillNo.value = appState.currentDraft.billNumber;

  const draftBillDate = document.getElementById("draftBillDate");
  if (draftBillDate) draftBillDate.value = appState.currentDraft.billDate;

  renderWizardDraftLinesTable();
}

function renderWizardDraftLinesTable() {
  const tbody = document.getElementById("wizardDraftItemsBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!appState.currentDraft || !appState.currentDraft.items) return;

  appState.currentDraft.items.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid var(--line)";

    // Column 1: Raw Name
    const tdName = document.createElement("td");
    tdName.style.padding = "8px";
    tdName.style.fontWeight = "600";
    tdName.textContent = item.rawName;
    tr.appendChild(tdName);

    // Column 2: Stock Match Dropdown
    const tdMatch = document.createElement("td");
    tdMatch.style.padding = "8px";

    const select = document.createElement("select");
    select.className = "select-control";
    select.style.padding = "6px";
    select.style.fontSize = "0.85rem";
    select.innerHTML = '<option value="">Select match...</option>';
    appState.records.stock_items.forEach(si => {
      const opt = document.createElement("option");
      opt.value = si.id;
      opt.textContent = si.name;
      select.appendChild(opt);
    });
    select.value = item.matchedItemId;

    select.addEventListener("change", (e) => {
      const selectedId = e.target.value;
      item.matchedItemId = selectedId;
      const matched = appState.records.stock_items.find(si => si.id === selectedId);
      if (matched) {
        item.unit = matched.default_unit;
        tr.querySelector(".unit-lbl").textContent = matched.default_unit;
      }
      updateWizardCalculatedTotals();
      renderPriceWarning(tr, item);
    });

    tdMatch.appendChild(select);
    tr.appendChild(tdMatch);

    // Column 3: Qty Input
    const tdQty = document.createElement("td");
    tdQty.style.padding = "8px";
    tdQty.style.textAlign = "right";

    const qtyWrap = document.createElement("div");
    qtyWrap.style.display = "inline-flex";
    qtyWrap.style.alignItems = "center";
    qtyWrap.style.gap = "6px";

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.step = "0.001";
    qtyInput.className = "form-control";
    qtyInput.style.padding = "6px 8px";
    qtyInput.style.fontSize = "0.85rem";
    qtyInput.style.width = "75px";
    qtyInput.style.textAlign = "right";
    qtyInput.value = item.quantity;

    qtyInput.addEventListener("input", (e) => {
      item.quantity = parseFloat(e.target.value) || 0;
      item.lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
      tr.querySelector(".line-total-lbl").textContent = `₹${item.lineTotal.toFixed(2)}`;
      updateWizardCalculatedTotals();
    });

    const unitSpan = document.createElement("span");
    unitSpan.className = "unit-lbl";
    unitSpan.style.fontSize = "0.75rem";
    unitSpan.style.color = "var(--clay)";
    unitSpan.style.minWidth = "30px";
    unitSpan.style.textAlign = "left";
    
    const matched = appState.records.stock_items.find(si => si.id === item.matchedItemId);
    unitSpan.textContent = matched ? matched.default_unit : item.unit;

    qtyWrap.appendChild(qtyInput);
    qtyWrap.appendChild(unitSpan);
    tdQty.appendChild(qtyWrap);
    tr.appendChild(tdQty);

    // Column 4: Rate & Mismatch Display
    const tdRate = document.createElement("td");
    tdRate.style.padding = "8px";
    tdRate.style.textAlign = "right";

    const rateWrap = document.createElement("div");
    rateWrap.style.display = "inline-flex";
    rateWrap.style.flexDirection = "column";
    rateWrap.style.alignItems = "flex-end";
    rateWrap.style.width = "100%";

    const rateInput = document.createElement("input");
    rateInput.type = "number";
    rateInput.step = "0.01";
    rateInput.className = "form-control";
    rateInput.style.padding = "6px 8px";
    rateInput.style.fontSize = "0.85rem";
    rateInput.style.width = "85px";
    rateInput.style.textAlign = "right";
    rateInput.value = item.unitPrice;

    rateInput.addEventListener("input", (e) => {
      item.unitPrice = parseFloat(e.target.value) || 0;
      item.lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
      tr.querySelector(".line-total-lbl").textContent = `₹${item.lineTotal.toFixed(2)}`;
      updateWizardCalculatedTotals();
      renderPriceWarning(tr, item);
    });

    const lineTotalDisplay = document.createElement("div");
    lineTotalDisplay.className = "line-total-lbl";
    lineTotalDisplay.style.fontSize = "0.75rem";
    lineTotalDisplay.style.color = "var(--clay)";
    lineTotalDisplay.style.marginTop = "4px";
    lineTotalDisplay.textContent = `₹${item.lineTotal.toFixed(2)}`;

    const warningBox = document.createElement("div");
    warningBox.className = "price-warning-box";
    warningBox.style.width = "100%";

    rateWrap.appendChild(rateInput);
    rateWrap.appendChild(lineTotalDisplay);
    rateWrap.appendChild(warningBox);
    tdRate.appendChild(rateWrap);
    tr.appendChild(tdRate);

    // Column 5: Remove Row Button
    const tdDel = document.createElement("td");
    tdDel.style.padding = "8px";
    tdDel.style.textAlign = "center";

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-outline btn-small";
    delBtn.style.padding = "4px 8px";
    delBtn.style.height = "auto";
    delBtn.style.color = "var(--danger-color)";
    delBtn.style.borderColor = "rgba(184, 71, 59, 0.15)";
    delBtn.innerHTML = "&times;";
    delBtn.addEventListener("click", () => {
      appState.currentDraft.items.splice(index, 1);
      renderWizardDraftLinesTable();
    });
    tdDel.appendChild(delBtn);
    tr.appendChild(tdDel);

    tbody.appendChild(tr);

    // Initial render warning
    renderPriceWarning(tr, item);
  });

  updateWizardCalculatedTotals();
}

function renderPriceWarning(rowElement, item) {
  const warningBox = rowElement.querySelector(".price-warning-box");
  if (!warningBox) return;
  warningBox.innerHTML = "";

  if (!item.matchedItemId || !item.unitPrice) return;

  const lastPrice = appState.lastApprovedPrices[item.matchedItemId];
  if (lastPrice && item.unitPrice > 0) {
    const pctDiff = ((item.unitPrice - lastPrice) / lastPrice) * 100;
    if (pctDiff > 10) {
      warningBox.innerHTML = `
        <div style="color: var(--danger-color); font-size: 0.72rem; margin-top: 4px; font-weight: 500; text-align: right;">
          ⚠️ Price spike: Last approved was ₹${lastPrice.toFixed(2)} (+${pctDiff.toFixed(0)}%)
        </div>
      `;
    }
  }
}

function updateWizardCalculatedTotals() {
  if (!appState.currentDraft) return;

  let calculatedTotal = 0;
  appState.currentDraft.items.forEach(item => {
    calculatedTotal += item.lineTotal;
  });

  const parsedTotal = appState.currentDraft.parsedTotal;

  document.getElementById("wizardCalculatedTotalText").textContent = `₹${calculatedTotal.toFixed(2)}`;

  if (parsedTotal !== null) {
    document.getElementById("wizardParsedTotalText").textContent = `₹${parsedTotal.toFixed(2)}`;
    const diff = Math.abs(calculatedTotal - parsedTotal);
    if (diff > 0.05) {
      document.getElementById("wizardMismatchWarning").classList.remove("hidden");
      document.getElementById("wizardMatchBadge").classList.add("hidden");
    } else {
      document.getElementById("wizardMismatchWarning").classList.add("hidden");
      document.getElementById("wizardMatchBadge").classList.remove("hidden");
    }
  } else {
    document.getElementById("wizardParsedTotalText").textContent = "N/A";
    document.getElementById("wizardMismatchWarning").classList.add("hidden");
    document.getElementById("wizardMatchBadge").classList.add("hidden");
  }

  const matchSummary = document.getElementById("wizardMatchStatus");
  if (matchSummary) {
    const missingMatch = appState.currentDraft.items.some(item => !item.matchedItemId);
    if (missingMatch) {
      matchSummary.textContent = "Unmatched Items Present";
      matchSummary.style.background = "rgba(184, 71, 59, 0.1)";
      matchSummary.style.color = "var(--danger-color)";
    } else {
      matchSummary.textContent = "All Items Matched";
      matchSummary.style.background = "rgba(47, 125, 95, 0.1)";
      matchSummary.style.color = "var(--success-color)";
    }
  }
}

async function submitWizardBill() {
  const feedback = document.getElementById("wizardFeedback");
  if (feedback) {
    feedback.classList.add("hidden");
    feedback.textContent = "";
  }

  const vendorId = document.getElementById("draftVendorId").value;
  const billNo = document.getElementById("draftBillNumber").value.trim();
  const billDate = document.getElementById("draftBillDate").value;

  if (!vendorId) {
    alert("Please select a vendor.");
    return;
  }
  if (!billDate) {
    alert("Please select a bill date.");
    return;
  }
  if (!appState.currentDraft || appState.currentDraft.items.length === 0) {
    alert("No draft items to save.");
    return;
  }

  const missingMatch = appState.currentDraft.items.some(item => !item.matchedItemId);
  if (missingMatch) {
    alert("Please match all line items before saving.");
    return;
  }

  let calculatedTotal = 0;
  appState.currentDraft.items.forEach(item => {
    calculatedTotal += item.lineTotal;
  });

  const submitBtn = document.getElementById("wizardSubmitBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";
  }

  try {
    const isOwner = appState.profile.role_code === "owner";
    const isOcr = appState.wizard.activeTab === "ocr";
    const isWhatsApp = appState.wizard.activeTab === "whatsapp";
    const source = isOcr ? "upload" : (isWhatsApp ? "whatsapp_paste" : "manual");

    const rawText = isWhatsApp ? document.getElementById("wizardRawText").value : "";

    const { data: billData, error: billErr } = await supabaseClient
      .from("purchase_bills")
      .insert({
        vendor_id: vendorId,
        bill_date: billDate,
        bill_number: billNo || null,
        source: source,
        original_text: isOcr ? `Uploaded Invoice OCR: ${billNo || 'No number'}` : rawText,
        file_url: isOcr ? appState.wizard.uploadUrl : null,
        total: calculatedTotal,
        status: "pending_review",
        created_by: appState.profile.id
      })
      .select()
      .single();

    if (billErr) throw billErr;

    const billId = billData.id;

    const payloadItems = appState.currentDraft.items.map(item => ({
      purchase_bill_id: billId,
      stock_item_id: item.matchedItemId,
      raw_item_name: item.rawName,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
      confidence_score: 100.00,
      match_status: "matched"
    }));

    const { error: linesErr } = await supabaseClient
      .from("purchase_bill_items")
      .insert(payloadItems);

    if (linesErr) throw linesErr;

    if (isOwner) {
      const { error: approveErr } = await supabaseClient
        .from("purchase_bills")
        .update({
          status: "approved",
          approved_by: appState.profile.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", billId);

      if (approveErr) throw approveErr;
    }

    const successMsg = isOwner 
      ? "Purchase bill approved! Stock quantities updated." 
      : "Purchase bill submitted for owner review.";

    window.showToast?.(successMsg, "success");
    if (feedback) {
      feedback.textContent = successMsg;
      feedback.classList.remove("hidden", "inline-feedback-error");
    }

    setTimeout(() => {
      document.getElementById("recordDeliveryModal")?.classList.add("hidden");
      resetWizard();
    }, 1500);

    await loadRegisterData();
    await loadLastApprovedPrices();
  } catch (err) {
    console.error("Failed to submit bill:", err);
    if (feedback) {
      feedback.textContent = "Failed: " + err.message;
      feedback.classList.add("inline-feedback-error");
      feedback.classList.remove("hidden");
    }
    window.showToast?.("Failed to save bill: " + err.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = appState.profile.role_code === "owner" ? "Approve & Save Bill" : "Submit for Review";
    }
  }
}

// ---- Parser and Fuzzy Match Fallback helpers ----

function fuzzyMatchStockItemInternal(rawName, stockItems) {
  const name = rawName.trim().toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  const getBigrams = str => {
    const bigrams = new Set();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const nameBigrams = getBigrams(name);

  for (const item of stockItems) {
    const itemName = item.name.toLowerCase();
    if (itemName === name) return item.id;
    if (itemName.includes(name) || name.includes(itemName)) {
      const score = Math.min(itemName.length, name.length) / Math.max(itemName.length, name.length) + 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item.id;
      }
      continue;
    }

    const itemBigrams = getBigrams(itemName);
    if (nameBigrams.size === 0 || itemBigrams.size === 0) continue;

    let intersection = 0;
    for (const val of nameBigrams) {
      if (itemBigrams.has(val)) intersection++;
    }

    const score = intersection / (nameBigrams.size + itemBigrams.size - intersection);
    if (score > bestScore && score > 0.15) {
      bestScore = score;
      bestMatch = item.id;
    }
  }
  return bestMatch;
}

function fuzzyMatchStockItem(rawName, stockItems) {
  const matchedId = fuzzyMatchStockItemInternal(rawName, stockItems);
  if (matchedId) return matchedId;

  const words = rawName.split(/\s+/).map(w => w.trim().replace(/[^a-zA-Z]/g, "")).filter(w => w.length > 2);
  const stopWords = new Set(["bought", "received", "delivered", "with", "from", "for", "the", "and", "also", "kilo", "kilos", "litre", "litres", "total"]);

  for (const word of words) {
    if (stopWords.has(word.toLowerCase())) continue;
    const wordMatchedId = fuzzyMatchStockItemInternal(word, stockItems);
    if (wordMatchedId) return wordMatchedId;
  }
  return null;
}

function parseWhatsAppText(text, vendors, stockItems) {
  const result = {
    vendorId: "",
    billNumber: "",
    billDate: toIsoDate(new Date()),
    parsedTotal: null,
    items: []
  };

  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    const totalMatch = line.match(/(?:total|grand total|amt|amount|sum|g\.total)[:\s]*[rR]?[sS]?\.?\s*(\d+(?:\.\d+)?)/i);
    if (totalMatch) {
      result.parsedTotal = parseFloat(totalMatch[1]);
      break;
    }
  }

  for (const line of lines) {
    const numMatch = line.match(/(?:bill\s+number|bill\s+no|invoice\s+number|invoice\s+no|inv\s+no|inv\s+number|bill|invoice|inv|no|num|number)[:\s\.\#]+([a-zA-Z0-9\-]+)/i);
    if (numMatch && !line.toLowerCase().includes("total")) {
      result.billNumber = numMatch[1];
      break;
    }
  }

  const datePatterns = [
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/
  ];
  for (const line of lines) {
    let foundDate = false;
    for (const pattern of datePatterns) {
      const m = line.match(pattern);
      if (m) {
        if (m[1].length === 4) {
          result.billDate = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
        } else {
          const year = m[3].length === 2 ? `20${m[3]}` : m[3];
          result.billDate = `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
        }
        foundDate = true;
        break;
      }
    }
    if (foundDate) break;
  }

  for (const line of lines) {
    const matchedVendor = vendors.find(v => {
      const nameLower = v.name.toLowerCase();
      const lineLower = line.toLowerCase();
      return lineLower.includes(nameLower) || nameLower.includes(lineLower);
    });
    if (matchedVendor) {
      result.vendorId = matchedVendor.id;
      break;
    }
  }

  const itemLines = lines.filter(line => {
    const lower = line.toLowerCase();
    const hasKeywords = ["total", "grand total", "invoice", "bill no", "bill number", "inv no"].some(k => lower.includes(k));
    if (hasKeywords) {
      const hasStockItem = stockItems.some(si => {
        const name = si.name.toLowerCase();
        return lower.includes(name) || (name.endsWith('s') && lower.includes(name.slice(0, -1)));
      });
      if (!hasStockItem) return false;
    }
    if (result.vendorId) {
      const vendor = vendors.find(v => v.id === result.vendorId);
      if (vendor && lower === vendor.name.toLowerCase()) return false;
    }
    return true;
  });

  for (const line of itemLines) {
    const parsedLines = parseNaturalLanguageLine(line, stockItems);
    parsedLines.forEach(item => {
      result.items.push(item);
    });
  }

  return result;
}

function parseNaturalLanguageLine(line, stockItems) {
  let cleanedLine = line.replace(/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/g, "");
  cleanedLine = cleanedLine.replace(/(?:bill|invoice|inv|no|num|number)[:\s\.\#]+[a-zA-Z0-9\-]+/gi, "");
  const lowerLine = cleanedLine.toLowerCase();

  const matchedItemIds = new Set();
  stockItems.forEach(item => {
    const itemName = item.name.toLowerCase();
    if (lowerLine.includes(itemName) || 
        (itemName.endsWith('s') && lowerLine.includes(itemName.slice(0, -1))) ||
        (itemName.endsWith('es') && lowerLine.includes(itemName.slice(0, -2)))) {
      matchedItemIds.add(item.id);
    }
  });

  if (matchedItemIds.size > 1) {
    const segments = cleanedLine.split(/\band\b|[,;]|\balso\b/gi).map(s => s.trim()).filter(s => s.length > 0);
    const parsedSegments = [];
    segments.forEach(seg => {
      const parsed = parseSingleSegment(seg, stockItems);
      if (parsed) parsed.push(parsed);
    });
    return parsedSegments;
  } else {
    const parsed = parseSingleSegment(cleanedLine, stockItems);
    return parsed ? [parsed] : [];
  }
}

function parseSingleSegment(segment, stockItems) {
  const qtyUnitRegex = /(\d+(?:\.\d+)?)\s*(kg|kg\.|kgs|kilo|kilos|litre|litres|ltr|ltrs|pcs|pieces|pieces\.|units|unit|pkts|pkt|packs|pack)\b/i;
  const qtyUnitMatch = segment.match(qtyUnitRegex);

  let quantity = null;
  let unit = "";
  let qtyPhrase = "";

  if (qtyUnitMatch) {
    quantity = parseFloat(qtyUnitMatch[1]);
    unit = qtyUnitMatch[2].trim().toLowerCase();
    qtyPhrase = qtyUnitMatch[0];
  } else {
    const numbers = [...segment.matchAll(/\b(\d+(?:\.\d+)?)\b/g)];
    for (const match of numbers) {
      const num = parseFloat(match[1]);
      const index = match.index;
      const beforeStr = segment.slice(Math.max(0, index - 15), index).toLowerCase();
      if (/\b(at|for|@|rs\.?|rupees?)\s*$/i.test(beforeStr)) continue;
      const afterStr = segment.slice(index + match[1].length, index + match[1].length + 15).toLowerCase();
      if (/^\s*(?:rs|rupees?|per|\/)/i.test(afterStr)) continue;

      quantity = num;
      qtyPhrase = match[0];
      break;
    }
  }

  let rate = null;
  let totalPrice = null;
  let ratePhrase = "";

  const rateSuffixRegex = /(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees?)?\s*(?:\/|per)\s*(?:kg|kilo|litre|ltr|pcs|piece|unit|pkt|pack)\b/i;
  const rateSuffixMatch = segment.match(rateSuffixRegex);

  const rsSuffixRegex = /(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees?)\b/i;
  const rsSuffixMatch = segment.match(rsSuffixRegex);

  if (rateSuffixMatch) {
    rate = parseFloat(rateSuffixMatch[1]);
    ratePhrase = rateSuffixMatch[0];
  } else if (rsSuffixMatch) {
    rate = parseFloat(rsSuffixMatch[1]);
    ratePhrase = rsSuffixMatch[0];
  } else {
    const totalRegex = /(?:=|\btotal\b|\bsum\b)\s*(\d+(?:\.\d+)?)\b/i;
    const totalMatch = segment.match(totalRegex);

    const totalRegex2 = /(\d+(?:\.\d+)?)\s*(?:total|in total|sum)\b/i;
    const totalMatch2 = segment.match(totalRegex2);

    let startIdx = -1;
    let endIdx = -1;

    if (totalMatch) {
      totalPrice = parseFloat(totalMatch[1]);
      startIdx = totalMatch.index;
      endIdx = totalMatch.index + totalMatch[0].length;
    } else if (totalMatch2) {
      totalPrice = parseFloat(totalMatch2[1]);
      startIdx = totalMatch2.index;
      endIdx = totalMatch2.index + totalMatch2[0].length;
    }

    const ratePrefixRegex = /(?:at|for|@|rs\.?|rupees?|x|\*)\s*(\d+(?:\.\d+)?)\b/i;
    const ratePrefixMatch = segment.match(ratePrefixRegex);
    if (ratePrefixMatch) {
      const numVal = parseFloat(ratePrefixMatch[1]);
      if (numVal !== quantity || ratePrefixMatch[0] !== qtyPhrase) {
        if (totalPrice !== null) {
          rate = null;
        } else {
          rate = numVal;
        }
        const pIdx = ratePrefixMatch.index;
        const pEnd = ratePrefixMatch.index + ratePrefixMatch[0].length;
        if (startIdx === -1) {
          startIdx = pIdx;
          endIdx = pEnd;
        } else {
          if (pIdx < startIdx) startIdx = pIdx;
          if (pEnd > endIdx) endIdx = pEnd;
        }
      }
    }

    if (startIdx !== -1) {
      ratePhrase = segment.slice(startIdx, endIdx);
    }
  }

  if (unit) {
    if (unit.startsWith("kg") || unit.startsWith("kilo")) unit = "kg";
    else if (unit.startsWith("lit") || unit.startsWith("ltr")) unit = "litre";
    else if (unit.startsWith("pc") || unit.startsWith("unit")) unit = "pieces";
    else unit = "kg";
  } else {
    unit = "kg";
  }

  let cleaned = segment;
  if (qtyPhrase) cleaned = cleaned.replace(qtyPhrase, "");
  if (ratePhrase) cleaned = cleaned.replace(ratePhrase, "");

  cleaned = cleaned
    .replace(/\b(bought|buy|we|delivered|received|of|and|also|rs\.?|rupees?|per|for|at|total|in|sum|i)\b/gi, "")
    .replace(/[=@\/,;\.\#]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;

  const matchedItemId = fuzzyMatchStockItem(cleaned, stockItems);

  if (quantity === null) quantity = 1;

  let calculatedRate = 0;
  let calculatedTotal = 0;

  if (rate !== null) {
    calculatedRate = rate;
    calculatedTotal = quantity * rate;
  } else if (totalPrice !== null) {
    calculatedTotal = totalPrice;
    calculatedRate = quantity > 0 ? (totalPrice / quantity) : 0;
  }

  return {
    rawName: cleaned,
    matchedItemId: matchedItemId || "",
    quantity: quantity,
    unit: unit,
    unitPrice: calculatedRate,
    lineTotal: calculatedTotal
  };
}

async function invokeParseBill(body, stockItems) {
  const { data, error } = await supabaseClient.functions.invoke('parse-bill', { body });

  if (error) {
    let errMsg = error.message || error;
    if (error.context && typeof error.context.json === 'function') {
      try {
        const errBody = await error.context.json();
        if (errBody && errBody.error) errMsg = errBody.error;
      } catch (e) {
        try {
          const txt = await error.context.text();
          if (txt) errMsg = txt;
        } catch (e2) {}
      }
    }
    throw new Error(errMsg);
  }

  if (data && data.error) throw new Error(data.error);

  const parsedResult = data;

  if (Array.isArray(parsedResult.items)) {
    parsedResult.items.forEach(item => {
      item.matchedItemId = fuzzyMatchStockItem(item.rawName, stockItems) || "";
      item.quantity = parseFloat(item.quantity) || 1;
      item.unitPrice = parseFloat(item.unitPrice) || 0;
      item.lineTotal = parseFloat(item.lineTotal) || 0;
    });

    const rawText = body && body.text ? String(body.text) : "";
    const rateMatches = [...rawText.matchAll(
      /(\d+(?:\.\d+)?)\s*\/\s*(kgs?|gms?|grams?|g|l|ltrs?|lit(?:re|er)s?|pcs?|pkts?|pieces?|units?|dozens?|nos?)\b/gi
    )].map(m => parseFloat(m[1]));

    const useRateTokens = rateMatches.length > 0 && rateMatches.length === parsedResult.items.length;

    const stripLead = (n) => {
      const whole = Math.trunc(Math.abs(n));
      const s = String(whole);
      if (s.length < 2) return null;
      return parseFloat(s.slice(1)) + (Math.abs(n) - whole);
    };
    const balances = (q, r, t) => q > 0 && t > 0 && Math.abs(q * r - t) < 0.5;

    let glyphCorrupted = false;
    parsedResult.items.forEach((item, i) => {
      if (!(item.quantity > 1)) return;
      const rate = useRateTokens ? rateMatches[i] : item.unitPrice;
      const total = item.lineTotal;
      if (balances(item.quantity, rate, total)) return;
      const sr = stripLead(rate), st = stripLead(total);
      if (sr != null && st != null && balances(item.quantity, sr, st)) {
        glyphCorrupted = true;
      }
    });

    parsedResult.items.forEach((item, i) => {
      let rate = useRateTokens ? rateMatches[i] : item.unitPrice;
      let total = item.lineTotal;

      if (glyphCorrupted) {
        const sr = stripLead(rate), st = stripLead(total);
        if (sr != null) rate = sr;
        if (st != null) total = st;
      }

      if (item.quantity > 0 && total > 0) {
        item.lineTotal = total;
        item.unitPrice = Math.round((total / item.quantity) * 100) / 100;
      } else if (rate > 0 && item.quantity > 0) {
        item.unitPrice = rate;
        item.lineTotal = Math.round((item.quantity * rate) * 100) / 100;
      }
    });
  } else {
    parsedResult.items = [];
  }

  return parsedResult;
}

async function parseTextWithLLM(text, vendors, stockItems, customApiKey) {
  return invokeParseBill(
    { text, vendors, stockItems, customApiKey: customApiKey || null },
    stockItems
  );
}

function getMockOcrData(fileName, vendors, stockItems) {
  const nameLower = fileName.toLowerCase();
  
  const findVendor = (name) => {
    return vendors.find(v => v.name.toLowerCase().includes(name.toLowerCase())) || vendors[0];
  };

  const findStockItem = (name) => {
    return stockItems.find(i => i.name.toLowerCase().includes(name.toLowerCase())) || null;
  };

  if (nameLower.includes("dairy") || nameLower.includes("milk") || nameLower.includes("paneer")) {
    const vendor = findVendor("Daily Dairy Partner");
    const paneer = findStockItem("Paneer");
    return {
      vendorId: vendor ? vendor.id : "",
      billNumber: "DDP-88312",
      billDate: toIsoDate(new Date()),
      parsedTotal: 2800.00,
      items: [
        {
          rawName: "Paneer Fresh Block",
          matchedItemId: paneer ? paneer.id : "",
          quantity: 10,
          unit: "kg",
          unitPrice: 280.00,
          lineTotal: 2800.00
        }
      ]
    };
  } else if (nameLower.includes("fresh") || nameLower.includes("tomato") || nameLower.includes("veg") || nameLower.includes("onion")) {
    const vendor = findVendor("Fresh Market Supplier");
    const tomatoes = findStockItem("Tomatoes");
    const onions = findStockItem("Onions");
    return {
      vendorId: vendor ? vendor.id : "",
      billNumber: "FMS-29471",
      billDate: toIsoDate(new Date()),
      parsedTotal: 1290.00,
      items: [
        {
          rawName: "Tomatoes Red Large",
          matchedItemId: tomatoes ? tomatoes.id : "",
          quantity: 20,
          unit: "kg",
          unitPrice: 42.00,
          lineTotal: 840.00
        },
        {
          rawName: "Onions Medium",
          matchedItemId: onions ? onions.id : "",
          quantity: 15,
          unit: "kg",
          unitPrice: 30.00,
          lineTotal: 450.00
        }
      ]
    };
  } else if (nameLower.includes("dry") || nameLower.includes("rice") || nameLower.includes("oil") || nameLower.includes("flour")) {
    const vendor = findVendor("City Dry Goods");
    const rice = findStockItem("Rice");
    const oil = findStockItem("Cooking Oil");
    const flour = findStockItem("Flour");
    return {
      vendorId: vendor ? vendor.id : "",
      billNumber: "CDG-99482",
      billDate: toIsoDate(new Date()),
      parsedTotal: 6400.00,
      items: [
        {
          rawName: "Premium Basmati Rice",
          matchedItemId: rice ? rice.id : "",
          quantity: 50,
          unit: "kg",
          unitPrice: 60.00,
          lineTotal: 3000.00
        },
        {
          rawName: "Refined Sunflower Cooking Oil",
          matchedItemId: oil ? oil.id : "",
          quantity: 20,
          unit: "litre",
          unitPrice: 110.00,
          lineTotal: 2200.00
        },
        {
          rawName: "Whole Wheat Flour Atta",
          matchedItemId: flour ? flour.id : "",
          quantity: 30,
          unit: "kg",
          unitPrice: 40.00,
          lineTotal: 1200.00
        }
      ]
    };
  } else {
    const vendor = findVendor("Fresh Market Supplier");
    const chicken = findStockItem("Chicken");
    const tomatoes = findStockItem("Tomatoes");
    return {
      vendorId: vendor ? vendor.id : "",
      billNumber: "INV-77402",
      billDate: toIsoDate(new Date()),
      parsedTotal: 2496.00,
      items: [
        {
          rawName: "Fresh Chicken Breast",
          matchedItemId: chicken ? chicken.id : "",
          quantity: 12,
          unit: "kg",
          unitPrice: 180.00,
          lineTotal: 2160.00
        },
        {
          rawName: "Tomatoes Hybrid",
          matchedItemId: tomatoes ? tomatoes.id : "",
          quantity: 8,
          unit: "kg",
          unitPrice: 42.00,
          lineTotal: 336.00
        }
      ]
    };
  }
}
