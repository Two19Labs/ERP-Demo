const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYWloZHV0bXlkaWVseXB5bWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTg4MjAsImV4cCI6MjA5NDY5NDgyMH0.f_22JtIO0T3FenTxJHgO0LhFoYHH38UMg_-hJK1K0vE";

const state = {
  profile: null,
  vendors: [],
  stockBalances: [],
  lastVendorsMap: {}, // stock_item_id -> { id, name, phone, contact_name }
  selectedVendorId: "",
  selectedItems: {}, // stock_item_id -> quantity (number)
  setupError: ""
};

let supabaseClient;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabaseClient) {
    renderError("Supabase client failed to load.");
    return;
  }

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
      window.location.href = "index.html";
      return;
    }

    setupAppEvents();
    await initOrderDashboard(session.user);
  } catch (error) {
    console.error("Session bootstrap failed:", error);
    renderError("Could not verify the current session.");
  }
});

function renderError(message) {
  const alert = document.getElementById("setupAlert");
  if (alert) {
    alert.classList.remove("hidden");
    alert.textContent = message;
  }
}

function setupAppEvents() {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  // Filter change listeners
  document.getElementById("searchStockItems")?.addEventListener("input", filterAndRenderTable);
  document.getElementById("filterCategory")?.addEventListener("change", filterAndRenderTable);
  document.getElementById("filterLowStockOnly")?.addEventListener("change", filterAndRenderTable);

  // Vendor selection listener
  document.getElementById("vendorSelect")?.addEventListener("change", (e) => {
    state.selectedVendorId = e.target.value;
    updateVendorDetailsCard();
    updateMessagePreview();
  });

  // Custom greeting listener
  document.getElementById("customGreeting")?.addEventListener("input", updateMessagePreview);

  // Order via WhatsApp button listener
  document.getElementById("sendOrderBtn")?.addEventListener("click", launchWhatsAppOrder);
}

async function initOrderDashboard(user) {
  document.getElementById("userEmail").textContent = user.email || "";

  // Get user profile
  const { data: profile } = await supabaseClient
    .from("user_access_view")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile) {
    state.profile = profile;
    const isOwner = profile.role_code === "owner";
    const roleLabel = isOwner ? "Owner" : "Staff";
    document.body.classList.add(`role-${profile.role_code}`);
    document.getElementById("userRole").textContent = roleLabel;
  }

  await loadActiveAlertsBadge();
  await loadData();
}

