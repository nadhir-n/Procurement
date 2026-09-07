const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const newSidebar = `      <nav class="sidebar-menu">
        <div class="sidebar-group-title">Home</div>
        <a class="menu-item active" data-target="dashboard-page" id="nav-dashboard">
          <svg viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          Overview Dashboard
        </a>
        <div class="sidebar-group-title">Catalog</div>
        <a class="menu-item" data-target="catalog-page" id="nav-catalog">
          <svg viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
          Suppliers & Items
        </a>
        <div class="sidebar-group-title">Purchases</div>
        <a class="menu-item" data-target="requisitions-page" id="nav-prs">
          <svg viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Purchase Requisitions
        </a>
        <a class="menu-item" data-target="orders-page" id="nav-pos">
          <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          Purchase Orders
        </a>
        <a class="menu-item" data-target="receipts-page" id="nav-grns">
          <svg viewBox="0 0 24 24"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
          Goods Receipts (GRN)
        </a>
        <a class="menu-item" data-target="matching-page" id="nav-matching">
          <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          3-Way Match Verification
        </a>
        <div class="sidebar-group-title">Reporting & Config</div>
        <a class="menu-item" data-target="budgets-page" id="nav-budgets">
          <svg viewBox="0 0 24 24" style="stroke-width: 2; fill: none; stroke: currentColor;"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          Budgets & Spend Tracking
        </a>
        <a class="menu-item" data-target="settings-page" id="nav-settings">
          <svg viewBox="0 0 24 24" style="stroke-width: 2; fill: none; stroke: currentColor;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          Procurement Settings
        </a>
      </nav>`;

content = content.replace(/<nav class="sidebar-menu">[\s\S]*?<\/nav>/, newSidebar);

const newDrawerLinks = `<div class="drawer-links">
               <a href="#" class="drawer-link" id="btn-theme-toggle">
                 <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                 Toggle Dark Theme
               </a>
               <a href="#" class="drawer-link" id="btn-accessibility">
                 <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                 Accessibility Features
               </a>
               <a href="#" class="drawer-link" id="btn--signup">
                 <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                 Deploy New Instance
               </a>
               <a href="#" class="drawer-link text-danger" id="btn-sign-out">
                 <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                 Sign Out
               </a>
             </div>`;

content = content.replace(/<div class="drawer-links">[\s\S]*?<\/div>/, newDrawerLinks);

