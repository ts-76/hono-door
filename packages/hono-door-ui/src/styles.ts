export const adminUiCss: string = `
:root {
  color-scheme: light dark;
  font-family: system-ui, sans-serif;
}
body {
  margin: 0;
  background: #f5f7f8;
  color: #15171a;
}
main {
  width: min(920px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 32px 0 48px;
}
h1 {
  font-size: 2rem;
  margin: 0 0 8px;
}
.eyebrow {
  margin: 0 0 8px;
  color: #1769aa;
  font-weight: 700;
}
header {
  margin-bottom: 24px;
}
.lead {
  margin: 0 0 24px;
  color: #5f6872;
  line-height: 1.7;
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
  border-radius: 6px;
  padding: 0 12px;
  background: #e7ecf2;
  color: #15171a;
  text-decoration: none;
}
.nav a[aria-current="page"] {
  background: #1769aa;
  color: #ffffff;
}
h2 {
  font-size: 1rem;
  margin: 0;
}
.steps,
.result {
  display: grid;
  gap: 20px;
}
#admin-issue-root,
#admin-link-list-root,
#admin-archive-root {
  display: grid;
  gap: 20px;
  min-width: 0;
}
.step,
.result {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid #d8dde3;
  border-radius: 8px;
  background: #ffffff;
}
.step-body {
  min-width: 0;
  display: grid;
  gap: 14px;
}
.hint,
.field-help {
  margin: 0;
  color: #5f6872;
  line-height: 1.65;
}
.field-help {
  font-size: .75rem;
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
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}
label {
  display: grid;
  gap: 6px;
  font-size: .875rem;
  color: #3f4650;
}
input,
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #c9d0d8;
  border-radius: 6px;
  padding: 10px 12px;
  font: inherit;
  background: #ffffff;
  color: #15171a;
}
textarea {
  resize: vertical;
}
button,
.actions a {
  width: fit-content;
  border: 0;
  border-radius: 6px;
  padding: 10px 14px;
  background: #1769aa;
  color: #ffffff;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}
button.secondary {
  background: #e7ecf2;
  color: #15171a;
}
button.danger {
  background: #b42318;
  color: #ffffff;
}
button:disabled {
  cursor: wait;
  opacity: .72;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.alert {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 6px;
  background: #ffe8e8;
  color: #8a1f1f;
}
dl {
  display: grid;
  gap: 10px;
  margin: 0;
}
dl div {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
}
dt {
  color: #5f6872;
}
dd {
  margin: 0;
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
  border-top: 1px solid #d8dde3;
}
.reissue-result h2 {
  margin: 0;
}
.list-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 14px;
  align-items: start;
}
.list-auth {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
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
  padding: 12px 14px;
  border: 1px solid #d8dde3;
  border-radius: 8px;
  background: #ffffff;
  color: #3f4650;
}
.link-list {
  display: grid;
  gap: 18px;
}
.link-item {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid #d8dde3;
  border-radius: 8px;
}
.link-item h3 {
  margin: 0;
  font-size: 1rem;
}
.link-item-main {
  min-width: 0;
  display: grid;
  gap: 12px;
}
.link-detail {
  display: grid;
  gap: 14px;
}
.link-detail summary {
  width: fit-content;
  border-radius: 6px;
  padding: 9px 12px;
  background: #e7ecf2;
  color: #15171a;
  cursor: pointer;
}
.link-detail[open] summary {
  margin-bottom: 14px;
}
.link-detail-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  padding-top: 2px;
  align-items: start;
}
.link-details-content {
  display: grid;
  gap: 18px;
  min-width: 0;
}
.status-message {
  padding: 10px 12px;
  border-left: 3px solid #1769aa;
  background: #eef6fc;
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
  gap: 12px;
}
.policy-form {
  display: grid;
  gap: 14px;
  padding: 4px 0;
}
.policy-form h3 {
  margin: 0;
  font-size: 1rem;
}
.archive-room {
  display: grid;
  gap: 12px;
}
.archive-room h3,
.token-list h3 {
  margin: 0;
  font-size: 1rem;
}
.archive-preview {
  display: grid;
  gap: 14px;
  padding-top: 16px;
  border-top: 1px solid #d8dde3;
}
.archive-preview p {
  margin: 0;
  line-height: 1.8;
  white-space: pre-wrap;
}
.token-item {
  min-width: 0;
  padding: 12px;
  border: 1px solid #d8dde3;
  border-radius: 8px;
}
.empty-state {
  margin: 0;
  color: #5f6872;
}
.issued-main {
  min-width: 0;
  display: grid;
  gap: 14px;
}
.qr-panel {
  width: min(100%, 280px);
  justify-self: center;
}
.qr-code {
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 8px;
  background: #ffffff;
}
.qr-code svg {
  display: block;
  width: 100%;
  height: 100%;
  shape-rendering: crispEdges;
}
@media (prefers-color-scheme: dark) {
  body {
    background: #101214;
    color: #f5f7fa;
  }
  .step,
  .result,
  .session-bar {
    background: #181b1f;
    border-color: #343a42;
    color: #f5f7fa;
  }
  label {
    color: #c0c7cf;
  }
  .lead,
  .hint,
  .field-help,
  dt {
    color: #aab3bd;
  }
  button.secondary {
    background: #303741;
    color: #f5f7fa;
  }
  .nav a {
    background: #303741;
    color: #f5f7fa;
  }
  .nav a[aria-current="page"] {
    background: #2f8bd2;
  }
  .link-item {
    border-color: #343a42;
  }
  .token-item {
    border-color: #343a42;
  }
  .reissue-result {
    border-top-color: #343a42;
  }
  .status-message {
    background: #162536;
  }
  .link-detail summary {
    background: #303741;
    color: #f5f7fa;
  }
  .empty-state {
    color: #aab3bd;
  }
  input,
  textarea {
    background: #101214;
    color: #f5f7fa;
    border-color: #4a525c;
  }
  .qr-code {
    background: #ffffff;
  }
}
@media (max-width: 720px) {
  main {
    width: min(100% - 24px, 920px);
    padding-top: 20px;
  }
  .step {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 12px;
    padding: 14px;
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
`
