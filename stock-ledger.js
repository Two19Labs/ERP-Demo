const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYWloZHV0bXlkaWVseXB5bWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTg4MjAsImV4cCI6MjA5NDY5NDgyMH0.f_22JtIO0T3FenTxJHgO0LhFoYHH38UMg_-hJK1K0vE";

const appState = {
 profile: null,
 activeTab: "history",
 records: {
 stock_items: [],
 movements: [],
 clipboard_items: []
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

 // Wire global delete modal
 document.getElementById("cancelDeleteBtn")?.addEventListener("click", hideDeleteModal);
 document.getElementById("confirmDeleteBtn")?.addEventListener("click", executeGlobalDelete);

 // Prevent accidental changes to number inputs via mouse wheel scrolling
 window.addEventListener("wheel", () => {
 if (document.activeElement && document.activeElement.type === "number") {
 document.activeElement.blur();
 }
 });

 // Tab switching and count sheet events
 document.getElementById("viewTabHistory")?.addEventListener("click", () => switchTab("history"));
 document.getElementById("viewTabClipboard")?.addEventListener("click", () => switchTab("clipboard"));
 document.getElementById("resetClipboardBtn")?.addEventListener("click", resetClipboardSheet);
 document.getElementById("submitClipboardBtn")?.addEventListener("click", submitClipboardCount);
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

 // Handle URL query parameters (Phase 4 Shortcuts)
 const urlParams = new URLSearchParams(window.location.search);
 const itemIdParam = urlParams.get("item_id");
 if (itemIdParam) {
 const filterSelect = document.getElementById("filterStockItemId");
 if (filterSelect) {
 filterSelect.value = itemIdParam;
 }
 const moveSelect = document.getElementById("moveStockItemId");
 if (moveSelect) {
 moveSelect.value = itemIdParam;
 // Trigger unit update
 const item = appState.records.stock_items.find((x) => x.id === itemIdParam);
 const unitDisplay = document.getElementById("moveUnitDisplay");
 if (unitDisplay && item) {
 unitDisplay.textContent = item.default_unit;
 }
 }
 }

 const filterParam = urlParams.get("filter");
 if (filterParam === "low_stock") {
 const alertEl = document.getElementById("setupAlert");
 if (alertEl) {
 alertEl.classList.remove("hidden");
 alertEl.style.background = "rgba(224, 162, 47, 0.08)";
 alertEl.style.color = "var(--marigold)";
 alertEl.style.border = "1px solid var(--marigold)";
 alertEl.innerHTML = `
 <span style="font-weight: 500;">Showing only movements for items currently below warning thresholds. </span>
 <a href="stock-ledger.html" style="color: var(--marigold); font-weight: bold; margin-left: 8px; text-decoration: underline;">Clear Filter</a>
 `;
 }
 }

 await loadActiveAlertsBadge();

 // Determine starting tab
 const tabParam = urlParams.get("tab");
 if (tabParam === "clipboard" || (itemIdParam && profile.role_code === "staff")) {
 switchTab("clipboard");
 } else {
 switchTab("history");
 }
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

 // Handle low stock filter shortcut (Phase 4 Shortcut)
 const urlParams = new URLSearchParams(window.location.search);
 if (urlParams.get("filter") === "low_stock") {
 const { data: lowStockItems } = await supabaseClient
 .from("stock_status_view")
 .select("id")
 .or("current_quantity.lte.low_stock_threshold,current_quantity.lte.0")
 .eq("is_active", true);
 
 if (lowStockItems && lowStockItems.length > 0) {
 const lowStockIds = lowStockItems.map(item => item.id);
 query = query.in("stock_item_id", lowStockIds);
 } else {
 // No low stock items, force no results
 query = query.eq("stock_item_id", "00000000-0000-0000-0000-000000000000");
 }
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

 const isOwner = appState.profile?.role_code === 'owner';
 const safeMovementId = escapeHtml(m.id);
 const deleteCell = isOwner
 ? `<td style="padding: 10px 4px; text-align: center;"><button class="btn btn-danger" style="font-size: 0.72rem; padding: 3px 8px; height: auto;" onclick="window.showMovementDeleteModal('${safeMovementId}')">Delete</button></td>`
 : `<td></td>`;

 return `
 <tr>
 <td style="padding: 10px 4px; font-size: 0.85rem; color: var(--clay);">${escapeHtml(timestamp)}</td>
 <td style="padding: 10px 4px;"><strong>${escapeHtml(m.stock_items?.name || "Unknown")}</strong></td>
 <td style="padding: 10px 4px; text-align: center;">
 <span class="record-pill ${typeClass}" style="font-size: 0.7rem; padding: 2px 6px;">${escapeHtml(typeText)}</span>
 </td>
 <td style="padding: 10px 4px; text-align: right; font-weight: bold; color: ${qtyColor};">${sign}${qty.toFixed(3)}</td>
 <td style="padding: 10px 4px; color: var(--clay);">${escapeHtml(m.unit)}</td>
 <td style="padding: 10px 4px; font-size: 0.85rem; color: var(--ink);">${escapeHtml(m.notes || "")}</td>
 ${deleteCell}
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
 window.showToast?.("Error logging movement: " + error.message, "error");
 return;
 }

 setFeedback("Stock movement logged successfully!");
 window.showToast?.("Stock movement logged.", "success");
 
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

// ---- Global Delete Modal (Movements) ----
let deleteMovementTarget = null; // { id: string }

window.showMovementDeleteModal = function(movementId) {
 deleteMovementTarget = { id: movementId };
 const mv = appState.records.movements.find((x) => x.id === movementId);
 const itemName = mv?.stock_items?.name || "Unknown";
 const modal = document.getElementById("globalDeleteModal");
 const title = document.getElementById("deleteModalTitle");
 const text = document.getElementById("deleteModalText");

 title.textContent = "Delete Stock Movement";
 text.textContent = `Are you sure you want to delete this ${itemName} movement record? This will permanently remove it from the audit trail.`;
 modal.classList.add("active");
};

function hideDeleteModal() {
 deleteMovementTarget = null;
 document.getElementById("globalDeleteModal")?.classList.remove("active");
}

async function executeGlobalDelete() {
 if (!deleteMovementTarget) return;
 const { id } = deleteMovementTarget;

 const { error } = await supabaseClient.from("stock_movements").delete().eq("id", id);

 if (error) {
 window.showToast?.("Delete failed: " + error.message, "error");
 } else {
 window.showToast?.("Movement deleted.", "success");
 await loadLedgerData();
 }
 hideDeleteModal();
}

// ---- Tab Switching & Daily Clipboard Logic ----

function switchTab(tab) {
 appState.activeTab = tab;
 const tabHistory = document.getElementById("viewTabHistory");
 const tabClipboard = document.getElementById("viewTabClipboard");
 const viewHistory = document.getElementById("ledgerHistoryView");
 const viewClipboard = document.getElementById("ledgerClipboardView");

 if (tab === "history") {
 tabHistory?.classList.add("tab-button-active");
 tabClipboard?.classList.remove("tab-button-active");
 viewHistory?.classList.remove("hidden");
 viewClipboard?.classList.add("hidden");
 loadLedgerData();
 } else {
 tabHistory?.classList.remove("tab-button-active");
 tabClipboard?.classList.add("tab-button-active");
 viewHistory?.classList.add("hidden");
 viewClipboard?.classList.remove("hidden");
 loadClipboardData();
 }
}

async function loadClipboardData() {
 const body = document.getElementById("clipboardBody");
 if (!body) return;
 
 body.innerHTML = `
 <tr>
 <td colspan="5" class="summary-empty" style="text-align: center; padding: 40px 10px;">Loading active stock balances...</td>
 </tr>
 `;
 
 try {
 const { data: items, error } = await supabaseClient
 .from("stock_item_balances")
 .select("*")
 .eq("is_active", true)
 .order("category", { ascending: true })
 .order("name", { ascending: true });

 if (error) throw error;

 appState.records.clipboard_items = items || [];
 renderClipboardSheet();
 } catch (err) {
 console.error("Failed to load clipboard data:", err);
 window.showToast?.("Failed to load clipboard data: " + err.message, "error");
 }
}

function renderClipboardSheet() {
 const body = document.getElementById("clipboardBody");
 if (!body) return;

 if (appState.records.clipboard_items.length === 0) {
 body.innerHTML = `
 <tr>
 <td colspan="5" class="summary-empty" style="text-align: center; padding: 40px 10px;">No active stock items found to count.</td>
 </tr>
 `;
 return;
 }

 const grouped = {};
 appState.records.clipboard_items.forEach((item) => {
 if (!grouped[item.category]) {
 grouped[item.category] = [];
 }
 grouped[item.category].push(item);
 });

 let html = "";
 for (const [category, list] of Object.entries(grouped)) {
 html += `
 <tr class="category-header-row" style="background: rgba(37, 111, 125, 0.05); font-weight: bold;">
 <td colspan="5" style="padding: 10px 8px; color: var(--saffron); font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em;">
 ${escapeHtml(category)}
 </td>
 </tr>
 `;

 list.forEach((item) => {
 const currentQty = Number(item.current_quantity);
 const isLow = item.is_low_stock;
 const warningBadge = isLow 
 ? `<span class="record-pill record-pill-rejected" style="font-size: 0.65rem; margin-left: 6px; padding: 2px 4px;">Low Stock</span>` 
 : "";

 html += `
 <tr class="clipboard-row" id="row-${item.stock_item_id}" style="border-bottom: 1px solid var(--line); vertical-align: middle;">
 <td style="padding: 12px 8px;">
 <div style="font-weight: 600; color: var(--ink);">${escapeHtml(item.name)} ${warningBadge}</div>
 <div style="font-size: 0.75rem; color: var(--clay);">Unit: ${escapeHtml(item.default_unit)}</div>
 </td>
 <td style="padding: 12px 8px; text-align: right; font-weight: 500; color: var(--ink);">
 ${currentQty.toFixed(3)} <span style="font-size: 0.8rem; color: var(--clay);">${escapeHtml(item.default_unit)}</span>
 </td>
 <td style="padding: 8px 8px 8px 15px;">
 <input type="number" step="0.001" min="0" placeholder="e.g. ${currentQty.toFixed(3)}" 
 class="form-control physical-input" 
 style="padding: 6px 10px; font-size: 0.9rem; width: 100%; text-align: right; background: rgba(255, 255, 255, 0.7);"
 data-item-id="${item.stock_item_id}">
 </td>
 <td style="padding: 8px 8px 8px 15px;">
 <input type="number" step="0.001" min="0" placeholder="0.000" 
 class="form-control wastage-input" 
 style="padding: 6px 10px; font-size: 0.9rem; width: 100%; text-align: right; background: rgba(255, 255, 255, 0.7);"
 data-item-id="${item.stock_item_id}">
 </td>
 <td style="padding: 8px 8px;">
 <select class="select-control wastage-reason" 
 style="padding: 6px 10px; font-size: 0.9rem; width: 100%; height: auto; background: rgba(255, 255, 255, 0.7);"
 data-item-id="${item.stock_item_id}">
 <option value="Spoiled">Spoiled</option>
 <option value="Spilled">Spilled</option>
 <option value="Expired">Expired</option>
 <option value="Other">Other</option>
 </select>
 </td>
 </tr>
 `;
 });
 }

 body.innerHTML = html;

 // If there's an item_id query parameter, highlight and focus it
 const urlParams = new URLSearchParams(window.location.search);
 const itemIdParam = urlParams.get("item_id");
 if (itemIdParam) {
 const row = document.getElementById(`row-${itemIdParam}`);
 if (row) {
 row.style.background = "rgba(224, 162, 47, 0.08)";
 row.scrollIntoView({ behavior: "smooth", block: "center" });
 const input = row.querySelector(".physical-input");
 if (input) input.focus();
 }
 }
}

function resetClipboardSheet() {
 const form = document.getElementById("clipboardForm");
 if (form) {
 form.reset();
 }
 clearClipboardFeedback();
}

async function submitClipboardCount() {
 clearClipboardFeedback();
 const submitBtn = document.getElementById("submitClipboardBtn");
 if (submitBtn) submitBtn.disabled = true;

 try {
 const physicalInputs = document.querySelectorAll("#clipboardBody .physical-input");
 const wastageInputs = document.querySelectorAll("#clipboardBody .wastage-input");
 const reasonSelects = document.querySelectorAll("#clipboardBody .wastage-reason");

 const movements = [];
 const now = new Date().toISOString();
 const createdBy = appState.profile?.id;

 const physicalMap = {};
 physicalInputs.forEach((input) => {
 const itemId = input.dataset.itemId;
 const val = input.value.trim();
 if (val !== "") {
 physicalMap[itemId] = Number(val);
 }
 });

 const wastageMap = {};
 wastageInputs.forEach((input) => {
 const itemId = input.dataset.itemId;
 const val = input.value.trim();
 if (val !== "") {
 const num = Number(val);
 if (num > 0) {
 wastageMap[itemId] = num;
 }
 }
 });

 const reasonMap = {};
 reasonSelects.forEach((select) => {
 const itemId = select.dataset.itemId;
 reasonMap[itemId] = select.value;
 });

 appState.records.clipboard_items.forEach((item) => {
 const itemId = item.stock_item_id;
 const currentQty = Number(item.current_quantity);
 const unit = item.default_unit;

 if (itemId in physicalMap) {
 const physical = physicalMap[itemId];
 const diff = physical - currentQty;

 if (Math.abs(diff) >= 0.001) {
 if (diff < 0) {
 movements.push({
 stock_item_id: itemId,
 movement_type: "usage",
 quantity: -diff,
 unit: unit,
 notes: `Kitchen reconciliation count: entered physical balance ${physical.toFixed(3)} ${unit} (calculated usage: ${(-diff).toFixed(3)} ${unit})`,
 created_by: createdBy,
 created_at: now
 });
 } else {
 movements.push({
 stock_item_id: itemId,
 movement_type: "correction",
 quantity: diff,
 unit: unit,
 notes: `Kitchen reconciliation count: entered physical balance ${physical.toFixed(3)} ${unit} (calculated adjustment: +${diff.toFixed(3)} ${unit})`,
 created_by: createdBy,
 created_at: now
 });
 }
 }
 }

 if (itemId in wastageMap) {
 const wastageQty = wastageMap[itemId];
 const reason = reasonMap[itemId] || "Spoiled";

 movements.push({
 stock_item_id: itemId,
 movement_type: "wastage",
 quantity: wastageQty,
 unit: unit,
 notes: `Kitchen count sheet wastage: logged ${wastageQty.toFixed(3)} ${unit} (${reason})`,
 created_by: createdBy,
 created_at: now
 });
 }
 });

 if (movements.length === 0) {
 setClipboardFeedback("No counts or wastage inputs were entered. Please enter at least one count or wastage amount.", true);
 if (submitBtn) submitBtn.disabled = false;
 return;
 }

 const { error } = await supabaseClient
 .from("stock_movements")
 .insert(movements);

 if (error) throw error;

 window.showToast?.(`Successfully logged ${movements.length} stock movement(s).`, "success");
 setClipboardFeedback(`Success! Logged ${movements.length} adjustments.`, false);
 
 const form = document.getElementById("clipboardForm");
 if (form) form.reset();

 await loadClipboardData();
 } catch (err) {
 console.error("Submit count failed:", err);
 window.showToast?.("Submission failed: " + err.message, "error");
 setClipboardFeedback("Failed to save count: " + err.message, true);
 } finally {
 if (submitBtn) submitBtn.disabled = false;
 }
}

function setClipboardFeedback(message, isError = false) {
 const fb = document.getElementById("clipboardFeedback");
 if (!fb) return;
 fb.textContent = message;
 fb.classList.remove("hidden", "inline-feedback-error");
 if (isError) {
 fb.classList.add("inline-feedback-error");
 }
}

function clearClipboardFeedback() {
 const fb = document.getElementById("clipboardFeedback");
 if (fb) {
 fb.classList.add("hidden");
 fb.textContent = "";
 }
}