const newSettings = `<section class="view-section" id="settings-page">
          <div class="zoho-books-settings-layout">
            <div class="settings-sidebar">
              <div class="settings-nav-item active" data-tab="settings-org">Organization Profile</div>
              <div class="settings-nav-item" data-tab="settings-users">Users & Roles</div>
              <div class="settings-nav-item" data-tab="settings-prefs">Preferences</div>
            </div>
            
            <div class="settings-content">
              <!-- Organization Profile Tab -->
              <div id="settings-org" class="settings-tab active">
                <div class="card form-card zoho-books-form">
                  <div class="form-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem; padding-bottom:1rem; border-bottom: 1px solid var(--border-color);">
                    <h2>Organization Profile</h2>
                    <button type="submit" form="settings-org-form" class="btn btn-primary">Save Changes</button>
                  </div>
                  <div class="form-body">
                    <form id="settings-org-form">
                      <div class="form-group">
                        <label for="settings-currency">System Base Currency</label>
                        <select id="settings-currency" class="form-control">
                          <option value="USD">USD ($) - US Dollars</option>
                          <option value="EUR">EUR (€) - Euros</option>
                          <option value="GBP">GBP (£) - British Pounds</option>
                          <option value="INR">INR (₹) - Indian Rupees</option>
                        </select>
                      </div>
                      <div class="form-group">
                        <label>Workspace ID</label>
                        <input type="text" class="form-control" id="settings-meta-id" readonly disabled>
                      </div>
                      <div class="form-group">
                        <label>Company Name</label>
                        <input type="text" class="form-control" id="settings-meta-name" readonly disabled>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <!-- Users & Roles Tab -->
              <div id="settings-users" class="settings-tab" style="display:none;">
                <div class="card form-card zoho-books-form">
                  <div class="form-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem; padding-bottom:1rem; border-bottom: 1px solid var(--border-color);">
                    <h2>Users & Roles</h2>
                    <button type="submit" form="create-role-form" class="btn btn-primary">Publish Role Profile</button>
                  </div>
                  <div class="form-body">
                    <form id="create-role-form">
                      <div class="form-group">
                        <label for="role-name">Profile Name / Title</label>
                        <input type="text" id="role-name" class="form-control" placeholder="e.g. Finance Controller" required>
                      </div>
                      <div class="form-group">
                        <label>Assign Security Permissions</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                          <label><input type="checkbox" name="permission" value="create_pr" checked> Create Requisitions</label>
                          <label><input type="checkbox" name="permission" value="approve_pr" checked> Approve Requisitions</label>
                          <label><input type="checkbox" name="permission" value="create_po" checked> Convert to POs</label>
                          <label><input type="checkbox" name="permission" value="receive_grn" checked> Issue GRNs</label>
                          <label><input type="checkbox" name="permission" value="match_invoice" checked> Run 3-Way Match</label>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <!-- Preferences Tab -->
              <div id="settings-prefs" class="settings-tab" style="display:none;">
                <div class="card form-card zoho-books-form">
                  <div class="form-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem; padding-bottom:1rem; border-bottom: 1px solid var(--border-color);">
                    <h2>Preferences</h2>
                    <button class="btn btn-primary">Save Preferences</button>
                  </div>
                  <div class="form-body">
                    <div class="form-group">
                      <label for="settings-tolerance">Invoice Matching Tolerance Margin (%)</label>
                      <input type="number" id="settings-tolerance" class="form-control" value="0.0" min="0" max="20" step="0.1">
                    </div>
                    <div class="form-group">
                      <label for="settings-autoapprove">PO Auto-Approval Ceiling ($)</label>
                      <input type="number" id="settings-autoapprove" class="form-control" value="5000" min="0">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>`;

content = content.replace(/<section class="view-section" id="settings-page">[\s\S]*?<\/section>/, newSettings);

const newOnboarding = `<!-- Onboarding Sign-Up Overlay (For New Organizations) -->
  <div id="onboarding-overlay" class="zoho-books-onboarding" style="display: none;">
    <div class="zoho-books-onboarding-container">
      <div class="onboarding-header">
        <h2>Set up your Organization</h2>
        <p>Welcome to ProcureFlow. Enter your organization details to get started.</p>
      </div>
      <div class="onboarding-body">
        <form id="onboarding-signup-form">
          <div class="form-group">
            <label for="signup-org-name">Organization Name *</label>
            <input type="text" id="signup-org-name" class="form-control" required>
          </div>
          <div class="form-row-split">
            <div class="form-group">
              <label for="signup-org-domain">Business Domain Name</label>
              <input type="text" id="signup-org-domain" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="signup-user-name">Your Full Name *</label>
              <input type="text" id="signup-user-name" class="form-control" required>
            </div>
          </div>
          <div class="form-row-split">
            <div class="form-group">
              <label for="signup-user-email">Email Address *</label>
              <input type="email" id="signup-user-email" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="signup-currency">Base Currency</label>
              <select id="signup-currency" class="form-control">
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="INR">INR - Indian Rupee</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="signup-user-limit">Your Default Approval Limit ($)</label>
            <input type="number" id="signup-user-limit" class="form-control" min="0" value="10000" required>
          </div>
          <div class="onboarding-footer">
            <button type="submit" class="btn btn-primary btn-large">Save & Continue</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;

content = content.replace(/<!-- Onboarding Sign-Up Overlay.*?<div class="app-container">/s, newOnboarding + '\\n\\n  <div class="app-container">');

fs.writeFileSync('index.html', content);
