const SUPABASE_URL = "https://xbaihdutmydielypymlv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_H5hfJElwUFl-yJR35qtc2w_Fz2MfZRU";

const appState = {
  profile: null,
  records: {
    stock_items: [],
    vendors: []
  },
  currentDraft: null,
  activeTab: "paste",
  uploadedFile: null,
  uploadUrl: null
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

    wireCaptureEvents();
    await setupCapture(session.user);
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

function wireCaptureEvents() {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  document.getElementById("demoBtn1")?.addEventListener("click", () => {
    document.getElementById("rawBillText").value = `Fresh Market Supplier
I bought tomato for 10 rupees per kilo and I bought 100 kilos
Total 1000`;
  });

  document.getElementById("demoBtn2")?.addEventListener("click", () => {
    document.getElementById("rawBillText").value = `City Dry Goods
Bill No: CDG-4482
Bill Date: 2026-05-20
Rice 25 kg @ 60 rs and cooking oil 10 litres for 110 per ltr
Flour 15 kg for 600 total
Total 3200`;
  });

  document.getElementById("parseBillBtn")?.addEventListener("click", handleParseText);
  document.getElementById("clearCapturedBillBtn")?.addEventListener("click", clearDraftForm);
  document.getElementById("saveCapturedBillBtn")?.addEventListener("click", saveCapturedBill);

  // Prevent accidental changes to number inputs via mouse wheel scrolling
  window.addEventListener("wheel", () => {
    if (document.activeElement && document.activeElement.type === "number") {
      document.activeElement.blur();
    }
  });

  // Capture Tabs switching
  const tabPaste = document.getElementById("tabPaste");
  const tabUpload = document.getElementById("tabUpload");
  const pasteWorkspace = document.getElementById("pasteWorkspace");
  const uploadWorkspace = document.getElementById("uploadWorkspace");

  tabPaste?.addEventListener("click", () => {
    tabPaste.classList.add("capture-tab-active");
    tabUpload?.classList.remove("capture-tab-active");
    pasteWorkspace?.classList.remove("hidden");
    uploadWorkspace?.classList.add("hidden");
    appState.activeTab = "paste";
    clearDraftForm();
  });

  tabUpload?.addEventListener("click", () => {
    tabUpload.classList.add("capture-tab-active");
    tabPaste?.classList.remove("capture-tab-active");
    uploadWorkspace?.classList.remove("hidden");
    pasteWorkspace?.classList.add("hidden");
    appState.activeTab = "upload";
    clearDraftForm();
  });

  // Upload Zone triggering file input
  const uploadZone = document.getElementById("uploadZone");
  const billFileInput = document.getElementById("billFileInput");
  const uploadBrowse = document.querySelector(".upload-browse");

  const triggerFileSelect = () => {
    billFileInput?.click();
  };

  uploadZone?.addEventListener("click", (e) => {
    if (e.target !== billFileInput) {
      triggerFileSelect();
    }
  });

  uploadBrowse?.addEventListener("click", (e) => {
    e.stopPropagation();
    triggerFileSelect();
  });

  // Drag and Drop handlers
  uploadZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("dragover");
  });

  uploadZone?.addEventListener("dragleave", () => {
    uploadZone.classList.remove("dragover");
  });

  uploadZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  });

  billFileInput?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  // File Removal button
  document.getElementById("removeFileBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    clearUploadedFile();
  });

  // Extract OCR button click
  document.getElementById("extractOcrBtn")?.addEventListener("click", handleOcrExtraction);

  // Side-by-side Attachment collapsible panel toggle
  const toggleAttachmentBtn = document.getElementById("toggleAttachmentBtn");
  const visualAttachmentContent = document.getElementById("visualAttachmentContent");
  const chevron = document.querySelector(".visual-attachment-chevron");

  toggleAttachmentBtn?.addEventListener("click", () => {
    const isHidden = visualAttachmentContent.classList.toggle("hidden");
    if (chevron) {
      chevron.textContent = isHidden ? "▼" : "▲";
    }
  });
}

