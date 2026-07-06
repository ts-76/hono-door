---
target: packages/hono-door-ui/src/pages.tsx
total_score: 23
p0_count: 0
p1_count: 2
timestamp: 2026-07-03T02-55-04Z
slug: packages-hono-door-ui-src-pages-tsx
---
Method: dual-agent (A: 019f25e0-5dfb-72e2-84a5-9c21eea99382 · B: 019f25e0-8107-7d70-85f2-d3e7c9bca17a)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|------:|-----------|
| 1 | Visibility of System Status | 3 | Loading labels and session state are present, but login/API errors need stronger alert semantics and field-local placement. |
| 2 | Match System / Real World | 2 | Operator workflows still expose developer terms such as `raw token`, `token hash`, `Registry`, and `Room ID` without enough task-language translation. |
| 3 | User Control and Freedom | 2 | Logout, nav, and details affordances exist, but reissue/archive remain high-impact actions with limited recovery framing. |
| 4 | Consistency and Standards | 3 | Component vocabulary is consistent after polish; native details/confirm are pragmatic but uneven for destructive actions. |
| 5 | Error Prevention | 2 | Required fields and archive confirm help, but TTL, max uses, Link ID, and Room ID rely too much on late server validation. |
| 6 | Recognition Rather Than Recall | 2 | Users must remember that public URLs and QR codes cannot be reconstructed after issue/reissue. |
| 7 | Flexibility and Efficiency | 1 | No copy URL, QR download, quick reuse, shortcuts, or other power-user accelerators are visible. |
| 8 | Aesthetic and Minimalist Design | 3 | Calm, restrained, and product-appropriate, though explanatory prose sometimes carries too much of the workflow. |
| 9 | Error Recovery | 2 | Errors are plain but may be generic and can replace useful loaded detail context. |
| 10 | Help and Documentation | 1 | Inline hints exist, but there is no compact glossary or contextual help for non-engineer operators. |
| **Total** | | **23/40** | **Acceptable foundation; significant UX hardening remains.** |

## Anti-Patterns Verdict

**Does it look AI-generated?** No. The UI avoids the common tells: no gradients, no glass panels, no fake metrics, no decorative card grid, no over-rounded SaaS styling, and no ornamental motion. It reads as a real lightweight product/admin UI.

**LLM assessment:** The visual system is now calm and credible, but the experience is still under-designed around operational confidence. The biggest risk is not aesthetics; it is that secure, irreversible moments depend on prose instead of stronger task structure.

**Deterministic scan:** `detect.mjs --json src` returned `[]` with exit code 0. No side-stripe, gradient text, ghost-card, color drift, or other Impeccable anti-patterns were detected.

**Visual overlays:** Mutable browser injection succeeded. The overlay console reported: `[impeccable] No anti-patterns found.` The helper startup required escalation because sandbox loopback binding failed; cleanup left no reachable helper server.

## Overall Impression

The surface is visually trustworthy after polish: restrained colors, stable panels, clear labels, and good basic responsiveness. The single biggest opportunity is to turn the issue/reissue result into a stronger “receipt” moment, because the raw URL and QR code are recoverable only at that point.

## What's Working

1. The visual register matches the product: quiet, practical, compact, and not SaaS-flashy.
2. Security constraints are visible in the copy: HttpOnly session behavior and raw-token limitations are repeatedly surfaced.
3. Mobile and dark-mode basics are healthy after polish; navigation, form controls, and primary actions remain readable and structurally stable.

## Priority Issues

**[P1] The one-time URL/QR moment is underpowered**

Why it matters: This is the highest-stakes success state. If the operator leaves without copying or saving the QR, the system cannot reconstruct it.

Fix: Make the issued/reissued result a stronger task panel: add Copy URL, Download QR, a visible one-time warning, expiry/use-count summary, and a clear completion affordance.

Suggested command: `$impeccable harden`

**[P1] Technical language leaks into operator workflows**

Why it matters: Developers understand `raw token`, `token hash`, `Registry`, and `Room ID`; event staff may not. This creates hesitation and support dependency.

Fix: Keep technical terms where necessary, but pair them with task labels such as “公開ページのID,” “表示内容のID,” and “再表示できない共有URL.” Add a compact glossary/help disclosure.

Suggested command: `$impeccable clarify`

**[P2] Active-link details carry too many decisions at once**

Why it matters: Editing issue policy, reissuing, archiving, and reading token history are different mental modes. Grouping them together increases cognitive load and accidental action risk.

Fix: Split expanded details into clear sections: current tokens, default issue settings, and danger zone. Put archive visually and spatially away from reissue/save.

Suggested command: `$impeccable layout`

**[P2] Error prevention is too dependent on server validation**

Why it matters: TTL, max uses, Link ID, and Room ID can fail late. Operators need immediate confidence before issuing a public link.

Fix: Add input constraints/pattern examples, inline validation, numeric input behavior for max uses, and preview text such as “このリンクは1時間後に期限切れになります.”

Suggested command: `$impeccable harden`

## Persona Red Flags

**Developer admin:** The UI is trustworthy but inefficient for repeated testing. Missing Copy URL, QR download, and quick result actions slow down the normal development loop.

**Non-engineer event operator:** The primary flow still assumes comfort with token vocabulary. “raw token,” “token hash,” and “Room ID” are risk points unless translated into event/task language.

**Accessibility-dependent user:** Labels and focus styles exist, but failed login/API errors should use stronger `role="alert"` or targeted `aria-live` behavior. Status messages should not rely on users noticing passive text changes.

## Minor Observations

- Native `window.confirm` for archive is understandable but less polished than the surrounding UI.
- Placeholder `ADMIN_API_TOKEN` is developer-friendly, not operator-friendly.
- Archive empty state does not suggest what to search or what conditions create archived links.
- Dates are raw timestamps; localized formatting would reduce scan effort.
- The QR panel has stable sizing, but needs explicit save/share actions.

## Questions to Consider

1. What should an operator do in the first 10 seconds after a link is issued?
2. Should “Room ID” be exposed as-is, or should the UI translate it into the event/team’s language?
3. Is archive a routine workflow or a dangerous operation? The current UI treats it as both.
4. If raw URLs cannot be recovered, why is the result state not designed like a receipt?
