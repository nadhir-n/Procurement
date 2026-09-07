const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

const additionalCSS = `
/* --- Zoho Books Style Overrides --- */

.sidebar-group-title {
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  padding: 1rem 1.5rem 0.25rem 1.5rem;
  margin-top: 0.5rem;
}

/* Zoho Books Form Style */
.zoho-books-form {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border: 1px solid var(--border-color);
  margin-bottom: 2rem;
}

.zoho-books-form .form-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: #fdfdfd;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.zoho-books-form .form-header h2 {
  font-size: 1.25rem;
  color: var(--text-color);
  margin: 0;
}

.zoho-books-form .form-body {
  padding: 2rem 1.5rem;
  max-width: 800px;
}

/* Zoho Books Onboarding Overlay */
.zoho-books-onboarding {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #f4f5f8;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 5vh;
  overflow-y: auto;
}

.zoho-books-onboarding-container {
  background: white;
  width: 100%;
  max-width: 650px;
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  border: 1px solid var(--border-color);
  margin-bottom: 5vh;
}

.zoho-books-onboarding .onboarding-header {
  text-align: center;
  padding: 2.5rem 2rem 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
}

.zoho-books-onboarding .onboarding-header h2 {
  font-size: 1.75rem;
  color: var(--text-color);
  margin-bottom: 0.5rem;
}

.zoho-books-onboarding .onboarding-header p {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.zoho-books-onboarding .onboarding-body {
  padding: 2rem;
}

.zoho-books-onboarding .onboarding-footer {
  padding-top: 1.5rem;
  margin-top: 2rem;
  border-top: 1px solid var(--border-color);
  text-align: right;
}

.zoho-books-onboarding .btn-large {
  padding: 0.75rem 2rem;
  font-size: 1rem;
}

/* Settings Page Layout */
.zoho-books-settings-layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.settings-sidebar {
  width: 250px;
  flex-shrink: 0;
  background: transparent;
}

.settings-nav-item {
  padding: 0.8rem 1rem;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.25rem;
}

.settings-nav-item:hover {
  background: var(--bg-color);
  color: var(--text-color);
}

.settings-nav-item.active {
  background: #eef2ff;
  color: var(--color-primary);
  font-weight: 600;
}

.settings-content {
  flex-grow: 1;
  min-width: 0;
}

/* Dark Theme overrides via Body class */
body.dark-theme {
  --bg-color: #121212;
  --text-color: #e0e0e0;
  --text-secondary: #aaaaaa;
  --text-muted: #777777;
  --border-color: #333333;
}

body.dark-theme .card,
body.dark-theme .zoho-books-form,
body.dark-theme .zoho-books-onboarding-container,
body.dark-theme .sidebar,
body.dark-theme .top-header {
  background: #1e1e1e;
  border-color: #333333;
}

body.dark-theme .zoho-books-form .form-header,
body.dark-theme .zoho-books-onboarding .onboarding-header,
body.dark-theme .zoho-books-onboarding {
  background: #1e1e1e;
  border-color: #333333;
}

body.dark-theme .form-control {
  background: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

body.dark-theme .profile-drawer {
  background: #2a2a2a;
  border-color: #444;
}
body.dark-theme .profile-drawer .drawer-link:hover {
  background: #333;
}
body.dark-theme .settings-nav-item:hover {
  background: #2a2a2a;
}
body.dark-theme .settings-nav-item.active {
  background: #2c3e50;
  color: #90caf9;
}

/* Accessibility Large Text */
body.large-text {
  font-size: 110%;
}
body.large-text h1 { font-size: 2rem; }
body.large-text h2 { font-size: 1.5rem; }
body.large-text .form-control { font-size: 1rem; padding: 0.8rem; }
`;

if (!css.includes('Zoho Books Style Overrides')) {
    fs.writeFileSync('style.css', css + additionalCSS);
}
