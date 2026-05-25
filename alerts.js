const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYWloZHV0bXlkaWVseXB5bWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTg4MjAsImV4cCI6MjA5NDY5NDgyMH0.f_22JtIO0T3FenTxJHgO0LhFoYHH38UMg_-hJK1K0vE";

const appState = {
  profile: null,
  alerts: [],
  selectedBill: null,
  filters: {
    severity: "all",
    status: "active",
    type: "all"
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

    wireAlertsEvents();
    await setupAlerts(session.user);
  } catch (error) {
    console.error("Session bootstrap failed:", error);
    renderBootError("Could not verify the current session.");
  }
});

function renderBootError(message) {
  console.error(message);
  const badge = document.getElementById("workspaceBadge");
  if (badge) {
    badge.textContent = "Boot Error";
    badge.style.background = "rgba(184, 71, 59, 0.12)";
    badge.style.color = "var(--danger-color)";
  }
  const alertsList = document.getElementById("alertsList");
  if (alertsList) {
    alertsList.innerHTML = `
      <div class="inline-feedback inline-feedback-error">
        <strong>Error:</strong> ${message}
      </div>
    `;
  }
}

function wireAlertsEvents() {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  document.getElementById("closeOnboardingBtn")?.addEventListener("click", () => {
    document.getElementById("onboardingGuide").classList.add("hidden");
  });

  // Filter change listeners
  document.getElementById("filterSeverity")?.addEventListener("change", (e) => {
    appState.filters.severity = e.target.value;
    renderAlertsList();
  });

  document.getElementById("filterStatus")?.addEventListener("change", (e) => {
    appState.filters.status = e.target.value;
    renderAlertsList();
  });

  document.getElementById("filterType")?.addEventListener("change", (e) => {
    appState.filters.type = e.target.value;
    renderAlertsList();
  });

  // Modal close listeners
  document.getElementById("closeModalBtn")?.addEventListener("click", closeReviewModal);
  document.getElementById("reviewModal")?.addEventListener("click", (e) => {
    if (e.target.id === "reviewModal") {
      closeReviewModal();
    }
  });
}

async function setupAlerts(user) {
  document.getElementById("userEmail").textContent = user.email || "";

  const { data: profile, error } = await supabaseClient
    .from("user_access_view")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    renderBootError("Could not verify the user access profile.");
    return;
  }

  appState.profile = profile;
  const isOwner = profile.role_code === "owner";
  document.getElementById("userRole").textContent = isOwner ? "Owner" : "Staff";
  
  const badge = document.getElementById("workspaceBadge");
  if (badge) {
    badge.textContent = isOwner ? "Owner access" : "Staff view-only";
  }

  await loadAlertsData();
  await loadActiveAlertsBadge();
}

