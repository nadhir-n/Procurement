const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');

const additionalAppJs = `
// --- Accessibility and Settings Logic added dynamically ---
document.addEventListener('DOMContentLoaded', () => {
    // Accessibility Theme Toggle
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        });
    }

    // Accessibility Font Size Toggle
    const accBtn = document.getElementById('btn-accessibility');
    if (accBtn) {
        accBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('large-text');
            localStorage.setItem('large-text', document.body.classList.contains('large-text') ? 'true' : 'false');
        });
    }

    // Apply saved preferences
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');
    if (localStorage.getItem('large-text') === 'true') document.body.classList.add('large-text');

    // Settings Tabs Logic
    const settingsNavItems = document.querySelectorAll('.settings-nav-item');
    settingsNavItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all nav
            settingsNavItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Hide all tabs
            document.querySelectorAll('.settings-tab').forEach(tab => tab.style.display = 'none');
            
            // Show target tab
            const targetId = item.getAttribute('data-tab');
            const targetTab = document.getElementById(targetId);
            if (targetTab) {
                targetTab.style.display = 'block';
            }
        });
    });
});
`;

if (!appJs.includes('Accessibility and Settings Logic')) {
    fs.writeFileSync('app.js', appJs + additionalAppJs);
}

// Modify Onboarding Form Handling in app.js
appJs = fs.readFileSync('app.js', 'utf8');
appJs = appJs.replace(
  /document\.getElementById\('onboarding-signup-form'\)\.addEventListener\('submit', async \(e\) => \{[\s\S]*?\}\);/,
  `document.getElementById('onboarding-signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = 'Creating Organization...';
    btn.disabled = true;

    const orgName = document.getElementById('signup-org-name').value;
    const domain = document.getElementById('signup-org-domain').value;
    const adminName = document.getElementById('signup-user-name').value;
    const adminEmail = document.getElementById('signup-user-email').value;
    const currency = document.getElementById('signup-currency') ? document.getElementById('signup-currency').value : 'USD';

    try {
      const res = await apiRequest('POST', '/api/developer/organizations', {
        name: orgName,
        domain: domain,
        admin_email: adminEmail,
        currency: currency
      });
      showToast('Organization created successfully!', 'success');
      document.getElementById('onboarding-overlay').style.display = 'none';
      await loadWorkspaces(); // Refresh workspaces
    } catch (err) {
      showToast('Error creating organization: ' + err.message, 'error');
    } finally {
      btn.innerText = oldText;
      btn.disabled = false;
    }
  });`
);
fs.writeFileSync('app.js', appJs);
