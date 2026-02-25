# n8n-nodes-pop

![POP Cloud API](https://img.shields.io/badge/POP_Cloud_API-v2-ff5f5e?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-a8dadc?style=flat-square)
![n8n community](https://img.shields.io/badge/n8n-community_node-1a1a1a?style=flat-square)

> Community node for [n8n](https://n8n.io/) that integrates with the [POP Cloud API](https://popapi.io/) for automated electronic invoicing.

**POP** is an e-invoicing platform that automates the generation, delivery, and management of legally compliant electronic invoices. It supports both the **Italian SdI** (Sistema di Interscambio / FatturaPA) and the **European Peppol** network.

This node lets you create, send, and track electronic invoices directly from n8n workflows — no code required, and **no credentials to configure**.

---

## Installation

Follow the [n8n community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

1. In n8n, go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `@babinimazzari/n8n-nodes-pop`
4. Click **Install**

---

## Configuration

This node does **not** require any credentials to be set up. Instead, each operation exposes a **Base URL** input field at the top of its settings.

| Field        | Description                                                                           |
| ------------ | ------------------------------------------------------------------------------------- |
| **Base URL** | Full base URL of the POP API (e.g. `https://your-instance.popapi.io/wp-json/api/v2/`) |

The default value (`https://staging7.popapi.io/wp-json/api/v2/`) targets the POP staging environment. Replace it with your production URL when you are ready.

Because the Base URL is a regular node input, you can:

- Use a different URL per operation within the same workflow
- Set it dynamically using an expression (e.g. `={{ $env.POP_BASE_URL }}`)
- Map it from a previous node's output

> The **license key** is sent inside each request payload (via the Form Fields input mode), not in a shared credential. This lets you use different license keys per operation or workflow.

---

## Operations

### Resource: Invoice

#### Create SdI Invoice (XML)

Generates an Italian e-invoice in **FatturaPA** format and optionally submits it to the **Sistema di Interscambio**.

- **Endpoint:** `POST /create-xml`
- **Invio Fattura:** Toggle to `Yes` to include the SdI integration object and trigger submission via POP
- **Input modes:** Passthrough, Form Fields, JSON, Raw

#### Create Peppol Invoice (UBL)

Generates a **Peppol** invoice in **UBL** format and optionally submits it to the **Peppol** network.

- **Endpoint:** `POST /create-ubl`
- **Invio Fattura:** Toggle to `Yes` to include the Peppol integration object
- **Input modes:** Passthrough, Form Fields, JSON, Raw
- Customer type is limited to Company or Freelance (Peppol does not support Private individuals)

#### Get Invoice Status

Retrieves document notifications for a previously submitted SdI invoice.

- **Endpoint:** `POST /document-notifications`
- **Form payload:** `{ license_key, integration: { uuid } }`
- **Input modes:** Passthrough, Form Fields, JSON, Raw

#### Get Peppol Document

Retrieves a Peppol document by integration UUID.

- **Endpoint:** `POST /peppol/document-get`
- **Form payload:** `{ license_key, integration: { uuid, zone? } }`
- The `zone` field (e.g. `"BE"`) is required for Belgian VAT numbers; it is normalised to uppercase automatically
- **Input modes:** Passthrough, Form Fields, JSON, Raw

---

## Input Modes

All four operations support the same four input modes:

| Mode                  | Description                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| **Use Incoming JSON** | Forwards the input item's JSON data directly to the API. Default mode, ideal for automated pipelines.  |
| **Form Fields**       | Structured form with all relevant fields. Best for manual entry or mapping from other nodes.           |
| **JSON**              | Paste or build the full request JSON payload manually.                                                 |
| **Raw (XML/Other)**   | Send a raw string body (e.g. XML). Sets `Content-Type: application/xml` unless overridden via headers. |

---

## Example Workflow

```
[Webhook] → [POP: Create SdI Invoice] → [POP: Get Invoice Status] → [Slack]
```

1. A Webhook node receives order data from your e-commerce platform
2. The POP node creates an SdI invoice using **Use Incoming JSON** mode — the webhook payload is forwarded as-is
3. A second POP node checks the invoice status using the UUID from the previous response
4. A Slack node notifies the team of the result

---

## Example Payloads

### SdI Invoice (XML) — `POST /create-xml`

```json
{
	"license_key": "your_license_key",
	"data": {
		"id": 2575,
		"filename": "IT99900088876_00009",
		"type": "invoice",
		"version": "FPR12",
		"sdi_type": "",
		"customer_type": "private",
		"nature": "",
		"ref_normative": null,
		"vies": false,
		"vat_kind": null,
		"transmitter_data": {
			"transmitter_id": {
				"country_id": "IT",
				"id_code": "IT99900088876"
			},
			"progressive": "5b27a73cab",
			"transmitter_format": "FPR12",
			"sdi_code": "0000000",
			"transmitter_contact": {
				"phone": "",
				"email": ""
			},
			"recipient_pec": ""
		},
		"transfer_lender": {
			"personal_data": {
				"tax_id_vat": {
					"country_id": "IT",
					"id_code": "IT99900088876",
					"tax_regime": "RF01"
				},
				"company_name": "TEST123"
			},
			"place": {
				"address": "Via Roma, 123",
				"zip_code": "95100",
				"city": "Catania",
				"province_id": "CT",
				"country_id": "IT"
			},
			"rea_registration": {
				"office": "",
				"number": "",
				"liquidation_status": ""
			},
			"contact": {
				"phone": "",
				"email": ""
			}
		},
		"transferee_client": {
			"personal_data": {
				"tax_id_vat": {
					"country_id": "IT",
					"id_code": ""
				},
				"tax_id_code": "PCCLFA75L04A494S",
				"company_name": "",
				"first_name": "Alfio",
				"last_name": "Piccione"
			},
			"place": {
				"address": "Via Roma 123",
				"zip_code": "95100",
				"city": "Catania",
				"province_id": "CT",
				"country_id": "IT"
			}
		},
		"invoice_body": {
			"general_data": {
				"doc_type": "TD01",
				"currency": "EUR",
				"date": "2025-01-31",
				"invoice_number": "WEB9/2025",
				"invoice_prefix": "WEB",
				"invoice_suffix": "2025"
			},
			"provident_fund": [],
			"total_document_amount": "16.38"
		},
		"purchase_order_data": {
			"id": "#2575",
			"date": "2025-01-31"
		},
		"connected_invoice_data": [],
		"order_items": [
			{
				"item_code": { "type": "INTERNO", "value": "2563" },
				"item_type": "product",
				"gift_product": "no",
				"description": "Prod 2",
				"quantity": "1.00",
				"unit": "N.",
				"discount_type": "",
				"discount_percent": "",
				"discount_amount": "",
				"unit_price": "4.09",
				"total_price": "4.09",
				"rate": "0.00",
				"total_tax": 0
			},
			{
				"item_code": { "type": "INTERNO", "value": "2570" },
				"item_type": "product",
				"gift_product": "no",
				"description": "Prod 7",
				"quantity": "1.00",
				"unit": "N.",
				"discount_type": "",
				"discount_percent": "",
				"discount_amount": "",
				"unit_price": "4.92",
				"total_price": "4.92",
				"rate": "0.00",
				"total_tax": 0
			},
			{
				"item_code": { "type": "INTERNO", "value": "2569" },
				"item_type": "product",
				"gift_product": "no",
				"description": "Prod 6",
				"quantity": "1.00",
				"unit": "N.",
				"discount_type": "",
				"discount_percent": "",
				"discount_amount": "",
				"unit_price": "7.37",
				"total_price": "7.37",
				"rate": "0.00",
				"total_tax": 0
			}
		],
		"payment_data": {
			"terms_payment": "TP02",
			"payment_amount": "16.38",
			"payment_details": "MP02",
			"beneficiary": "",
			"financial_institution": "",
			"iban": ""
		},
		"overrides": {
			"bollo_force_apply": false
		}
	},
	"integration": {
		"use": "sdi-via-pop",
		"action": "create"
	}
}
```

### Peppol Invoice (UBL) — `POST /create-ubl`

```json
{
	"license_key": "your_license_key",
	"plugin_version": "6.5.2",
	"site_title": "POP dev",
	"site_url": "http://site.com",
	"user_agent_version": "6.8.3",
	"user_agent": "wordpress",
	"data": {
		"id": 2855,
		"parent_id": null,
		"order_provider": "woocommerce",
		"xml_style": "",
		"view": false,
		"save": false,
		"save_bulk": false,
		"filename": "BE0123456789_0000T",
		"type": "invoice",
		"version": "FPR12",
		"sdi_type": "",
		"customer_type": "company",
		"nature": "",
		"ref_normative": null,
		"vies": false,
		"vat_kind": null,
		"transmitter_data": {
			"transmitter_id": {
				"country_id": "BE",
				"id_code": "BE0123456789"
			},
			"progressive": "cea0d365b4",
			"transmitter_format": "FPR12",
			"sdi_code": "0000000",
			"transmitter_contact": {
				"phone": "",
				"email": "alfio@email.com"
			},
			"recipient_pec": ""
		},
		"transfer_lender": {
			"personal_data": {
				"tax_id_vat": {
					"country_id": "BE",
					"id_code": "BE0123456789",
					"tax_regime": ""
				},
				"company_name": "AP test srl"
			},
			"place": {
				"address": "Via Roma, 123",
				"zip_code": "95100",
				"city": "Catania",
				"province_id": "CT",
				"country_id": "IT"
			},
			"rea_registration": {
				"office": "",
				"number": "",
				"liquidation_status": ""
			},
			"contact": {
				"phone": "",
				"email": "alfio@email.com"
			}
		},
		"transferee_client": {
			"personal_data": {
				"tax_id_vat": {
					"country_id": "BE",
					"id_code": "BE0727506532"
				},
				"tax_id_code": "",
				"company_name": "Boltchi Perio Implant Concepts",
				"first_name": "Alfio BE",
				"last_name": "Piccione",
				"email": "alfio.piccione@gmail.com"
			},
			"place": {
				"address": "Via test 1212312",
				"zip_code": "4444",
				"city": "Belgio",
				"province_id": "",
				"country_id": "BE"
			}
		},
		"invoice_body": {
			"general_data": {
				"doc_type": "TD01",
				"currency": "EUR",
				"date": "2025-10-03",
				"invoice_number": "WEB097/2025",
				"invoice_prefix": "WEB",
				"invoice_suffix": "2025"
			},
			"provident_fund": [],
			"total_document_amount": "4.80"
		},
		"purchase_order_data": {
			"id": "#2855",
			"date": "2025-10-03"
		},
		"connected_invoice_data": [],
		"order_items": [
			{
				"item_code": { "type": "INTERNO", "value": "2636" },
				"item_type": "product",
				"gift_product": null,
				"description": "AAAA",
				"quantity": "1.00",
				"unit": "N.",
				"discount_type": "",
				"discount_percent": "",
				"discount_amount": "",
				"unit_price": "4.80",
				"total_price": "4.80",
				"rate": "0.00",
				"total_tax": 0
			}
		],
		"payment_data": {
			"terms_payment": "TP02",
			"payment_amount": "4.80",
			"payment_details": "MP01",
			"beneficiary": "",
			"financial_institution": "",
			"iban": ""
		},
		"overrides": {
			"bollo_force_apply": false
		}
	},
	"integration": {
		"use": "peppol-via-pop",
		"action": "create"
	}
}
```

---

## Project Structure

```
n8n-nodes-pop/
├── credentials/
│   └── PopApi.credentials.ts       # Unused — kept for reference only
├── nodes/Pop/
│   ├── Pop.node.ts                  # Node definition and metadata
│   ├── Pop.node.json                # Codex metadata (categories, aliases, docs links)
│   ├── pop.svg                      # Node icon
│   ├── router.ts                    # Per-item operation dispatcher
│   ├── types/pop.ts                 # TypeScript resource/operation type map
│   ├── utils/request.ts             # Shared HTTP helper (base URL + error wrapping)
│   └── invoices/
│       ├── index.ts                 # Operation aggregator for the invoices resource
│       ├── invoiceFields.ts         # Form field factory (shared by SdI and Peppol)
│       ├── invoicePayloadBuilder.ts # Assembles deeply nested API payloads from form values
│       ├── createSdiInvoiceXml.ts   # Operation: Create SdI Invoice
│       ├── createPeppolInvoiceUbl.ts# Operation: Create Peppol Invoice
│       ├── getInvoiceStatus.ts      # Operation: Get Invoice Status
│       └── getPeppolDocument.ts     # Operation: Get Peppol Document
├── package.json
├── tsconfig.json
└── eslint.config.mjs
```

---

## Testing Locally

### Prerequisites

- **Node.js v22+** (use `.nvmrc`: `nvm use`)
- **npm**

---

### Steps

```bash
npm install       # Install dependencies
npm run build     # Compile TypeScript → dist/ (initial build)
npm run lint      # Check for linting issues
npm run dev       # Start watch + n8n
```

Open [http://localhost:5678](http://localhost:5678), search for **POP** in the node panel, and start testing. Code changes are picked up automatically — no restart needed.

---

### Verifying the node works

1. Create a new workflow
2. Add a **Manual Trigger** node
3. Add the **POP** node and connect it to the trigger
4. Select **Invoice** as the resource and an operation (e.g. **Create SdI Invoice (XML)**)
5. Set **Input Mode** to **JSON** and paste one of the example payloads from the [Example Payloads](#example-payloads) section above
6. Click **Execute node** — you should see a successful API response or a descriptive error with the full URL, HTTP status, and response body

---

### Linting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix where possible
```

---

### Publishing to npm

```bash
npm login           # Log in to your npm account
npm run release     # Builds, versions, and publishes via @n8n/node-cli
```

> From **May 1st, 2026**, all community nodes must be published via a GitHub Action that includes a provenance statement. See the [n8n community node publishing guide](https://docs.n8n.io/integrations/community-nodes/build-community-nodes/) for details.

---

## Resources

- [POP Cloud API Documentation (Postman)](https://documenter.getpostman.com/view/41622997/2sAYkLmGT8)
- [POP Website](https://popapi.io/)
- [n8n Community Nodes Guide](https://docs.n8n.io/integrations/community-nodes/)
- [n8n Creating Nodes](https://docs.n8n.io/integrations/creating-nodes/)

---

## License

[MIT](LICENSE.md) — Babini Mazzari S.r.l.
