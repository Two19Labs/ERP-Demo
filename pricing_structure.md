# Product Pricing & Feature Tiering Strategy
**Universal Restaurant Stock Tracker (ERP Demo)**

This document outlines the proposed product tiers, layering features from the core basic application to premium AI-assisted and automated verification tools. The pricing spans from the minimum target of **₹15,000** to the maximum target of **₹30,000**.

---

## Tier Comparison Matrix

| Feature Category | Feature Description | Tier 1: Base<br>**₹15,000** | Tier 2: Collaboration<br>**₹17,000 - ₹18,000** | Tier 3: AI Capture<br>**₹20,000 - ₹22,000** | Tier 4: Enterprise/Audit<br>**₹25,000 - ₹30,000** |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Core Inventory** | Stock Item Master & Vendor Directory | Included | Included | Included | Included |
| | Manual Purchase Bill Entry | Included | Included | Included | Included |
| | Stock Ledger (Opening, Wastage, Corrections) | Included | Included | Included | Included |
| **User Access** | Single-User Local Storage / Single Owner Admin | Included | - | - | - |
| | Multi-User Authentication (Supabase Auth) | - | Included | Included | Included |
| | Role-Based Access Control (Owner vs. Staff) | - | Included | Included | Included |
| | Owner-Approval Gate (Staff drafts, Owner approves) | - | Included | Included | Included |
| **AI & Input** | Speech-to-Text Voice Dictation (Web Speech API) | - | - | Included | Included |
| | WhatsApp-style Raw Text Parser | - | - | Included | Included |
| | Smart Entity Auto-Matching (Items & Vendors) | - | - | Included | Included |
| **Auditing & alerts** | OCR Document Upload (PDF & Image Extraction) | - | - | - | Included |
| | Suspicious Bill Alerts (Price jumps, duplicates, etc.) | - | - | - | Included |
| | Historical Price comparison Analytics | - | - | - | Included |

---

## Detailed Tier Breakdown

### 1. Tier 1: Base Inventory Tracker (₹15,000)
*Target: Small single-owner outlets who want to digitize their stock tracking manually and replace physical paper ledgers.*

* **Core Stock Item & Vendor Directory**: Build/modify/delete products (categorized by kg, litres, units) and maintain vendor profiles.
* **Manual Purchase Registry**: Enter supplier bills manually by typing line items, quantities, and rates.
* **Real-time Stock Ledger**: Computes stock movements (`opening + purchases - wastage - returns`).
* **Basic Threshold Alerts**: Flags items in red if current stock levels drop below the defined low-stock limit.

---

### 2. Tier 2: Standard Collaboration & Multi-User Tier (₹17,000 - ₹18,000)
*Target: Outlets where the Owner wants staff to enter bills but retains approval control to prevent fraud.*

* **Authentication Integration**: Secure logins powered by Supabase Auth.
* **Role-Based Access Control (RBAC)**:
  * **Staff Role**: Can capture/upload bills and save them as *Pending Review*. Staff cannot modify approved stock history or approve their own bills.
  * **Owner Role**: Can view pending bills, edit details if necessary, and approve/reject them. Stock increases *only* when the owner approves the bill.
* **Inline Review Action Panel**: A quick-action interface on the Purchase Register for Owners to approve or reject submissions in one click.

---

### 3. Tier 3: AI-Assisted Smart Capture Tier (₹20,000 - ₹22,000)
*Target: Busy managers/owners who want to minimize typing on mobile screens and quickly log purchases via text or voice.*

* **WhatsApp-Style Text Parser**: Paste raw text bills copied directly from WhatsApp. The system parses vendor names, dates, items, quantities, and rates.
* **Smart Name Matching**: AI mapping matching parsed text (e.g., *"Tmt 5kg"*) to actual database items (e.g., *"Tomatoes"*).
* **Voice Dictation (Speech-to-Text)**: Use the Web Speech API directly in the browser to dictate items and quantities (e.g., *"Added 10 kg tomatoes from Fresh Market Supplier"*), automatically transcribing it into draft entries.

---

### 4. Tier 4: Enterprise Audit & Anti-Fraud Suite (₹25,000 - ₹30,000)
*Target: Large-volume businesses seeking complete fraud prevention, invoice price protection, and document scanning.*

* **Document OCR Scanning**: Upload a photo/PDF of physical bills and extract structured fields automatically (OCR Simulation/API integration).
* **Suspicious Bill Alerts (Audit Engine)**:
  * **Price Jump Warning**: Triggers an alert if an item's unit price increases by more than a configured percentage (e.g., >15%) compared to recent purchase history.
  * **Duplicate Bill Number Check**: Warns if a bill number from the same vendor is uploaded twice.
  * **Total Mismatch Check**: Computes individual lines and flags if the calculated total does not match the supplier bill's stated total.
* **Vendor Price Analytics**: Historical price trends over time to identify which vendor is charging more for the same item.
