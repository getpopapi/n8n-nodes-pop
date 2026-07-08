# Changelog

All notable changes to `@getpopapi/n8n-nodes-pop` are documented here.

---

## [Unreleased]

---

## [0.1.6] — 2026-07-08

### Added
- **Sync Document to Zoho operation** (`syncZohoDocument`) on the Invoice resource — delegates invoice (TD01) and credit note (TD04) creation to Zoho Books/Invoice via POP's native Zoho connector (`POST /integration/zoho/sync`). Optionally verifies the connector is active first (`GET /integration/zoho/status`, enabled by default) and fails fast with a clear error if not. TD04 requires `connected_invoice_data[0].id`, validated locally in `invoicePayloadBuilder.ts` before the request is sent. Supports Passthrough, Form Fields, and JSON input modes (no Raw). Reuses the existing invoice form fields and payload builder (`invoiceFields.ts`, `invoicePayloadBuilder.ts` — new `'zoho'` variant) rather than introducing a parallel field set.
- **README — Zoho connector setup guide** — new "Setting Up the Zoho Connector (Prerequisite)" section documenting the one-time POP dashboard setup (Zoho OAuth app, redirect URI, Client ID/Secret, Organization ID) needed before `syncZohoDocument` can succeed, with a link to the full docs at docs.popapi.io/en/api/zoho.

---

## [0.1.5] — 2026-05-20

### Added
- **Target Environment field** — optional `environment` body parameter (`live` | `sandbox`) on all invoice operations: Create SdI Invoice, Create Peppol Invoice, Get Invoice Status, Get Peppol Document, Verify SdI Document. Sandbox mode does not consume credits.

### Changed
- **Node icon** — replaced the old SVG-wrapped PNG bitmap with the official POP square vector logo (`pop.svg`, 1400×1400 viewBox).
- **README** — added a prominent *Get Your License Key* section with the full OTP activation flow, key management notes, and recommended first steps. Made `popapi.io` links highly visible.
- **Brand consistency** — all user-facing text now refers to the service as **POP** (not "POP API" or "POP Api").

---

## [0.1.4] — 2026-04-30

### Fixed (n8n manual verification)
- `NodeOperationError` → `NodeApiError` in `nodes/Pop/utils/request.ts` — required for n8n UI to surface HTTP error details.
- Italian `displayName: 'Invio Fattura'` → `'Send Invoice'` in `createSdiInvoiceXml.ts` and `createPeppolInvoiceUbl.ts`.
- Italian Payment Terms option names in `invoiceFields.ts` → `Instalment`, `Full Payment`, `Advance`.
- Removed unsupported `subcategories` field from `Pop.node.json`.

---

## [0.1.3] — 2026-04-29

### Fixed (n8n automated scanner)
- Replaced `setTimeout`-based sleep with a no-op (`Promise.resolve()`) in `vies/validateVat.ts` — `setTimeout` is banned by the `@n8n/community-nodes/no-restricted-globals` ESLint rule.
- Added `test: ICredentialTestRequest` to `PopApi.credentials.ts` pointing to `GET /account-profile` — credential test is required by the n8n scanner.

---

## [0.1.2] — 2026-04-25

### Changed
- Minor fixes and improvements following initial publish.

---

## [0.1.1] — 2026-04-23

### Changed
- Scope and repo corrections after initial publish under wrong scope.

---

## [0.1.0] — 2026-04-22

### Added
- Initial publish under `@babinimazzari/n8n-nodes-pop` (wrong scope — abandoned).
- Core invoice operations: Create SdI Invoice (XML), Create Peppol Invoice (UBL), Get Invoice Status, Get Peppol Document, Verify SdI Document.
- VAT validation via EU VIES SOAP service.
- Optional `popApi` credential with `X-API-Key` injection.
