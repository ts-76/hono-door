export const adminUiCss: string = `
:root {
  color-scheme: light dark;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --color-ink: #17191C;
  --color-body: #343A42;
  --color-muted: #66717D;
  --color-canvas: #F7F8F8;
  --color-surface: #FFFFFF;
  --color-surface-subtle: #EEF2F4;
  --color-line: #D9E0E5;
  --color-line-strong: #C5CED6;
  --color-row-hover: #FAFBFC;
  --color-primary: #1769AA;
  --color-primary-hover: #12598F;
  --color-primary-soft: #EAF4FB;
  --color-primary-focus: #9AD0F3;
  --color-on-primary: #FFFFFF;
  --color-danger: #B42318;
  --color-danger-soft: #FDECEC;
  --color-danger-text: #8A1F1F;
  --radius-sm: 6px;
  --radius-md: 8px;
  --space-xs: 6px;
  --space-sm: 10px;
  --space-md: 14px;
  --space-lg: 18px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --text-page: 1.75rem;
  --text-section: 1.0625rem;
  --text-body: 1rem;
  --text-ui: .9375rem;
  --text-meta: .875rem;
  --text-help: .8125rem;
  --ease-state: cubic-bezier(0.25, 1, 0.5, 1);
}
*,
*::before,
*::after {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--color-canvas);
  color: var(--color-ink);
  font-size: var(--text-body);
  line-height: 1.65;
  font-kerning: normal;
  font-variant-numeric: tabular-nums;
}
main {
  width: min(960px, calc(100vw - 32px));
  margin: 0 auto;
  padding: var(--space-2xl) 0 48px;
}
h1 {
  font-size: var(--text-page);
  line-height: 1.25;
  margin: 0 0 8px;
  letter-spacing: 0;
  text-wrap: balance;
}
.eyebrow {
  margin: 0 0 8px;
  color: var(--color-primary);
  font-weight: 700;
}
header {
  margin-bottom: var(--space-2xl);
}
.lead {
  margin: 0 0 var(--space-xl);
  max-width: 68ch;
  color: var(--color-muted);
  font-size: var(--text-ui);
  line-height: 1.75;
  text-wrap: pretty;
}
.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 24px;
}
.nav a {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  border-radius: var(--radius-sm);
  padding: 0 12px;
  background: var(--color-surface-subtle);
  color: var(--color-ink);
  text-decoration: none;
  transition: background 150ms var(--ease-state), color 150ms var(--ease-state);
}
.nav a:hover {
  background: var(--color-line);
}
.nav a[aria-current="page"] {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
h2 {
  font-size: var(--text-section);
  line-height: 1.45;
  margin: 0;
}
.steps,
.result {
  display: grid;
  gap: var(--space-lg);
}
#admin-issue-root,
#admin-link-list-root,
#admin-archive-root {
  display: grid;
  gap: var(--space-lg);
  min-width: 0;
}
.workspace {
  display: grid;
  gap: var(--space-lg);
  min-width: 0;
}
.step {
  display: grid;
  gap: var(--space-md);
  padding: var(--space-lg) 0 0;
  border: 0;
  border-top: 1px solid var(--color-line);
  background: transparent;
}
.result {
  display: grid;
  gap: var(--space-md);
  padding: var(--space-lg);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.step-body {
  min-width: 0;
  display: grid;
  gap: var(--space-lg);
}
.hint,
.field-help {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--text-ui);
  line-height: 1.7;
  text-wrap: pretty;
}
.field-help {
  font-size: var(--text-help);
  line-height: 1.55;
}
.step[hidden],
.result[hidden] {
  display: none;
}
.step-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding-top: var(--space-xs);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  align-items: start;
}
.grid > label {
  grid-template-rows: auto minmax(44px, auto) auto;
}
.form-section {
  display: grid;
  gap: var(--space-md);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-line);
}
.form-section:first-of-type {
  padding-top: 0;
  border-top: 0;
}
.form-section-heading {
  display: grid;
  gap: var(--space-xs);
  max-width: 64ch;
}
.form-section h3 {
  margin: 0;
  font-size: var(--text-section);
  line-height: 1.45;
}
label {
  display: grid;
  gap: 6px;
  font-size: var(--text-meta);
  font-weight: 500;
  color: var(--color-body);
}
input,
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  min-height: 44px;
  font: inherit;
  background: var(--color-surface);
  color: var(--color-ink);
  transition: border-color 150ms var(--ease-state), outline-color 150ms var(--ease-state);
}
input::placeholder,
textarea::placeholder {
  color: var(--color-muted);
}
input:focus-visible,
textarea:focus-visible,
button:focus-visible,
.actions a:focus-visible,
.inline-link:focus-visible,
.nav a:focus-visible,
.link-detail summary:focus-visible {
  outline: 3px solid var(--color-primary-focus);
  outline-offset: 2px;
}
input:focus-visible,
textarea:focus-visible {
  border-color: var(--color-primary);
}
textarea {
  resize: vertical;
}
button,
.actions a {
  width: fit-content;
  border: 0;
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  min-height: 40px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font: inherit;
  font-size: var(--text-ui);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background 150ms var(--ease-state), opacity 150ms var(--ease-state);
}
button:hover,
.actions a:hover {
  background: var(--color-primary-hover);
}
button.secondary {
  background: var(--color-surface-subtle);
  color: var(--color-ink);
}
button.secondary:hover {
  background: var(--color-line);
}
button.danger {
  background: var(--color-danger);
  color: var(--color-on-primary);
}
button.danger:hover {
  background: var(--color-danger-text);
}
button:disabled {
  cursor: wait;
  opacity: .72;
}
button:disabled:hover {
  background: var(--color-primary);
}
button.secondary:disabled:hover {
  background: var(--color-surface-subtle);
}
button.danger:disabled:hover {
  background: var(--color-danger);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.result-actions {
  align-items: stretch;
}
.alert {
  margin: 0 0 16px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--color-danger) 28%, var(--color-danger-soft));
  border-radius: var(--radius-sm);
  background: var(--color-danger-soft);
  color: var(--color-danger-text);
}
dl {
  display: grid;
  gap: var(--space-sm);
  margin: 0;
}
dl div {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
}
dt {
  color: var(--color-muted);
  font-size: var(--text-meta);
  line-height: 1.45;
}
dd {
  margin: 0;
  font-size: var(--text-ui);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.issued-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 280px);
  gap: 20px;
  align-items: start;
}
.reissue-result {
  display: grid;
  gap: 14px;
  padding: 18px 0 4px;
  border-top: 1px solid var(--color-line);
}
.reissue-result h2 {
  margin: 0;
}
.list-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-md) var(--space-lg);
  align-items: start;
  padding-top: var(--space-xs);
}
.list-header > div {
  display: grid;
  gap: var(--space-xs);
}
.list-header .hint {
  max-width: 56ch;
}
.list-auth {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}
.list-header .list-auth {
  grid-template-columns: 1fr;
}
.login-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}
.session-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 0 0 var(--space-md);
  border: 0;
  border-bottom: 1px solid var(--color-line);
  border-radius: 0;
  background: transparent;
  color: var(--color-body);
  font-size: var(--text-ui);
}
.link-list {
  display: grid;
  gap: 0;
  border-top: 1px solid var(--color-line);
  border-bottom: 1px solid var(--color-line);
  background: transparent;
}
.link-item {
  display: grid;
  gap: 0;
  padding: 0;
  border: 0;
  border-top: 1px solid var(--color-line);
  border-radius: 0;
  background: transparent;
}
.link-item:first-child {
  border-top: 0;
}
.link-item-main {
  padding: var(--space-md) 0;
}
.link-item:hover {
  background: var(--color-row-hover);
}
.link-item h3 {
  margin: 0;
  font-size: var(--text-ui);
  line-height: 1.45;
  font-weight: 700;
}
.link-item-main {
  min-width: 0;
  display: grid;
  gap: var(--space-sm);
}
.link-detail {
  display: grid;
  gap: 0;
}
.link-detail summary {
  width: fit-content;
  border-radius: var(--radius-sm);
  margin: 0 0 16px;
  padding: 8px 12px;
  background: var(--color-surface-subtle);
  color: var(--color-ink);
  cursor: pointer;
  transition: background 150ms var(--ease-state);
}
.link-detail summary:hover {
  background: var(--color-line);
}
.link-detail[open] summary {
  margin-bottom: 0;
}
.link-detail-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-lg);
  padding: 16px 0 18px;
  border-top: 1px solid var(--color-line);
  background: transparent;
  align-items: start;
}
.link-details-content {
  display: grid;
  gap: 18px;
  min-width: 0;
}
.detail-section {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-line);
}
.detail-section:first-of-type {
  padding-top: 0;
  border-top: 0;
}
.detail-section h3 {
  margin: 0;
  font-size: var(--text-section);
  line-height: 1.45;
}
.danger-zone {
  padding: var(--space-md);
  border: 1px solid color-mix(in srgb, var(--color-danger) 18%, var(--color-line));
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-danger-soft) 48%, var(--color-surface));
}
.status-message {
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 22%, var(--color-primary-soft));
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  color: var(--color-body);
}
.compact-meta {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.compact-meta div {
  grid-template-columns: 1fr;
  gap: 4px;
}
.token-list {
  display: grid;
  gap: 0;
  border-top: 1px solid var(--color-line);
  border-bottom: 1px solid var(--color-line);
  background: transparent;
}
.token-list > h3 {
  padding: 12px 0;
  border-bottom: 1px solid var(--color-line);
  background: transparent;
}
.policy-form {
  display: grid;
  gap: 14px;
  padding: 4px 0;
}
.policy-form h3 {
  margin: 0;
  font-size: var(--text-section);
}
.archive-room {
  display: grid;
  gap: 12px;
}
.archive-room h3,
.token-list h3 {
  margin: 0;
  font-size: var(--text-section);
}
.archive-preview {
  display: grid;
  gap: 14px;
  padding-top: 16px;
  border-top: 1px solid var(--color-line);
}
.archive-preview p {
  margin: 0;
  line-height: 1.8;
  white-space: pre-wrap;
}
.archive-preview-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 14px;
}
.archive-preview-summary .hint {
  margin: 0;
}
.inline-link {
  width: fit-content;
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  font-size: var(--text-ui);
  font-weight: 500;
  text-decoration: none;
}
.inline-link:hover {
  text-decoration: underline;
}
.token-item {
  min-width: 0;
  padding: 12px 0;
  border: 0;
  border-top: 1px solid var(--color-line);
  border-radius: 0;
  background: transparent;
}
.token-item:first-child {
  border-top: 0;
}
.token-list > h3 + .token-item {
  border-top: 0;
}
.empty-state {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--text-ui);
  line-height: 1.7;
}
.issued-main {
  min-width: 0;
  display: grid;
  gap: 14px;
}
.handoff-result {
  gap: 16px;
}
.one-time-warning {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 24%, var(--color-primary-soft));
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  color: var(--color-body);
  line-height: 1.65;
}
.qr-panel {
  width: min(100%, 280px);
  justify-self: center;
}
.qr-code {
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.qr-code svg {
  display: block;
  width: 100%;
  height: 100%;
  shape-rendering: crispEdges;
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-ink: #F5F7FA;
    --color-body: #C0C7CF;
    --color-muted: #AAB3BD;
    --color-canvas: #101214;
    --color-surface: #181B1F;
    --color-surface-subtle: #303741;
    --color-line: #343A42;
    --color-line-strong: #4A525C;
    --color-row-hover: #1D2228;
    --color-primary: #2F8BD2;
    --color-primary-hover: #5BA8E3;
    --color-primary-soft: #162536;
    --color-danger-soft: #3A1716;
    --color-danger-text: #FFB4AB;
  }
  body {
    background: var(--color-canvas);
    color: var(--color-ink);
  }
  .step,
  .result,
  .session-bar {
    border-color: var(--color-line);
    color: var(--color-ink);
  }
  .result {
    background: var(--color-surface);
  }
  label {
    color: var(--color-body);
  }
  .lead,
  .hint,
  .field-help,
  dt {
    color: var(--color-muted);
  }
  button.secondary {
    background: var(--color-surface-subtle);
    color: var(--color-ink);
  }
  .nav a {
    background: var(--color-surface-subtle);
    color: var(--color-ink);
  }
  .nav a[aria-current="page"] {
    background: var(--color-primary);
  }
  .link-item {
    border-color: var(--color-line);
  }
  .token-item {
    border-color: var(--color-line);
  }
  .link-list,
  .token-list {
    border-color: var(--color-line);
  }
  .link-detail-body {
    border-top-color: var(--color-line);
  }
  .danger-zone {
    background: color-mix(in srgb, var(--color-danger-soft) 44%, var(--color-surface));
  }
  .reissue-result {
    border-top-color: var(--color-line);
  }
  .status-message {
    background: var(--color-primary-soft);
    color: var(--color-body);
  }
  .one-time-warning {
    background: var(--color-primary-soft);
    color: var(--color-body);
  }
  .link-detail summary {
    background: var(--color-surface-subtle);
    color: var(--color-ink);
  }
  .empty-state {
    color: var(--color-muted);
  }
  input,
  textarea {
    background: var(--color-canvas);
    color: var(--color-ink);
    border-color: var(--color-line-strong);
  }
  .qr-code {
    background: #FFFFFF;
  }
}
@media (max-width: 720px) {
  main {
    width: min(100% - 24px, 920px);
    padding-top: 20px;
  }
  h1 {
    font-size: 1.625rem;
  }
  .step {
    gap: 12px;
    padding-top: 14px;
  }
  button,
  .actions a,
  .nav a,
  .link-detail summary {
    min-height: 44px;
  }
  .issued-layout {
    grid-template-columns: 1fr;
  }
  .link-item {
    grid-template-columns: 1fr;
  }
  .link-detail-body {
    grid-template-columns: 1fr;
  }
  .list-auth {
    grid-template-columns: 1fr;
  }
  .login-panel {
    grid-template-columns: 1fr;
  }
  .qr-panel {
    width: min(100%, 260px);
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
`