async function setupCapture(user) {
  document.getElementById("userEmail").textContent = user.email || "";

  const { data: profile, error } = await supabaseClient
    .from("user_access_view")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    document.getElementById("userRole").textContent = "Needs setup";
    document.getElementById("welcomeTitle").textContent = "Profile missing";
    document.getElementById("welcomeText").textContent = "Add a matching row in public.users, then reload the page.";
    return;
  }

  appState.profile = profile;
  
  // Set role display and button text based on role
  const isOwner = profile.role_code === "owner";
  document.getElementById("userRole").textContent = isOwner ? "Owner" : "Staff";
  
  const saveBtn = document.getElementById("saveCapturedBillBtn");
  if (saveBtn) {
    saveBtn.textContent = isOwner ? "Approve & Save Bill" : "Submit for Review";
  }

  if (isOwner) {
    document.getElementById("welcomeTitle").textContent = "Paste & Direct Approve Bills";
    document.getElementById("welcomeText").textContent = "Paste any supplier WhatsApp message, review the matches, and approve. Once approved, the stock ledger is updated immediately.";
  } else {
    document.getElementById("welcomeTitle").textContent = "Paste Bills for Review";
    document.getElementById("welcomeText").textContent = "Digitize and submit supplier bills for Owner review. Staff entries are saved in pending status.";
  }

  await loadCaptureMasterData();
  await loadActiveAlertsBadge();
}

async function loadCaptureMasterData() {
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

  appState.records.stock_items = stockItems || [];
  appState.records.vendors = vendors || [];

  if (err1 || err2) {
    const alert = document.getElementById("setupAlert");
    alert.textContent = `Error loading master data: ${err1?.message || err2?.message}`;
    alert.classList.remove("hidden");
  }

  populateVendorDropdown();
}

function populateVendorDropdown() {
  const select = document.getElementById("extractedVendorId");
  if (!select) return;

  // Clear existing items except default
  select.innerHTML = '<option value="">Select a vendor...</option>';
  
  appState.records.vendors.forEach(v => {
    const option = document.createElement("option");
    option.value = v.id;
    option.textContent = v.name;
    select.appendChild(option);
  });
}