async function loadAlertsData() {
  const listContainer = document.getElementById("alertsList");
  if (listContainer) {
    listContainer.innerHTML = `
      <div class="summary-empty" style="text-align: center; padding: 40px;">
        <p>Fetching latest alerts from database...</p>
      </div>
    `;
  }

  try {
    const { data: alerts, error } = await supabaseClient
      .from("bill_alerts")
      .select(`
        *,
        purchase_bills (
          id,
          bill_number,
          bill_date,
          status,
          total,
          extra_charges,
          vendors (
            id,
            name
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    appState.alerts = alerts || [];
    calculateSummaryCards();
    renderAlertsList();
  } catch (err) {
    console.error("Failed to load alerts data:", err);
    renderBootError(err.message);
  }
}

function calculateSummaryCards() {
  const activeAlerts = appState.alerts.filter((a) => a.status === "active");
  const critical = activeAlerts.filter((a) => a.severity === "critical").length;
  const warnings = activeAlerts.filter((a) => a.severity === "warning").length;

  document.getElementById("activeAlertsCountValue").textContent = activeAlerts.length;
  document.getElementById("criticalAlertsCountValue").textContent = critical;
  document.getElementById("warningAlertsCountValue").textContent = warnings;
}

function renderAlertsList() {
  const listContainer = document.getElementById("alertsList");
  if (!listContainer) return;

  const f = appState.filters;
  let filtered = appState.alerts;

  // Apply severity filter
  if (f.severity !== "all") {
    filtered = filtered.filter((a) => a.severity === f.severity);
  }

  // Apply status filter
  if (f.status !== "all") {
    filtered = filtered.filter((a) => a.status === f.status);
  }

  // Apply alert type filter
  if (f.type !== "all") {
    filtered = filtered.filter((a) => a.alert_type === f.type);
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="summary-empty" style="text-align: center; padding: 40px;">
        <p>No alerts match the selected filters.</p>
      </div>
    `;
    return;
  }

  const isOwner = appState.profile?.role_code === "owner";

  listContainer.innerHTML = filtered
    .map((alert) => {
      const severityClass = `alert-row-${alert.status === "active" ? alert.severity : "resolved"}`;
      const badgeClass = `alert-badge-${alert.severity}`;
      const formattedType = alert.alert_type.replace(/_/g, " ");
      const dateStr = new Date(alert.created_at).toLocaleString();
      
      const bill = alert.purchase_bills;
      const vendorName = bill?.vendors?.name || "Unknown Vendor";
      const billNum = bill?.bill_number || `ID: ${bill?.id?.substring(0, 8)}`;
      const billDate = bill?.bill_date || "";

      let statusDescription = "";
      if (alert.status === "resolved") {
        const resDate = alert.resolved_at ? new Date(alert.resolved_at).toLocaleDateString() : "recently";
        statusDescription = `<span style="font-size:0.8rem; color:var(--leaf); font-weight:600; margin-left: 8px;">Resolved ${resDate}</span>`;
      } else if (alert.status === "dismissed") {
        statusDescription = `<span style="font-size:0.8rem; color:var(--clay); font-weight:600; margin-left: 8px;">Dismissed</span>`;
      }

      let actionsHtml = "";
      if (alert.status === "active") {
        if (isOwner) {
          actionsHtml = `
            <div class="alert-actions">
              <button class="btn btn-outline btn-small" style="padding: 6px 12px; font-size: 0.82rem;" onclick="resolveAlertInline('${alert.id}', 'resolved')">Resolve</button>
              <button class="btn btn-outline btn-small" style="padding: 6px 12px; font-size: 0.82rem; color: var(--clay);" onclick="resolveAlertInline('${alert.id}', 'dismissed')">Dismiss</button>
              <button class="btn btn-primary btn-small" style="padding: 6px 12px; font-size: 0.82rem;" onclick="openReviewModal('${bill.id}')">Review Bill</button>
            </div>
          `;
        } else {
          actionsHtml = `
            <div class="alert-actions">
              <button class="btn btn-outline btn-small" style="padding: 6px 12px; font-size: 0.82rem;" onclick="openReviewModal('${bill.id}')">Review Bill</button>
            </div>
          `;
        }
      } else {
        actionsHtml = `
          <div class="alert-actions">
            <button class="btn btn-outline btn-small" style="padding: 6px 12px; font-size: 0.82rem;" onclick="openReviewModal('${bill.id}')">View Bill</button>
          </div>
        `;
      }

      return `
        <div class="alert-row ${severityClass}">
          <div class="alert-meta">
            <div>
              <span class="alert-badge ${badgeClass}">${formattedType}</span>
              <strong>${vendorName}</strong>
              <span style="color: var(--clay); font-size: 0.85rem; margin-left: 10px;">Bill #${billNum} (${billDate})</span>
              ${statusDescription}
            </div>
            <p style="margin: 8px 0 4px; font-size: 0.92rem; color: var(--ink); line-height: 1.4;">${alert.message}</p>
            <span style="font-size: 0.78rem; color: var(--clay);">Flagged on ${dateStr}</span>
          </div>
          ${actionsHtml}
        </div>
      `;
    })
    .join("");
}

async function resolveAlertInline(alertId, newStatus) {
  if (appState.profile?.role_code !== "owner") return;

  try {
    const { error } = await supabaseClient
      .from("bill_alerts")
      .update({
        status: newStatus,
        resolved_by: appState.profile.id,
        resolved_at: new Date().toISOString()
      })
      .eq("id", alertId);

    if (error) throw error;

    await loadAlertsData();
    await loadActiveAlertsBadge();
    window.showToast?.(newStatus === "resolved" ? "Alert resolved." : "Alert dismissed.", "success");
  } catch (err) {
    window.showToast?.(`Failed to update alert: ${err.message}`, "error");
  }
}

async function openReviewModal(billId) {
  const modal = document.getElementById("reviewModal");
  if (!modal) return;

  // Show loading state in modal
  document.getElementById("modalBillMeta").innerHTML = "<p>Loading bill details...</p>";
  document.getElementById("modalAlertsSummary").innerHTML = "";
  document.getElementById("modalBillItemsBody").innerHTML = "";
  document.getElementById("modalActions").innerHTML = "";

  modal.classList.remove("hidden");

  try {
    // Fetch bill details
    const { data: bill, error: billErr } = await supabaseClient
      .from("purchase_bills")
      .select(`
        *,
        vendors (
          name
        )
      `)
      .eq("id", billId)
      .single();

    if (billErr) throw billErr;
    appState.selectedBill = bill;

    // Fetch line items
    const { data: items, error: itemsErr } = await supabaseClient
      .from("purchase_bill_items")
      .select(`
        *,
        stock_items (
          name
        )
      `)
      .eq("purchase_bill_id", billId);

    if (itemsErr) throw itemsErr;

    // Fetch alerts for this bill
    const { data: alerts, error: alertsErr } = await supabaseClient
      .from("bill_alerts")
      .select("*")
      .eq("purchase_bill_id", billId);

    if (alertsErr) throw alertsErr;

    // Render bill meta
    const statusLabel = bill.status.toUpperCase();
    const statusColor = bill.status === "approved" ? "var(--leaf)" : bill.status === "rejected" ? "var(--danger-color)" : "var(--marigold)";
    
    let attachmentLinkHtml = "";
    if (bill.file_url) {
      attachmentLinkHtml = `
        <div style="margin-top: 8px;">
          <a href="${bill.file_url}" target="_blank" style="text-decoration: none; color: var(--saffron); font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg> View Attached Receipt
          </a>
        </div>
      `;
    }

    document.getElementById("modalBillMeta").innerHTML = `
      <div>
        <p style="font-size:0.8rem; color:var(--clay); margin-bottom:4px;">VENDOR</p>
        <strong>${bill.vendors?.name || "Unknown"}</strong>
      </div>
      <div>
        <p style="font-size:0.8rem; color:var(--clay); margin-bottom:4px;">BILL DETAILS</p>
        <strong>#${bill.bill_number || "Draft/None"}</strong> (${bill.bill_date})
        ${attachmentLinkHtml}
      </div>
      <div>
        <p style="font-size:0.8rem; color:var(--clay); margin-bottom:4px;">TOTAL AMOUNT</p>
        <strong>₹${bill.total.toFixed(2)}</strong> <span style="font-size:0.85rem; color:var(--clay);">(charges: ₹${bill.extra_charges.toFixed(2)})</span>
      </div>
      <div>
        <p style="font-size:0.8rem; color:var(--clay); margin-bottom:4px;">STATUS</p>
        <span style="font-weight: 700; color: ${statusColor};">${statusLabel}</span>
      </div>
    `;

    // Render alert alerts summary inside modal
    const activeAlerts = alerts.filter(a => a.status === "active");
    if (activeAlerts.length > 0) {
      document.getElementById("modalAlertsSummary").innerHTML = activeAlerts
        .map(a => {
          const typeLabel = a.alert_type.replace(/_/g, " ").toUpperCase();
          const borderStyle = a.severity === "critical" ? "border-left: 3px solid var(--danger-color)" : "border-left: 3px solid var(--marigold)";
          const backgroundStyle = a.severity === "critical" ? "rgba(184, 71, 59, 0.06)" : "rgba(224, 162, 47, 0.06)";
          return `
            <div style="padding: 10px 14px; border-radius: 6px; font-size: 0.88rem; ${borderStyle}; background: ${backgroundStyle}; line-height: 1.4;">
              <strong style="color: ${a.severity === 'critical' ? 'var(--danger-color)' : 'var(--marigold)'}; margin-right: 6px;">[${typeLabel}]</strong>
              ${a.message}
            </div>
          `;
        })
        .join("");
    } else {
      document.getElementById("modalAlertsSummary").innerHTML = `
        <div style="padding: 10px 14px; border-radius: 6px; font-size: 0.88rem; border-left: 3px solid var(--leaf); background: rgba(47, 125, 95, 0.06); color: var(--leaf);">
          No active alerts for this bill.
        </div>
      `;
    }

    // Render items table
    if (items.length > 0) {
      document.getElementById("modalBillItemsBody").innerHTML = items
        .map(item => {
          const matchedName = item.stock_items?.name || `<span style="color: var(--danger-color);">[Unmatched: ${item.raw_item_name}]</span>`;
          return `
            <tr>
              <td><strong>${matchedName}</strong></td>
              <td>${item.quantity}</td>
              <td>${item.unit}</td>
              <td>₹${item.unit_price.toFixed(2)}</td>
              <td>₹${item.line_total.toFixed(2)}</td>
            </tr>
          `;
        })
        .join("");
    } else {
      document.getElementById("modalBillItemsBody").innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--clay);">No items logged for this bill.</td>
        </tr>
      `;
    }

    // Render modal action buttons based on status & role
    const isOwner = appState.profile?.role_code === "owner";
    if (bill.status === "draft" || bill.status === "pending_review") {
      if (isOwner) {
        document.getElementById("modalActions").innerHTML = `
          <button class="btn btn-outline" type="button" onclick="closeReviewModal()">Cancel</button>
          <button class="btn btn-outline" style="border-color: var(--danger-color); color: var(--danger-color);" type="button" onclick="actionBill('${bill.id}', 'rejected')">Reject Bill</button>
          <button class="btn btn-primary" type="button" onclick="actionBill('${bill.id}', 'approved')">Approve Bill</button>
        `;
      } else {
        document.getElementById("modalActions").innerHTML = `
          <span style="font-size:0.85rem; color:var(--clay); align-self:center; margin-right:auto;">View Only: Owner permission required to approve/reject.</span>
          <button class="btn btn-outline" type="button" onclick="closeReviewModal()">Close</button>
        `;
      }
    } else {
      document.getElementById("modalActions").innerHTML = `
        <span style="font-size:0.85rem; color:var(--clay); align-self:center; margin-right:auto;">This bill has already been ${bill.status}.</span>
        <button class="btn btn-outline" type="button" onclick="closeReviewModal()">Close</button>
      `;
    }

  } catch (err) {
    document.getElementById("modalBillMeta").innerHTML = `
      <div class="inline-feedback inline-feedback-error" style="grid-column: span 2;">
        Failed to load bill: ${err.message}
      </div>
    `;
  }
}

function closeReviewModal() {
  document.getElementById("reviewModal")?.classList.add("hidden");
  appState.selectedBill = null;
}

async function actionBill(billId, newStatus) {
  if (appState.profile?.role_code !== "owner") return;

  const btn = document.querySelector("#modalActions .btn-primary");
  if (btn) btn.disabled = true;

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

    closeReviewModal();
    await loadAlertsData();
    await loadActiveAlertsBadge();
  } catch (err) {
    alert(`Failed to update bill: ${err.message}`);
    if (btn) btn.disabled = false;
  }
}

async function loadActiveAlertsBadge() {
  try {
    const { count, error } = await supabaseClient
      .from("bill_alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    if (error) throw error;

    const badge = document.getElementById("alertsCountBadge");
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    }
  } catch (err) {
    console.error("Failed to load active alerts badge:", err);
  }
}

// Global hook references for onclick events inside HTML strings
window.resolveAlertInline = resolveAlertInline;
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.actionBill = actionBill;
