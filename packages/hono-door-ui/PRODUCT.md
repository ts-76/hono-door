# Product

## Register

product

## Users

The primary users are developers who install and mount `hono-door-ui` as an optional browser admin interface for `hono-door`.

Secondary users include event operators and staff who may not be engineers, but who can configure and operate the UI with help from AI agents or developer-provided setup. They need clear, forgiving screens for issuing QR-backed public links, checking active links, reviewing archives, and understanding token lifecycle constraints without reading the core API code.

## Product Purpose

`hono-door-ui` gives teams a small, dependable browser UI for managing short-lived public links and QR codes. It should make the secure path obvious: authenticate with the admin token, issue a link for an application-owned room, share the one-time-visible public URL or QR code, inspect active links, edit issue policy, reissue when needed, and review archived records without exposing raw tokens after issuance.

Success means a developer can mount the UI quickly, and an operator can complete routine link-management work with minimal explanation, in either Japanese or English.

## Brand Personality

Reliable, simple, calm, and quietly polished. The desired feeling is close to a clean Japanese product UI in the spirit of Catnose: restrained, lightweight, readable, and careful with words.

The interface should feel like a practical tool made by someone who respects the user's time, not like a marketing dashboard.

## Anti-references

Avoid flashy SaaS dashboard styling, heavy gradients, oversized decorative metrics, noisy card grids, and ornamental visual effects. Avoid UI that assumes English-only operators, and avoid enterprise heaviness that makes simple link management feel bureaucratic.

## Design Principles

1. Make the secure flow the easiest flow.
2. Keep the interface calm enough for repeated operational use.
3. Use plain language for token, room, link, archive, and reissue behavior.
4. Preserve developer trust through visible constraints and predictable defaults.
5. Treat Japanese and English as first-class product languages.

## Accessibility & Inclusion

Target WCAG AA-level contrast and keyboard operability for all admin workflows. Keep Japanese and English copy concise, concrete, and structurally equivalent so neither locale feels secondary.

Support reduced motion for any future animation. Error, loading, empty, and disabled states should be understandable without relying on color alone.

For future i18n implementation, prefer Hono's language middleware capabilities for detecting locale from supported request signals such as query string, cookie, and `Accept-Language`, with an explicit fallback language.