function fuzzyMatchStockItemInternal(rawName, stockItems) {
  const name = rawName.trim().toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  // Get bigrams of a string
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
    
    // Exact or substring match gets very high score
    if (itemName === name) return item.id;
    if (itemName.includes(name) || name.includes(itemName)) {
      const score = Math.min(itemName.length, name.length) / Math.max(itemName.length, name.length) + 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item.id;
      }
      continue;
    }

    // Jaccard similarity of bigrams
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
  // First attempt: match the whole string
  const matchedId = fuzzyMatchStockItemInternal(rawName, stockItems);
  if (matchedId) return matchedId;

  // Second attempt: tokenize and try to match individual words
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
    billDate: new Date().toISOString().split("T")[0],
    parsedTotal: null,
    items: []
  };

  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  // 1. Scan for total
  for (const line of lines) {
    const totalMatch = line.match(/(?:total|grand total|amt|amount|sum|g\.total)[:\s]*[rR]?[sS]?\.?\s*(\d+(?:\.\d+)?)/i);
    if (totalMatch) {
      result.parsedTotal = parseFloat(totalMatch[1]);
      break;
    }
  }

  // 2. Scan for bill number
  for (const line of lines) {
    const numMatch = line.match(/(?:bill\s+number|bill\s+no|invoice\s+number|invoice\s+no|inv\s+no|inv\s+number|bill|invoice|inv|no|num|number)[:\s\.\#]+([a-zA-Z0-9\-]+)/i);
    if (numMatch && !line.toLowerCase().includes("total")) {
      result.billNumber = numMatch[1];
      break;
    }
  }

  // 3. Scan for date
  const datePatterns = [
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, // YYYY-MM-DD
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/  // DD-MM-YYYY or MM-DD-YYYY
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

  // 4. Scan for Vendor
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

  // 5. Scan for Items using the new Natural Language Parser
  const itemLines = lines.filter(line => {
    const lower = line.toLowerCase();
    const hasKeywords = ["total", "grand total", "invoice", "bill no", "bill number", "inv no"].some(k => lower.includes(k));
    if (hasKeywords) {
      const hasStockItem = stockItems.some(si => {
        const name = si.name.toLowerCase();
        return lower.includes(name) || (name.endsWith('s') && lower.includes(name.slice(0, -1)));
      });
      if (!hasStockItem) {
        return false;
      }
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
  // Pre-clean dates and bill numbers so they don't interfere with standalone numbers
  let cleanedLine = line.replace(/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/g, "");
  cleanedLine = cleanedLine.replace(/(?:bill|invoice|inv|no|num|number)[:\s\.\#]+[a-zA-Z0-9\-]+/gi, "");

  const lowerLine = cleanedLine.toLowerCase();

  // Find all matched stock items in the line to determine if we split or parse as single
  const matchedItemIds = new Set();
  stockItems.forEach(item => {
    const itemName = item.name.toLowerCase();
    // Check if the item name or its singular form is in the line
    if (lowerLine.includes(itemName) || 
        (itemName.endsWith('s') && lowerLine.includes(itemName.slice(0, -1))) ||
        (itemName.endsWith('es') && lowerLine.includes(itemName.slice(0, -2)))) {
      matchedItemIds.add(item.id);
    }
  });

  // If multiple stock items are matched, or if there's an 'and' connecting distinct items,
  // we split by clauses.
  if (matchedItemIds.size > 1) {
    const segments = cleanedLine.split(/\band\b|[,;]|\balso\b/gi).map(s => s.trim()).filter(s => s.length > 0);
    const parsedSegments = [];
    segments.forEach(seg => {
      const parsed = parseSingleSegment(seg, stockItems);
      if (parsed) {
        parsedSegments.push(parsed);
      }
    });
    return parsedSegments;
  } else {
    const parsed = parseSingleSegment(cleanedLine, stockItems);
    return parsed ? [parsed] : [];
  }
}

function parseSingleSegment(segment, stockItems) {
  // 1. Extract Quantity & Unit
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
    // Look for standalone numbers that aren't rates
    const numbers = [...segment.matchAll(/\b(\d+(?:\.\d+)?)\b/g)];
    for (const match of numbers) {
      const num = parseFloat(match[1]);
      const index = match.index;
      
      const beforeStr = segment.slice(Math.max(0, index - 15), index).toLowerCase();
      // If it's preceded by rate characters, skip
      if (/\b(at|for|@|rs\.?|rupees?)\s*$/i.test(beforeStr)) {
        continue;
      }
      
      const afterStr = segment.slice(index + match[1].length, index + match[1].length + 15).toLowerCase();
      // If it's followed by rate units or indicators, skip
      if (/^\s*(?:rs|rupees?|per|\/)/i.test(afterStr)) {
        continue;
      }
      
      quantity = num;
      qtyPhrase = match[0];
      break;
    }
  }

  // 2. Extract Rate / Price
  let rate = null;
  let totalPrice = null;
  let ratePhrase = "";
  
  // Rate suffix with unit, e.g. "10/kg", "10 rs per kilo", "10 rs/kg", "10 per kg"
  const rateSuffixRegex = /(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees?)?\s*(?:\/|per)\s*(?:kg|kilo|litre|ltr|pcs|piece|unit|pkt|pack)\b/i;
  const rateSuffixMatch = segment.match(rateSuffixRegex);
  
  // Rate suffix without unit, e.g. "100 rs", "100 rupees"
  const rsSuffixRegex = /(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees?)\b/i;
  const rsSuffixMatch = segment.match(rsSuffixRegex);

  if (rateSuffixMatch) {
    rate = parseFloat(rateSuffixMatch[1]);
    ratePhrase = rateSuffixMatch[0];
  } else if (rsSuffixMatch) {
    rate = parseFloat(rsSuffixMatch[1]);
    ratePhrase = rsSuffixMatch[0];
  } else {
    // Total price suffix (e.g. "= 420", "total 1400", "for 1400 total")
    const totalRegex = /(?:=|\btotal\b|\bsum\b)\s*(\d+(?:\.\d+)?)\b/i;
    const totalMatch = segment.match(totalRegex);
    
    // Fallback total price suffix check (like "1400 total")
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
    
    // Rate prefix (including @, x, *, at, for, rs)
    const ratePrefixRegex = /(?:at|for|@|rs\.?|rupees?|x|\*)\s*(\d+(?:\.\d+)?)\b/i;
    const ratePrefixMatch = segment.match(ratePrefixRegex);
    if (ratePrefixMatch) {
      const numVal = parseFloat(ratePrefixMatch[1]);
      if (numVal !== quantity || ratePrefixMatch[0] !== qtyPhrase) {
        // If we have total price matched, this "for [num]" is part of the total price phrase
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

  // Standardize units
  if (unit) {
    if (unit.startsWith("kg") || unit.startsWith("kilo")) unit = "kg";
    else if (unit.startsWith("lit") || unit.startsWith("ltr")) unit = "litre";
    else if (unit.startsWith("pc") || unit.startsWith("unit")) unit = "pieces";
    else unit = "kg";
  } else {
    unit = "kg";
  }

  // 3. Extract Item Name
  let cleaned = segment;
  if (qtyPhrase) cleaned = cleaned.replace(qtyPhrase, "");
  if (ratePhrase) cleaned = cleaned.replace(ratePhrase, "");
  
  cleaned = cleaned
    .replace(/\b(bought|buy|we|delivered|received|of|and|also|rs\.?|rupees?|per|for|at|total|in|sum|i)\b/gi, "")
    .replace(/[=@\/,;\.\#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
    
  if (!cleaned) return null;

  // Fuzzy match item name
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
  } else {
    calculatedRate = 0;
    calculatedTotal = 0;
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

function handleParseText() {
  const text = document.getElementById("rawBillText").value.trim();
  const feedback = document.getElementById("saveFeedback");
  if (feedback) feedback.classList.add("hidden");

  if (!text) {
    alert("Please paste some bill text first!");
    return;
  }

  const parsed = parseWhatsAppText(text, appState.records.vendors, appState.records.stock_items);
  
  if (parsed.items.length === 0) {
    alert("Could not extract any line items. Please format lines like: Tomato 10 kg x 42 = 420");
    return;
  }

  appState.currentDraft = parsed;

  // Show form, hide placeholder
  document.getElementById("draftPlaceholder").classList.add("hidden");
  document.getElementById("extractedBillForm").classList.remove("hidden");

  // Populate metadata
  document.getElementById("extractedVendorId").value = parsed.vendorId;
  document.getElementById("extractedBillNumber").value = parsed.billNumber || "";
  document.getElementById("extractedBillDate").value = parsed.billDate;

  renderExtractedLinesTable();
}

function renderExtractedLinesTable() {
  const tbody = document.getElementById("extractedItemsBody");
  tbody.innerHTML = "";

  if (!appState.currentDraft || !appState.currentDraft.items) return;

  appState.currentDraft.items.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid var(--line)";

    // Raw Name Cell
    const tdRaw = document.createElement("td");
    tdRaw.style.padding = "8px";
    tdRaw.style.fontWeight = "500";
    tdRaw.textContent = item.rawName;
    tr.appendChild(tdRaw);

    // Stock Match Cell (Select Dropdown)
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
      
      // Update unit to default unit of matched item
      const matched = appState.records.stock_items.find(si => si.id === selectedId);
      if (matched) {
        item.unit = matched.default_unit;
        tr.querySelector(".item-unit-display").textContent = matched.default_unit;
      }
      updateCalculatedTotals();
    });

    tdMatch.appendChild(select);
    tr.appendChild(tdMatch);

    // Qty Cell
    const tdQty = document.createElement("td");
    tdQty.style.padding = "8px";
    tdQty.style.textAlign = "right";

    const qtyWrap = document.createElement("div");
    qtyWrap.style.display = "flex";
    qtyWrap.style.alignItems = "center";
    qtyWrap.style.justifyContent = "flex-end";
    qtyWrap.style.gap = "4px";

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.className = "form-control";
    qtyInput.style.padding = "6px";
    qtyInput.style.fontSize = "0.85rem";
    qtyInput.style.width = "70px";
    qtyInput.style.textAlign = "right";
    qtyInput.step = "0.001";
    qtyInput.value = item.quantity;
    
    qtyInput.addEventListener("input", (e) => {
      item.quantity = parseFloat(e.target.value) || 0;
      item.lineTotal = item.quantity * item.unitPrice;
      tr.querySelector(".line-total-cell").textContent = `₹${item.lineTotal.toFixed(2)}`;
      updateCalculatedTotals();
    });

    const unitDisplay = document.createElement("span");
    unitDisplay.className = "item-unit-display";
    unitDisplay.style.fontSize = "0.75rem";
    unitDisplay.style.color = "var(--clay)";
    unitDisplay.style.minWidth = "30px";
    
    // Find current matched item unit
    const matched = appState.records.stock_items.find(si => si.id === item.matchedItemId);
    unitDisplay.textContent = matched ? matched.default_unit : item.unit;

    qtyWrap.appendChild(qtyInput);
    qtyWrap.appendChild(unitDisplay);
    tdQty.appendChild(qtyWrap);
    tr.appendChild(tdQty);

    // Rate Cell
    const tdRate = document.createElement("td");
    tdRate.style.padding = "8px";
    tdRate.style.textAlign = "right";

    const rateWrap = document.createElement("div");
    rateWrap.style.display = "flex";
    rateWrap.style.alignItems = "center";
    rateWrap.style.justifyContent = "flex-end";
    rateWrap.style.gap = "4px";

    const rateInput = document.createElement("input");
    rateInput.type = "number";
    rateInput.className = "form-control";
    rateInput.style.padding = "6px";
    rateInput.style.fontSize = "0.85rem";
    rateInput.style.width = "80px";
    rateInput.style.textAlign = "right";
    rateInput.step = "0.01";
    rateInput.value = item.unitPrice;

    rateInput.addEventListener("input", (e) => {
      item.unitPrice = parseFloat(e.target.value) || 0;
      item.lineTotal = item.quantity * item.unitPrice;
      tr.querySelector(".line-total-cell").textContent = `₹${item.lineTotal.toFixed(2)}`;
      updateCalculatedTotals();
    });

    const lineTotalCell = document.createElement("div");
    lineTotalCell.className = "line-total-cell";
    lineTotalCell.style.fontSize = "0.75rem";
    lineTotalCell.style.color = "var(--clay)";
    lineTotalCell.style.marginTop = "4px";
    lineTotalCell.textContent = `₹${item.lineTotal.toFixed(2)}`;

    rateWrap.appendChild(rateInput);
    tdRate.appendChild(rateWrap);
    tdRate.appendChild(lineTotalCell);
    tr.appendChild(tdRate);

    tbody.appendChild(tr);
  });

  updateCalculatedTotals();
}

function updateCalculatedTotals() {
  if (!appState.currentDraft) return;

  // Calculate sum of lines
  let calculatedTotal = 0;
  appState.currentDraft.items.forEach(item => {
    calculatedTotal += item.lineTotal;
  });

  const parsedTotal = appState.currentDraft.parsedTotal;

  // Render totals
  document.getElementById("calculatedTotalText").textContent = `₹${calculatedTotal.toFixed(2)}`;
  
  if (parsedTotal !== null) {
    document.getElementById("parsedTotalText").textContent = `₹${parsedTotal.toFixed(2)}`;
    
    // Check mismatch (allowing slight float error delta)
    const diff = Math.abs(calculatedTotal - parsedTotal);
    if (diff > 0.05) {
      document.getElementById("totalMismatchWarning").classList.remove("hidden");
      document.getElementById("totalMatchBadge").classList.add("hidden");
    } else {
      document.getElementById("totalMismatchWarning").classList.add("hidden");
      document.getElementById("totalMatchBadge").classList.remove("hidden");
    }
  } else {
    document.getElementById("parsedTotalText").textContent = "N/A";
    document.getElementById("totalMismatchWarning").classList.add("hidden");
    document.getElementById("totalMatchBadge").classList.add("hidden");
  }

  // Update badge match status
  const matchSummary = document.getElementById("matchStatusSummary");
  const missingMatch = appState.currentDraft.items.some(item => !item.matchedItemId);
  if (missingMatch) {
    matchSummary.textContent = "Unmatched Items Present";
    matchSummary.style.background = "rgba(220, 53, 69, 0.1)";
    matchSummary.style.color = "#dc3545";
  } else {
    matchSummary.textContent = "All Items Matched";
    matchSummary.style.background = "rgba(47, 125, 95, 0.1)";
    matchSummary.style.color = "#2f7d5f";
  }
}

function clearDraftForm() {
  appState.currentDraft = null;
  appState.uploadedFile = null;
  appState.uploadUrl = null;

  document.getElementById("rawBillText").value = "";
  document.getElementById("extractedBillForm").classList.add("hidden");
  document.getElementById("draftPlaceholder").classList.remove("hidden");
  
  // Reset Upload UI elements
  const billFileInput = document.getElementById("billFileInput");
  if (billFileInput) billFileInput.value = "";
  document.getElementById("fileDetailsCard")?.classList.add("hidden");
  document.getElementById("uploadZone")?.classList.remove("hidden");
  const extractOcrBtn = document.getElementById("extractOcrBtn");
  if (extractOcrBtn) extractOcrBtn.disabled = true;
  
  // Reset Loading screen
  document.getElementById("ocrLoadingScreen")?.classList.add("hidden");

  // Reset visual attachment card
  document.getElementById("visualAttachmentCard")?.classList.add("hidden");
  document.getElementById("visualAttachmentContent")?.classList.add("hidden");
  const chevron = document.querySelector(".visual-attachment-chevron");
  if (chevron) chevron.textContent = "▼";
  document.getElementById("visualAttachmentImg")?.classList.add("hidden");
  document.getElementById("visualAttachmentPdf")?.classList.add("hidden");
  
  const feedback = document.getElementById("saveFeedback");
  if (feedback) {
    feedback.classList.add("hidden");
    feedback.textContent = "";
  }
}

async function saveCapturedBill() {
  const feedback = document.getElementById("saveFeedback");
  feedback.classList.add("hidden");
  feedback.textContent = "";

  const vendorId = document.getElementById("extractedVendorId").value;
  const billDate = document.getElementById("extractedBillDate").value;
  const billNumber = document.getElementById("extractedBillNumber").value.trim();
  const rawText = document.getElementById("rawBillText").value;

  if (!vendorId) {
    alert("Please select a vendor.");
    return;
  }
  if (!billDate) {
    alert("Please select a bill date.");
    return;
  }

  if (!appState.currentDraft || appState.currentDraft.items.length === 0) {
    alert("No items to save.");
    return;
  }

  // Verify all items are matched
  const hasUnmatched = appState.currentDraft.items.some(item => !item.matchedItemId);
  if (hasUnmatched) {
    alert("Please select a stock item match for all line items before saving.");
    return;
  }

  // Calculate total sum
  let grandTotal = 0;
  appState.currentDraft.items.forEach(item => {
    grandTotal += item.lineTotal;
  });

  const saveBtn = document.getElementById("saveCapturedBillBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const isOwner = appState.profile.role_code === "owner";

    // 1. Insert bill with status 'pending_review' initially (required to prevent check constraint errors on null fields)
    const isOcr = appState.activeTab === "upload";
    const { data: billData, error: billErr } = await supabaseClient
      .from("purchase_bills")
      .insert({
        vendor_id: vendorId,
        bill_date: billDate,
        bill_number: billNumber || null,
        source: isOcr ? "ocr_upload" : "whatsapp_paste",
        original_text: isOcr ? `Uploaded Invoice OCR Extraction: ${billNumber || 'No number'}` : rawText,
        file_url: isOcr ? appState.uploadUrl : null,
        total: grandTotal,
        status: "pending_review",
        created_by: appState.profile.id
      })
      .select()
      .single();

    if (billErr) {
      throw new Error(`Failed to create bill: ${billErr.message}`);
    }

    const billId = billData.id;

    // 2. Insert line items
    const lineItemsData = appState.currentDraft.items.map(item => ({
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
      .insert(lineItemsData);

    if (linesErr) {
      throw new Error(`Failed to save line items: ${linesErr.message}`);
    }

    // 3. If Owner, execute direct approval update
    if (isOwner) {
      const { error: approveErr } = await supabaseClient
        .from("purchase_bills")
        .update({
          status: "approved",
          approved_by: appState.profile.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", billId);

      if (approveErr) {
        throw new Error(`Failed to approve bill: ${approveErr.message}`);
      }

      feedback.className = "inline-feedback";
      feedback.textContent = `Success! Bill ${billNumber || billId.substring(0, 8)} approved. Stock ledger updated.`;
      window.showToast?.("Bill approved. Stock ledger updated.", "success");
    } else {
      feedback.className = "inline-feedback";
      feedback.textContent = `Success! Bill submitted for Owner review.`;
      window.showToast?.("Bill submitted for owner review.", "success");
    }

    feedback.classList.remove("hidden");
    
    // Clear textarea and draft after short timeout
    setTimeout(() => {
      clearDraftForm();
    }, 2500);

  } catch (error) {
    console.error("Error saving bill:", error);
    feedback.className = "inline-feedback inline-feedback-error";
    feedback.textContent = error.message;
    feedback.classList.remove("hidden");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = appState.profile.role_code === "owner" ? "Approve & Save Bill" : "Submit for Review";
  }
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

function handleSelectedFile(file) {
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

  appState.uploadedFile = file;

  // Show Details Card & Hide Upload Zone Prompt
  document.getElementById("uploadZone").classList.add("hidden");
  const card = document.getElementById("fileDetailsCard");
  card.classList.remove("hidden");

  // Fill Details
  document.getElementById("fileNameDisplay").textContent = file.name;
  
  let sizeStr = "";
  if (file.size < 1024) sizeStr = `${file.size} B`;
  else if (file.size < 1024 * 1024) sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
  else sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  document.getElementById("fileSizeDisplay").textContent = sizeStr;

  const fileThumbnail = document.getElementById("fileThumbnail");
  const pdfIconPlaceholder = document.getElementById("pdfIconPlaceholder");

  if (isImage) {
    fileThumbnail.classList.remove("hidden");
    pdfIconPlaceholder.classList.add("hidden");
    
    const reader = new FileReader();
    reader.onload = (e) => {
      fileThumbnail.src = e.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    fileThumbnail.classList.add("hidden");
    pdfIconPlaceholder.classList.remove("hidden");
  }

  document.getElementById("extractOcrBtn").disabled = false;
}

function clearUploadedFile() {
  appState.uploadedFile = null;
  appState.uploadUrl = null;
  const fileInput = document.getElementById("billFileInput");
  if (fileInput) fileInput.value = "";
  document.getElementById("fileDetailsCard").classList.add("hidden");
  document.getElementById("uploadZone").classList.remove("hidden");
  document.getElementById("extractOcrBtn").disabled = true;
}

async function handleOcrExtraction() {
  if (!appState.uploadedFile) return;

  const file = appState.uploadedFile;
  const isImage = file.type.startsWith("image/");
  
  // Show loading screen
  document.getElementById("draftPlaceholder").classList.add("hidden");
  document.getElementById("extractedBillForm").classList.add("hidden");
  const loadingScreen = document.getElementById("ocrLoadingScreen");
  loadingScreen.classList.remove("hidden");

  // Reset steps style helper
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

  setStep("stepUpload", "⏳", true, false);
  setStep("stepAnalyze", "⏳", false, false);
  setStep("stepExtract", "⏳", false, false);
  setStep("stepMap", "⏳", false, false);

  try {
    // Step 1: Uploading to Supabase
    const uniqueName = `bill_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const { data: uploadData, error: uploadErr } = await supabaseClient.storage
      .from('bills')
      .upload(uniqueName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadErr) {
      console.warn("Storage upload failed, falling back to simulation link:", uploadErr);
      appState.uploadUrl = URL.createObjectURL(file); // Fallback local object URL
    } else {
      const { data: urlData } = supabaseClient.storage
        .from('bills')
        .getPublicUrl(uniqueName);
      appState.uploadUrl = urlData.publicUrl;
    }

    // Step 1 Complete
    await new Promise(r => setTimeout(r, 400));
    setStep("stepUpload", "✅", false, true);
    setStep("stepAnalyze", "⏳", true, false);

    // Step 2 Complete
    await new Promise(r => setTimeout(r, 450));
    setStep("stepAnalyze", "✅", false, true);
    setStep("stepExtract", "⏳", true, false);

    // Step 3 Complete
    await new Promise(r => setTimeout(r, 450));
    setStep("stepExtract", "✅", false, true);
    setStep("stepMap", "⏳", true, false);

    // Step 4 Complete
    await new Promise(r => setTimeout(r, 400));
    setStep("stepMap", "✅", false, true);

    // Auto-delete from Supabase storage per user request to avoid excess data
    if (!uploadErr) {
      await supabaseClient.storage.from('bills').remove([uniqueName]);
    }
    appState.uploadUrl = null; // Prevent saving broken link to DB

    // Generate mock OCR data
    const mockData = getMockOcrData(file.name, appState.records.vendors, appState.records.stock_items);
    
    // Set active draft
    appState.currentDraft = {
      vendorId: mockData.vendorId,
      billNumber: mockData.billNumber,
      billDate: mockData.billDate,
      parsedTotal: mockData.parsedTotal,
      items: mockData.items
    };

    // Hide Loading, Show Form
    await new Promise(r => setTimeout(r, 200));
    loadingScreen.classList.add("hidden");
    
    const form = document.getElementById("extractedBillForm");
    form.classList.remove("hidden");

    // Populate input fields
    document.getElementById("extractedVendorId").value = mockData.vendorId;
    document.getElementById("extractedBillNumber").value = mockData.billNumber;
    document.getElementById("extractedBillDate").value = mockData.billDate;

    // Render items list
    renderExtractedLinesTable();

    // Render visual attachment box
    const localViewUrl = URL.createObjectURL(file);
    const attachmentImg = document.getElementById("visualAttachmentImg");
    const attachmentPdf = document.getElementById("visualAttachmentPdf");
    const downloadBtn = document.getElementById("downloadAttachmentBtn");

    if (isImage) {
      attachmentImg.src = localViewUrl;
      attachmentImg.classList.remove("hidden");
      attachmentPdf.classList.add("hidden");
    } else {
      attachmentPdf.src = localViewUrl;
      attachmentPdf.classList.remove("hidden");
      attachmentImg.classList.add("hidden");
    }

    if (downloadBtn) {
      downloadBtn.href = appState.uploadUrl || localViewUrl;
    }

    const visualCard = document.getElementById("visualAttachmentCard");
    visualCard.classList.remove("hidden");

  } catch (err) {
    console.error("OCR Extraction failed:", err);
    alert("An error occurred during OCR extraction: " + err.message);
    clearDraftForm();
  }
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
      billDate: new Date().toISOString().split("T")[0],
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
      billDate: new Date().toISOString().split("T")[0],
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
      billDate: new Date().toISOString().split("T")[0],
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
    // Default fallback
    const vendor = findVendor("Fresh Market Supplier");
    const chicken = findStockItem("Chicken");
    const tomatoes = findStockItem("Tomatoes");
    return {
      vendorId: vendor ? vendor.id : "",
      billNumber: "INV-77402",
      billDate: new Date().toISOString().split("T")[0],
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

