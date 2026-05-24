// Shared Bill Review Modal component
// Automatically injects the HTML structure if not present in the DOM
// Exports openReviewModal, closeReviewModal, and actionBill to global scope
(function (global) {

 function ensureReviewModal() {
 let modal = document.getElementById("reviewModal");
 if (!modal) {
 modal = document.createElement("div");
 modal.id = "reviewModal";
 modal.className = "modal-overlay hidden";
 modal.innerHTML = `
 <div class="modal-content" style="max-width: 700px; width: 95%;">
 <div class="modal-header">
 <h4>Review Purchase Bill</h4>
 <button id="closeModalBtn" class="modal-close-btn" type="button">&times;</button>
 </div>
 <div style="padding: 20px; max-height: 80vh; overflow-y: auto;">
 <div id="modalBillMeta" style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
 <!-- Loaded dynamically -->
 </div>
 <div id="modalAlertsSummary" style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px;">
 <!-- Alert warnings for this bill -->
 </div>
 <h5>Bill Line Items</h5>
 <div style="overflow-x: auto; margin-top: 10px; border: 1px solid var(--line); border-radius: 6px; margin-bottom: 15px;">
 <table class="bill-items-table" style="width: 100%; border-collapse: collapse;">
 <thead>
 <tr style="background: var(--cream); font-size: 0.85rem; border-bottom: 1px solid var(--line);">
 <th style="padding: 8px; text-align: left;">Item</th>
 <th style="padding: 8px; text-align: right;">Qty</th>
 <th style="padding: 8px; text-align: left;">Unit</th>
 <th style="padding: 8px; text-align: right;">Unit Price</th>
 <th style="padding: 8px; text-align: right;">Total</th>
 </tr>
 </thead>
 <tbody id="modalBillItemsBody">
 <!-- Loaded dynamically -->
 </tbody>
 </table>
 </div>
 <div id="modalActions" class="modal-actions" style="justify-content: flex-end; margin-top: 20px;">
 <!-- Owner approve / reject / cancel buttons -->
 </div>
 </div>
 </div>
 `;
 document.body.appendChild(modal);

 // Bind close events
 document.getElementById("closeModalBtn").addEventListener("click", closeReviewModal);
 modal.addEventListener("click", (e) => {
 if (e.target.id === "reviewModal") closeReviewModal();
 });
 }
 return modal;
 }

 async function getCurrentUserProfile() {
 if (global.appState?.profile) return global.appState.profile;
 
 // Fallback: Fetch directly from Supabase
 try {
 const { data: { user } } = await supabaseClient.auth.getUser();
 if (!user) return null;
 const { data: profile } = await supabaseClient
 .from("users")
 .select("*, roles(code)")
 .eq("id", user.id)
 .single();
 
 if (profile) {
 // Normalize role_code
 profile.role_code = profile.roles?.code || "";
 return profile;
 }
 } catch (e) {
 console.error("Failed to fetch user profile in bill-modal fallback:", e);
 }
 return null;
 }

 async function openReviewModal(billId) {
 ensureReviewModal();
 const modal = document.getElementById("reviewModal");
 modal.classList.remove("hidden");

 // Set loading states
 document.getElementById("modalBillMeta").innerHTML = "<p>Loading bill details...</p>";
 document.getElementById("modalAlertsSummary").innerHTML = "";
 document.getElementById("modalBillItemsBody").innerHTML = "";
 document.getElementById("modalActions").innerHTML = "";

 try {
 // 1. Fetch header
 const { data: bill, error: billErr } = await supabaseClient
 .from("purchase_bills")
 .select(`*, vendors (id, name)`)
 .eq("id", billId)
 .single();

 if (billErr) throw billErr;

 if (global.appState) {
 global.appState.selectedBill = bill;
 }

 // 2. Fetch items
 const { data: items, error: itemsErr } = await supabaseClient
 .from("purchase_bill_items")
 .select(`*, stock_items (name)`)
 .eq("purchase_bill_id", billId);

 if (itemsErr) throw itemsErr;

 // 3. Fetch alerts
 const { data: alerts, error: alertsErr } = await supabaseClient
 .from("bill_alerts")
 .select("*")
 .eq("purchase_bill_id", billId);

 if (alertsErr) throw alertsErr;

 // Render Meta
 const statusLabel = bill.status.toUpperCase();
 const statusColor = bill.status === "approved" ? "var(--leaf)" : bill.status === "rejected" ? "var(--danger-color)" : "var(--marigold)";

 let attachmentHtml = "";
 if (bill.file_url) {
 const safeFileUrl = safeUrl(bill.file_url);
 if (safeFileUrl !== '#') {
 attachmentHtml = `
 <div style="margin-top: 8px;">
 <a href="${safeFileUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: var(--saffron); font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
 <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
 </svg> View Attached Invoice File
 </a>
 </div>`;
 }
 }

 // Add extra charges note if positive
 const chargesText = (bill.extra_charges && Number(bill.extra_charges) > 0) ? ` <span style="font-size:0.85rem; color:var(--clay); font-weight:normal;">(charges: ₹${Number(bill.extra_charges).toFixed(2)})</span>` : "";

 document.getElementById("modalBillMeta").innerHTML = `
 <div>
 <p style="font-size:0.75rem; color:var(--clay); margin-bottom:4px; font-weight:700; letter-spacing:0.04em;">SUPPLIER VENDOR</p>
 <strong>${escapeHtml(bill.vendors?.name || "Unknown")}</strong>
 </div>
 <div>
 <p style="font-size:0.75rem; color:var(--clay); margin-bottom:4px; font-weight:700; letter-spacing:0.04em;">INVOICE DETAILS</p>
 <strong>#${escapeHtml(bill.bill_number || "Draft/None")}</strong> (${escapeHtml(bill.bill_date)})
 ${attachmentHtml}
 </div>
 <div>
 <p style="font-size:0.75rem; color:var(--clay); margin-bottom:4px; font-weight:700; letter-spacing:0.04em;">GRAND TOTAL</p>
 <strong style="color: var(--saffron);">₹${Number(bill.total).toFixed(2)}</strong>${chargesText}
 </div>
 <div>
 <p style="font-size:0.75rem; color:var(--clay); margin-bottom:4px; font-weight:700; letter-spacing:0.04em;">INVENTORY STATUS</p>
 <span style="font-weight: 700; color: ${statusColor};">${escapeHtml(statusLabel)}</span>
 </div>
 `;

 // Render alerts summary
 const activeAlerts = alerts.filter(a => a.status === "active");
 if (activeAlerts.length > 0) {
 document.getElementById("modalAlertsSummary").innerHTML = activeAlerts
 .map(a => {
 const typeLabel = escapeHtml(a.alert_type.replace(/_/g, " ").toUpperCase());
 const borderStyle = a.severity === "critical" ? "border-left: 3px solid var(--danger-color)" : "border-left: 3px solid var(--marigold)";
 const backgroundStyle = a.severity === "critical" ? "rgba(184, 71, 59, 0.06)" : "rgba(224, 162, 47, 0.06)";
 return `
 <div style="padding: 10px 14px; border-radius: 6px; font-size: 0.88rem; ${borderStyle}; background: ${backgroundStyle}; line-height: 1.4;">
 <strong style="color: ${a.severity === 'critical' ? 'var(--danger-color)' : 'var(--marigold)'}; margin-right: 6px;">[${typeLabel}]</strong>
 ${escapeHtml(a.message)}
 </div>
 `;
 })
 .join("");
 } else {
 document.getElementById("modalAlertsSummary").innerHTML = `
 <div style="padding: 10px 14px; border-radius: 6px; font-size: 0.88rem; border-left: 3px solid var(--leaf); background: rgba(47, 125, 95, 0.06); color: var(--leaf);">
 ✓ No active alerts for this bill.
 </div>`;
 }

 // Render items table
 if (items.length > 0) {
 document.getElementById("modalBillItemsBody").innerHTML = items
 .map(item => {
 const matchedName = item.stock_items?.name
 ? escapeHtml(item.stock_items.name)
 : `<span style="color: var(--danger-color);">[Unmatched: ${escapeHtml(item.raw_item_name)}]</span>`;
 return `
 <tr style="border-bottom: 1px solid var(--line);">
 <td style="padding: 8px;"><strong>${matchedName}</strong></td>
 <td style="padding: 8px; text-align: right;">${Number(item.quantity).toFixed(3)}</td>
 <td style="padding: 8px;">${escapeHtml(item.unit)}</td>
 <td style="padding: 8px; text-align: right;">₹${Number(item.unit_price).toFixed(2)}</td>
 <td style="padding: 8px; text-align: right; font-weight: 600;">₹${Number(item.line_total).toFixed(2)}</td>
 </tr>
 `;
 })
 .join("");
 } else {
 document.getElementById("modalBillItemsBody").innerHTML = `
 <tr>
 <td colspan="5" style="text-align: center; color: var(--clay); padding: 20px;">No items logged for this bill.</td>
 </tr>`;
 }

 // Modal Actions based on status & role
 const userProfile = await getCurrentUserProfile();
 const isOwner = userProfile?.role_code === "owner";
 if (bill.status === "draft" || bill.status === "pending_review") {
 if (isOwner) {
 const safeBillId = escapeHtml(bill.id);
 document.getElementById("modalActions").innerHTML = `
 <button class="btn btn-outline" type="button" onclick="closeReviewModal()">Cancel</button>
 <button class="btn btn-outline" style="border-color: var(--danger-color); color: var(--danger-color);" type="button" onclick="actionBill('${safeBillId}', 'rejected')">Reject Bill</button>
 <button class="btn btn-primary" type="button" onclick="actionBill('${safeBillId}', 'approved')">Approve Bill</button>
 `;
 } else {
 document.getElementById("modalActions").innerHTML = `
 <span style="font-size:0.85rem; color:var(--clay); align-self:center; margin-right:auto;">Read-Only: Owner authorization needed to approve.</span>
 <button class="btn btn-outline" type="button" onclick="closeReviewModal()">Close</button>
 `;
 }
 } else {
 document.getElementById("modalActions").innerHTML = `
 <span style="font-size:0.85rem; color:var(--clay); align-self:center; margin-right:auto;">This bill has been ${escapeHtml(bill.status)}.</span>
 <button class="btn btn-outline" type="button" onclick="closeReviewModal()">Close</button>
 `;
 }

 } catch (err) {
 document.getElementById("modalBillMeta").innerHTML = `
 <div class="inline-feedback inline-feedback-error" style="grid-column: span 2;">
 Failed to load bill: ${escapeHtml(err.message)}
 </div>`;
 }
 }

 function closeReviewModal() {
 const modal = document.getElementById("reviewModal");
 if (modal) {
 modal.classList.add("hidden");
 }
 if (global.appState) {
 global.appState.selectedBill = null;
 }
 }

 async function actionBill(billId, newStatus) {
 const userProfile = await getCurrentUserProfile();
 if (userProfile?.role_code !== "owner") return;

 const btn = document.querySelector("#modalActions .btn-primary");
 if (btn) btn.disabled = true;

 try {
 const payload = {
 status: newStatus,
 approved_by: newStatus === "approved" ? userProfile.id : null,
 approved_at: newStatus === "approved" ? new Date().toISOString() : null
 };

 const { error } = await supabaseClient
 .from("purchase_bills")
 .update(payload)
 .eq("id", billId);

 if (error) throw error;

 const msg = newStatus === "approved" ? "Bill approved! Stock ledger updated." : "Bill rejected.";
 window.showToast?.(msg, "success");

 closeReviewModal();

 // Trigger page-specific reloads
 if (typeof global.loadRegisterData === "function") {
 await global.loadRegisterData();
 }
 if (typeof global.loadAlertsData === "function") {
 await global.loadAlertsData();
 }
 if (typeof global.loadDashboardData === "function") {
 await global.loadDashboardData();
 }
 if (typeof global.loadActiveAlertsBadge === "function") {
 await global.loadActiveAlertsBadge();
 }
 } catch (err) {
 alert(`Failed to update bill: ${err.message}`);
 if (btn) btn.disabled = false;
 }
 }

 // Export to global scope
 global.openReviewModal = openReviewModal;
 global.closeReviewModal = closeReviewModal;
 global.actionBill = actionBill;
})(window);