async function loadActiveAlertsBadge() {
  try {
    const { count, error } = await supabaseClient
      .from('bill_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
      
    const badge = document.getElementById('alertsCountBadge');
    if (badge && count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Failed to load active alerts badge:', err);
  }
}

async function loadData() {
  try {
    // 1. Fetch active vendors
    const { data: vendors, error: errVendors } = await supabaseClient
      .from("vendors")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (errVendors) throw errVendors;
    state.vendors = vendors || [];

    // 2. Fetch active stock balances
    const { data: balances, error: errBalances } = await supabaseClient
      .from("stock_item_balances")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (errBalances) throw errBalances;
    state.stockBalances = balances || [];

    // 3. Fetch past approved purchase bill items to find default/last vendor
    const { data: purchases, error: errPurchases } = await supabaseClient
      .from("purchase_bill_items")
      .select(`
        stock_item_id,
        purchase_bills !inner (
          bill_date,
          vendor_id,
          vendors (
            id,
            name,
            phone,
            contact_name
          )
        )
      `)
      .eq("purchase_bills.status", "approved");

    if (errPurchases) throw errPurchases;

    // Deduce the last vendor for each stock item
    if (purchases && purchases.length > 0) {
      // Sort purchases by bill date desc
      const sortedPurchases = [...purchases].sort((a, b) => {
        const dateA = new Date(a.purchase_bills?.bill_date || 0);
        const dateB = new Date(b.purchase_bills?.bill_date || 0);
        return dateB - dateA;
      });

      sortedPurchases.forEach(item => {
        const itemId = item.stock_item_id;
        const vendor = item.purchase_bills?.vendors;
        if (itemId && vendor && !state.lastVendorsMap[itemId]) {
          state.lastVendorsMap[itemId] = {
            id: vendor.id,
            name: vendor.name,
            phone: vendor.phone,
            contact_name: vendor.contact_name
          };
        }
      });
    }

    // Populate Filters & Dropdowns
    populateCategoryFilter();
    populateVendorDropdown();

    // Parse URL parameter to check if redirecting from low-stock shortcut
    parseUrlParameters();

    // Render Table
    filterAndRenderTable();

  } catch (error) {
    console.error("Failed to load order data:", error);
    renderError("Failed to fetch reference database rows: " + error.message);
  }
}

function populateCategoryFilter() {
  const select = document.getElementById("filterCategory");
  if (!select) return;

  // Extract unique categories
  const categories = [...new Set(state.stockBalances.map(x => x.category))].sort();
  
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

function populateVendorDropdown() {
  const select = document.getElementById("vendorSelect");
  if (!select) return;

  select.innerHTML = '<option value="">Choose a vendor...</option>';
  state.vendors.forEach(vendor => {
    const opt = document.createElement("option");
    opt.value = vendor.id;
    opt.textContent = vendor.name + (vendor.phone ? ` (${vendor.phone})` : " (No Phone)");
    select.appendChild(opt);
  });
}

function parseUrlParameters() {
  const params = new URLSearchParams(window.location.search);
  const itemId = params.get("item_id");
  const qtyParam = params.get("qty");

  if (itemId) {
    const balanceItem = state.stockBalances.find(x => x.stock_item_id === itemId);
    if (balanceItem) {
      // Calculate suggested order qty
      const limit = Number(balanceItem.low_stock_threshold);
      const stock = Number(balanceItem.current_quantity);
      let qty = qtyParam ? Number(qtyParam) : Math.max(1, Math.ceil(limit - stock));
      if (isNaN(qty) || qty <= 0) qty = 10;

      // Select it in state
      state.selectedItems[itemId] = qty;

      // Suggest vendor if one exists
      const lastVendor = state.lastVendorsMap[itemId];
      if (lastVendor) {
        state.selectedVendorId = lastVendor.id;
        const select = document.getElementById("vendorSelect");
        if (select) select.value = lastVendor.id;
        updateVendorDetailsCard();
      }
    }
  }
}

function updateVendorDetailsCard() {
  const card = document.getElementById("vendorDetailsCard");
  if (!card) return;

  if (!state.selectedVendorId) {
    card.classList.add("hidden");
    return;
  }

  const vendor = state.vendors.find(x => x.id === state.selectedVendorId);
  if (!vendor) {
    card.classList.add("hidden");
    return;
  }

  card.classList.remove("hidden");
  document.getElementById("vendorDetailName").textContent = vendor.name;
  document.getElementById("vendorDetailContact").textContent = vendor.contact_name || "None listed";
  document.getElementById("vendorDetailPhone").textContent = vendor.phone || "None listed";
  document.getElementById("vendorDetailCategory").textContent = vendor.category_supplied || "General";
  document.getElementById("vendorDetailNotes").textContent = vendor.notes || "";
}

function filterAndRenderTable() {
  const tbody = document.getElementById("stockItemsBody");
  if (!tbody) return;

  const searchQuery = document.getElementById("searchStockItems").value.toLowerCase().trim();
  const categoryFilter = document.getElementById("filterCategory").value;
  const lowStockOnly = document.getElementById("filterLowStockOnly").checked;

  const filtered = state.stockBalances.filter(item => {
    // 1. Search Query
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery)) return false;

    // 2. Category
    if (categoryFilter && item.category !== categoryFilter) return false;

    // 3. Low Stock Alert
    if (lowStockOnly && !item.is_low_stock) return false;

    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="summary-empty" style="text-align: center; padding: 40px 10px;">
          No matching stock items found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const isSelected = item.stock_item_id in state.selectedItems;
    const qty = isSelected ? state.selectedItems[item.stock_item_id] : "";
    const isLow = item.is_low_stock;
    
    let balanceDisplay = Number(item.current_quantity).toFixed(3);
    if (item.current_quantity <= 0) {
      balanceDisplay = `<span class="badge-out-stock">${balanceDisplay}</span>`;
    } else if (isLow) {
      balanceDisplay = `<span class="badge-low-stock">${balanceDisplay}</span>`;
    }

    // Determine past vendor
    const lastVendor = state.lastVendorsMap[item.stock_item_id];
    let vendorDisplay = "None";
    if (lastVendor) {
      vendorDisplay = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-size: 0.85rem; font-weight: 500;">${escapeHtml(lastVendor.name)}</span>
          <button class="btn btn-outline btn-suggest-vendor" onclick="window.selectVendor('${lastVendor.id}')">Select Vendor</button>
        </div>
      `;
    }

    return `
      <tr style="vertical-align: middle;">
        <td style="text-align: center; padding: 12px 8px;">
          <input type="checkbox" class="item-select-checkbox" data-item-id="${item.stock_item_id}" ${isSelected ? 'checked' : ''}>
        </td>
        <td style="padding: 12px 8px;"><strong>${escapeHtml(item.name)}</strong></td>
        <td style="padding: 12px 8px; color: var(--clay);">${escapeHtml(item.category)}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 600;">${balanceDisplay}</td>
        <td style="padding: 12px 8px; text-align: right; color: var(--clay);">${Number(item.low_stock_threshold).toFixed(3)}</td>
        <td style="padding: 12px 8px; color: var(--clay);">${escapeHtml(item.default_unit)}</td>
        <td style="padding: 12px 8px; font-size: 0.82rem;">${vendorDisplay}</td>
        <td style="padding: 8px; text-align: right;">
          <input type="number" step="any" min="0.001" 
                 class="form-control order-qty-input" 
                 placeholder="0.0" 
                 value="${qty}" 
                 data-item-id="${item.stock_item_id}" 
                 ${isSelected ? '' : 'disabled'}>
        </td>
      </tr>
    `;
  }).join("");

  // Wire events for the newly rendered inputs and checkboxes
  wireTableInputEvents();
}

function wireTableInputEvents() {
  const checkboxes = document.querySelectorAll(".item-select-checkbox");
  const qtyInputs = document.querySelectorAll(".order-qty-input");

  checkboxes.forEach(cb => {
    cb.addEventListener("change", (e) => {
      const itemId = e.target.dataset.itemId;
      const row = e.target.closest("tr");
      const qtyInput = row.querySelector(".order-qty-input");

      if (e.target.checked) {
        qtyInput.disabled = false;
        
        // Calculate default/suggested qty
        const item = state.stockBalances.find(x => x.stock_item_id === itemId);
        const limit = Number(item.low_stock_threshold);
        const stock = Number(item.current_quantity);
        let suggestedQty = Math.max(1, Math.ceil(limit - stock));
        if (isNaN(suggestedQty) || suggestedQty <= 0) suggestedQty = 10;
        
        qtyInput.value = suggestedQty;
        state.selectedItems[itemId] = suggestedQty;
      } else {
        qtyInput.disabled = true;
        qtyInput.value = "";
        delete state.selectedItems[itemId];
      }
      updateMessagePreview();
    });
  });

  qtyInputs.forEach(input => {
    input.addEventListener("input", (e) => {
      const itemId = e.target.dataset.itemId;
      const val = Number(e.target.value);
      if (!isNaN(val) && val > 0) {
        state.selectedItems[itemId] = val;
      } else {
        delete state.selectedItems[itemId];
      }
      updateMessagePreview();
    });
  });
}

// Global scope helper for clicking 'Select Vendor' button
window.selectVendor = function(vendorId) {
  state.selectedVendorId = vendorId;
  const select = document.getElementById("vendorSelect");
  if (select) select.value = vendorId;
  updateVendorDetailsCard();
  updateMessagePreview();
};

function generateWhatsAppMessageText(vendor, selectedLines, customGreeting) {
  const contactName = vendor.contact_name || vendor.name;
  let text = `Hello ${contactName},\n\nI would like to place a restock order for the following items:\n`;
  
  selectedLines.forEach(line => {
    text += `- *${line.name}*: ${line.quantity} ${line.unit}\n`;
  });

  if (customGreeting && customGreeting.trim()) {
    text += `\nNote: ${customGreeting.trim()}\n`;
  }

  text += `\nThank you!`;
  return text;
}

function updateMessagePreview() {
  const previewDiv = document.getElementById("whatsappPreview");
  const sendBtn = document.getElementById("sendOrderBtn");
  
  const selectedItemIds = Object.keys(state.selectedItems);
  
  if (!state.selectedVendorId || selectedItemIds.length === 0) {
    previewDiv.innerHTML = `<span style="color: var(--muted);">Choose a vendor and select at least one stock item above with a valid quantity to preview the WhatsApp order message.</span>`;
    sendBtn.disabled = true;
    return;
  }

  const vendor = state.vendors.find(x => x.id === state.selectedVendorId);
  if (!vendor) {
    sendBtn.disabled = true;
    return;
  }

  // Compile items detail list
  const selectedLines = [];
  selectedItemIds.forEach(itemId => {
    const balanceItem = state.stockBalances.find(x => x.stock_item_id === itemId);
    if (balanceItem) {
      selectedLines.push({
        name: balanceItem.name,
        quantity: state.selectedItems[itemId],
        unit: balanceItem.default_unit
      });
    }
  });

  const customGreeting = document.getElementById("customGreeting").value;
  const message = generateWhatsAppMessageText(vendor, selectedLines, customGreeting);

  previewDiv.textContent = message;
  sendBtn.disabled = false;
}

function formatWhatsAppNumber(phone) {
  if (!phone) return "";
  let clean = phone.replace(/\D/g, "");
  // Prefix India country code (91) by default if 10-digit number
  if (clean.length === 10) {
    clean = "91" + clean;
  }
  return clean;
}

function launchWhatsAppOrder() {
  const vendor = state.vendors.find(x => x.id === state.selectedVendorId);
  if (!vendor || !vendor.phone) {
    window.showToast?.("The selected vendor does not have a valid phone number. Please add one in Stock Setup.", "error");
    return;
  }

  const cleanPhone = formatWhatsAppNumber(vendor.phone);
  if (!cleanPhone) {
    window.showToast?.("Could not parse the vendor's phone number.", "error");
    return;
  }

  const messageText = document.getElementById("whatsappPreview").textContent;
  const encodedText = encodeURIComponent(messageText);

  const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  window.open(url, "_blank");
}

// Security Escape HTML Helper
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
