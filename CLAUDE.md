## Project overview

This is an n8n community node package for integrating the **POP Cloud API (v2)** with n8n workflows.

It follows the same architecture as the Musixmatch reference repo:
- `credentials/` defines how n8n stores/authenticates to the API
- `nodes/Pop/Pop.node.ts` defines the node and delegates execution to `router.ts`
- `nodes/Pop/<resource>/` folders implement operations with a consistent pattern

## Resources and operations

### `invoices` resource
- **createSdiInvoiceXml** — `POST /create-xml` — generates an Italian FatturaPA (SdI) invoice
- **createPeppolInvoiceUbl** — `POST /create-ubl` — generates a Peppol UBL invoice
- **getInvoiceStatus** — `POST /document-notifications` — retrieves SdI notification events by UUID
- **getPeppolDocument** — `POST /peppol/document-get` — retrieves a Peppol document by UUID
- **verifySdiDocument** — `POST /sdi-via-pop/document-verify` — validates an SdI XML document (passthrough-only: reads XML from the incoming item produced by createSdiInvoiceXml, base64-encodes it, and auto-detects the license key from the upstream node's parameters)
- **syncZohoDocument** — `POST /integration/zoho/sync` (with optional preflight `GET /integration/zoho/status`) — syncs an invoice (TD01) or credit note (TD04) to Zoho Books/Invoice via POP's native Zoho connector. All Zoho-side mapping happens server-side in `pop-cloud-api` (`ConnectorZohoPayloadBuilder`, `classes/connector-zoho-service.php`) — this node only gates on connector status and forwards the standard POP invoice envelope. See [Sync Document to Zoho](#sync-document-to-zoho) notes below.

### `vies` resource
- **validateVat** — validates a VAT number against the EU VIES SOAP service (`https://ec.europa.eu/taxation_customs/vies/services/checkVatService`). Includes retry logic (5 attempts, no delay between retries — `setTimeout` is banned by the n8n scanner's `no-restricted-globals` rule), 28-country EU dropdown (EL for Greece, XI for Northern Ireland), and returns `valid`, `name`, `address`, `requestDate`, `attempts`, `latencyMs`.

## Authentication

The POP Cloud API v2 accepts the license key as `X-API-Key` header (preferred) or as `license_key` body param (legacy fallback). The corresponding pop-cloud-api change lives in `classes/utils.php::apiPermissionCallback` and `classes/license-helper.php::buildLicenseInfo`/`debug_log_license_issue`.

The n8n node ships an optional `popApi` credential (`credentials/PopApi.credentials.ts`, registered in `package.json` `n8n.credentials`) with a single `apiKey` field. The credential's `authenticate` is `IAuthenticateGeneric` injecting `X-API-Key`, and `popRequest` (in `nodes/Pop/utils/request.ts`) also fetches it manually so that plain `httpRequest` calls (which we use) get the header automatically.

**Resolution order per operation:**
1. Form-mode `licenseKey` field (when set) — overrides everything; sent as both `X-API-Key` header and `license_key` body.
2. `popApi` credential — when configured, `popRequest` injects `X-API-Key` if no header was set by the handler. Body has no `license_key` (only the header carries auth).
3. For `verifySdiDocument`: detected upstream-node license key takes precedence over the credential (header + body both populated).

The form License Key field is **not required** — leaving it empty makes the operation use the credential. This is intentional UX so users don't re-type their key on every operation.

### Credential test

`PopApi.credentials.ts` defines `test: ICredentialTestRequest` pointing to `GET /account-profile` (`https://popapi.io/wp-json/api/v2/account-profile`). This endpoint was added to the POP API specifically to support credential validation — it returns `{ success: true, data: { authenticated: true, ... } }` for valid keys and a non-2xx for invalid ones. The `authenticate` block injects `X-API-Key` automatically so no extra header setup is needed in the test.

## Development commands

### Building
```bash
npm run build
npm run build:watch
```

### Development
```bash
npm run dev
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## Publishing

Package is published on npm as `@getpopapi/n8n-nodes-pop`.

**History:** First publish was `@babinimazzari/n8n-nodes-pop` v0.1.0 on 2026-04-22 (wrong scope). Republished under the `@getpopapi` org after the GitHub repo was renamed from `getpopapi/pop-n8n-nodes` to `getpopapi/n8n-nodes-pop`. The `@babinimazzari` package on npm is abandoned — do not push new versions there.

**Repo ↔ scope alignment:** GitHub repo is `getpopapi/n8n-nodes-pop`; npm scope is `@getpopapi`. `package.json` `homepage` and `repository.url` must point to `getpopapi/n8n-nodes-pop` — npm provenance verifies the repo URL against the workflow identity, and a mismatch fails the publish.

### Release flow (tag-driven)

`npm version patch` is unreliable in this environment (WSL2 git issues with auto-tagging). Always bump manually:

```bash
# 1. Edit package.json version field manually (e.g. 0.1.2 → 0.1.3)
git add package.json package-lock.json
git commit -m "chore: bump version to X.Y.Z"
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
```

If the tag already exists on remote (e.g. after a botched attempt), use `git push origin vX.Y.Z --force` to move it.

Pushing a `v*` tag triggers `.github/workflows/publish.yml`, which runs `npm ci → lint → build → npm publish --provenance --access public`.

### Auth — current setup (Opzione B)

- `NPM_TOKEN` repo secret on `getpopapi/n8n-nodes-pop` → Settings → Secrets → Actions
- Token is a **Granular Access Token** with scope `@getpopapi`, *Read and write*, **Bypass 2FA enabled** (required because user 2FA is "Authorization and writes")
- Token expires every 90 days — rotate before expiry

### To migrate to Opzione A (Trusted Publisher OIDC) later

1. npmjs.com → package `@getpopapi/n8n-nodes-pop` → Settings → Publishing access
2. Add trusted publisher: owner `getpopapi`, repo `n8n-nodes-pop`, workflow `publish.yml`
3. Delete the `NPM_TOKEN` secret from the GitHub repo
4. Remove the `NODE_AUTH_TOKEN` line from `publish.yml` (the `id-token: write` permission and `registry-url` stay)

### Gotchas

- **Do not re-add `prepublishOnly: n8n-node prerelease`** to `package.json`. That script from `@n8n/node-cli` is a deliberate safety guard that prints `Run \`npm run release\` to publish the package` and exits 1 — it blocks any CI-driven `npm publish`. The hook was removed on 2026-04-22.
- `npm run release` (the n8n-node CLI's own release flow) is an interactive tool and does not fit tag-driven CI. Always release via `npm version` + tag push.
- Tags must start with lowercase `v` (e.g. `v0.1.1`) to match `on.push.tags: ['v*']`.

### Installing the published node in n8n

The published package is not auto-discovered — each n8n instance must install it explicitly:

- **Self-hosted:** Settings → Community Nodes → Install → `@getpopapi/n8n-nodes-pop`
- **n8n Cloud:** requires verification via n8n's community node verification flow; unverified packages are not installable on Cloud

## Changelog summary

- **Unreleased** — Added `syncZohoDocument` operation (Invoice resource): syncs invoices/credit notes to Zoho via POP's native connector, with a connector-status preflight check and local TD04 validation. See [Sync Document to Zoho](#sync-document-to-zoho) below.
- **v0.1.5** (2026-05-20) — New logo (clean SVG), `environment` body param on all 5 invoice operations, README overhauled (license key section + brand consistency). NPM token expired during publish — had to rotate and re-run.
- **v0.1.4** (2026-04-30) — n8n verification fixes: NodeApiError, English labels, codex subcategories removed.
- **v0.1.3** (2026-04-29) — Scanner fixes: no-op sleep (setTimeout banned), credential test added.
- **v0.1.2 / v0.1.1** — Early releases under `@getpopapi` scope.
- **v0.1.0** (2026-04-22) — First publish (wrong scope `@babinimazzari`, abandoned).

## n8n verification — known issues fixed in v0.1.4

Manual review (2026-04-30) flagged three issues, all fixed in v0.1.4:

1. **`NodeOperationError` → `NodeApiError`** (`nodes/Pop/utils/request.ts`) — HTTP errors must use `throw new NodeApiError(this.getNode(), error as JsonObject)` so the n8n UI can surface URL, status code, and response body.
2. **Italian `displayName`** — `'Invio Fattura'` renamed to `'Send Invoice'` in `createSdiInvoiceXml.ts` and `createPeppolInvoiceUbl.ts`.
3. **Italian option names** — Payment Terms in `invoiceFields.ts` translated: `Pagamento a Rate` → `Instalment`, `Pagamento Completo` → `Full Payment`, `Anticipo` → `Advance`.
4. **`subcategories` in `Pop.node.json`** — removed; only `node`, `nodeVersion`, `codexVersion`, `categories`, `resources`, `alias` are supported.

### Potential future Italian label flags (not yet flagged, watch if review fails again)

These use Italian technical terms in parentheses or descriptions — not pure Italian labels, so not flagged in v0.1.4 review, but could be flagged in a stricter pass:

- `invoiceFields.ts:101` — `displayName: 'SDI Type (Codice Destinatario)'`
- `invoiceFields.ts:465` — `displayName: 'Tax ID Code (Codice Fiscale)'`
- `invoiceFields.ts:218` — `description: 'Codice destinatario SdI (7 characters)'`
- `invoiceFields.ts:358` — `description: 'Italian tax regime code (Regime Fiscale)'`
- `invoiceFields.ts:470` — `description: 'Italian fiscal code (Codice Fiscale) of the recipient'`

## Sync Document to Zoho

- **Backend contract (verified against `pop-cloud-api`, not assumed):** `GET /integration/zoho/status` returns `{ success, data: { active_connector, zoho_connected, zoho_region, zoho_product, zoho_org_id, zoho_token_expires_at, zoho_invoice_status, zoho_create_contact_if_missing } }`. "Connector active" = `data.active_connector === 'zoho' && data.zoho_connected === true` — this is the exact check the handler uses. `POST /integration/zoho/sync` takes the same POP envelope as SdI (`license_key`, `environment`, `data: {...}`); `ConnectorZohoPayloadBuilder::validatePayload()` (PHP) requires `invoice_body.general_data.{doc_type,date,currency}`, `transferee_client.personal_data`, non-empty `order_items[]`, and `doc_type` of `TD01` or `TD04` (`TD04` additionally requires `connected_invoice_data[0].id`).
- **No new UI field family** — `invoicePayloadBuilder.ts` gained a third `InvoiceVariant = 'zoho'` alongside `'sdi' | 'peppol'`. The existing SdI-shaped `data` object already satisfies the Zoho validator, so no new payload structure was needed — only a runtime guard (mirrors the existing discount-percent check pattern) that throws before the request is sent if `doc_type === 'TD04'` and `connected_invoice_data[0].id` is missing.
- **`sendInvoice` is always `false` for the `'zoho'` variant** — Zoho sync has no `integration.use`/`action` toggle like SdI/Peppol do; the handler passes `false` at the call site rather than adding a branch inside the builder's `sendInvoice` block.
- **`Document Type` field is reused, not duplicated** — the existing `invoiceDetails.invoiceDetailValues.docType` field (`Invoice Details` fixedCollection, options `TD01`/`TD04`) already exists and is shown for `syncZohoDocument` for free, since `makeInvoiceFormFields`'s SdI-only conditionals (`sdiType`, `sdiCode`, `senderTaxRegime`, `recipientTaxIdCode`, etc.) are gated by `operation === 'createSdiInvoiceXml'` and fall through hidden for any other operation string.
- **No Raw input mode** — the Zoho sync endpoint only accepts JSON, so `syncZohoDocument` only offers Passthrough/Form/JSON (unlike the other invoice operations, which also offer Raw).
- **Precondition failures use `NodeOperationError`, not `NodeApiError`** — the connector-inactive check and the TD04 validation guard are client-side preconditions, not HTTP errors from `popRequest`, so they follow the existing pattern of thrown `Error`/`NodeOperationError` (see `router.ts`'s catch block) rather than the `NodeApiError` wrapping reserved for actual HTTP failures.
- **Lint gotcha discovered while adding this operation:** the `n8n-nodes-base/node-param-description-miscased-id` and `-miscased-json` rules flag *any* standalone lowercase `id`/`json` word in a `description` string — including inside inline code examples like `{"id": 123}` or `application/json`. `npm run lint:fix` will "fix" these by uppercasing them in place, which corrupts real MIME types and JSON key names (e.g. `application/json` → `application/JSON`). Don't trust `lint:fix` blindly on description strings with embedded code snippets — reword the prose to avoid the literal words instead (e.g. "a numeric identifier" instead of "an id field").

## Notes

- Requests use `this.helpers.httpRequest()` (plain, unauthenticated transport). The `X-API-Key` header is set explicitly by handlers (form-mode override) or auto-injected from the optional `popApi` credential by `popRequest` itself — see the [Authentication](#authentication) section.
- The **Environment** selector (`baseUrl`) on each invoice operation defaults to **Production** (`https://popapi.io/wp-json/api/v2/`). The Staging option is commented out in source for local testing only. This is separate from the **Target Environment** body field (`live` / `sandbox`) added in v0.1.5.
- The **Target Environment** body field (`environment`) is optional on invoice operations that use the shared form-field factory or an inline equivalent (including `syncZohoDocument`, which reuses `makeInvoiceFormFields`). When set to `sandbox`, POP does not consume credits. It is defined in `invoiceFields.ts` (for form-mode create operations) and inline in each status/verify operation file. The field is passed through `InvoiceFormParams` in `invoicePayloadBuilder.ts` and conditionally spread: `...(params.environment ? { environment: params.environment } : {})`.
- The node icon is `nodes/Pop/pop.svg` — a clean vector SVG (1400×1400 viewBox). As of v0.1.5 this is the official POP square logo. The `file:pop.svg` reference in `Pop.node.ts` does not need to change when the SVG content is updated.
- Brand name in all user-facing text (README, descriptions) must be **POP** — never "POP API" or "POP Api". The n8n credential is named "POP API" in the UI (that specific string is kept only in `Credentials → New → POP API` UI path instructions).
- `n8n-workflow` is installed as a `devDependency` (not only a peerDependency) so TypeScript can resolve its types during the build.
- The `tsconfig.json` lib list (`es2019`, `es2020`, `es2022.error`) includes neither DOM nor Node.js types. Global Node.js APIs used in operation files must be declared inline:
  - `declare const Buffer: { from(data: string, encoding?: string): { toString(encoding: string): string }; };` — in `invoices/verifySdiDocument.ts`
  - **Do not use `setTimeout` or `globalThis`** — both are banned by the n8n scanner's `@n8n/community-nodes/no-restricted-globals` ESLint rule. The `sleep()` helper in `vies/validateVat.ts` is a no-op (`Promise.resolve()`) for this reason.
- In `router.ts`, the operation lookup must cast to `any` — `(config[resource] as any)[operationName]` — because `operationName` is a union of all operations across all resources and TypeScript cannot index a single resource's map with it.
- The operation selector's `default` must be `''` (empty string), not a specific operation value, or the n8n lint rule `node-param-default-wrong-for-options` will fail.
- `scripts/dev.js` (custom replacement for `n8n-node dev` that pins the n8n version) must `fs.mkdirSync(path.dirname(symlinkPath), { recursive: true })` before `fs.symlinkSync`. For scoped packages, the symlink target lives under `<n8n-user-folder>/.n8n/custom/node_modules/<scope>/<name>`; without the parent-mkdir, `npm run dev` fails with `ENOENT: no such file or directory, symlink '<cwd>' -> '<...>/<scope>/<name>'` the first time you change npm scope. After a scope rename also delete the stale `<old-scope>/` folder under that path so n8n doesn't load the same node twice under two names.
