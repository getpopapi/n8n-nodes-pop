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

### `vies` resource
- **validateVat** — validates a VAT number against the EU VIES SOAP service (`https://ec.europa.eu/taxation_customs/vies/services/checkVatService`). Includes retry logic (5 attempts, exponential backoff up to 30s), 28-country EU dropdown (EL for Greece, XI for Northern Ireland), and returns `valid`, `name`, `address`, `requestDate`, `attempts`, `latencyMs`.

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

## Notes

- Requests use `this.helpers.httpRequest()` (unauthenticated). No credentials are required.
- The **Base URL** is configured per-operation via a node input field. It defaults to `https://staging7.popapi.io/wp-json/api/v2/`. Users can override it per workflow.
- The `credentials/PopApi.credentials.ts` file exists but is not registered with n8n (removed from `package.json`'s `n8n.credentials` array). It can be deleted if no longer needed.
- `n8n-workflow` is installed as a `devDependency` (not only a peerDependency) so TypeScript can resolve its types during the build.
- The `tsconfig.json` lib list (`es2019`, `es2020`, `es2022.error`) includes neither DOM nor Node.js types. Global Node.js APIs used in operation files must be declared inline:
  - `declare function setTimeout(callback: () => void, ms: number): number;` — in `vies/validateVat.ts`
  - `declare const Buffer: { from(data: string, encoding?: string): { toString(encoding: string): string }; };` — in `invoices/verifySdiDocument.ts`
- In `router.ts`, the operation lookup must cast to `any` — `(config[resource] as any)[operationName]` — because `operationName` is a union of all operations across all resources and TypeScript cannot index a single resource's map with it.
- The operation selector's `default` must be `''` (empty string), not a specific operation value, or the n8n lint rule `node-param-default-wrong-for-options` will fail.
