/**
 * Create ZUGFeRD / Factur-X Invoice
 *
 * Generates a structured ZUGFeRD document package through POP Cloud API.
 *
 * POP API endpoint: POST /create-zugferd
 */
import type { IExecuteFunctions, INodePropertyOptions } from 'n8n-workflow';
import { InvoicesProperties } from '../types/pop';
import { popRequest, type PopRequestOptions } from '../utils/request';
import { makeInvoiceFormFields } from './invoiceFields';
import { buildInvoicePayload, type InvoiceFormParams } from './invoicePayloadBuilder';

export const options: INodePropertyOptions = {
	name: 'Create ZUGFeRD Invoice',
	value: 'createZugferdInvoice',
	description: 'Create a ZUGFeRD or Factur-X invoice package through POP Cloud API',
	action: 'Create a ZUGFeRD invoice',
};

const OPERATION = 'createZugferdInvoice';

export const properties: InvoicesProperties = [
	{
		displayName: 'Environment',
		name: 'baseUrl',
		type: 'options',
		options: [{ name: 'Production', value: 'production' }],
		default: 'production',
		displayOptions: { show: { resource: ['invoices'], operation: [OPERATION] } },
		description: 'The POP API environment to use',
	},
	{
		displayName: 'Endpoint Path',
		name: 'path',
		type: 'string',
		default: 'create-zugferd',
		displayOptions: { show: { resource: ['invoices'], operation: [OPERATION] } },
		description: 'Relative path of the POP ZUGFeRD endpoint',
	},
	{
		displayName: 'Input Mode',
		name: 'inputMode',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Use Incoming JSON', value: 'passthrough' },
			{ name: 'Form Fields', value: 'form' },
			{ name: 'JSON', value: 'json' },
			{ name: 'Raw (XML/Other)', value: 'raw' },
		],
		default: 'passthrough',
		displayOptions: { show: { resource: ['invoices'], operation: [OPERATION] } },
		description: 'Choose how the ZUGFeRD request body is supplied',
	},
	...makeInvoiceFormFields(OPERATION),
	{
		displayName: 'JSON Body',
		name: 'jsonBody',
		type: 'json',
		default: '{\n  "license_key": "your_license_key",\n  "data": {\n    "invoice_body": {},\n    "order_items": [],\n    "payment_data": {}\n  }\n}',
		displayOptions: { show: { resource: ['invoices'], operation: [OPERATION], inputMode: ['json'] } },
		description: 'Complete request body following the POP API ZUGFeRD schema',
	},
	{
		displayName: 'Raw Body',
		name: 'rawBody',
		type: 'string',
		default: '',
		typeOptions: { rows: 8 },
		displayOptions: { show: { resource: ['invoices'], operation: [OPERATION], inputMode: ['raw'] } },
		description: 'Raw request body when required by a custom endpoint',
	},
	{
		displayName: 'Extra Headers (JSON)',
		name: 'headers',
		type: 'json',
		default: '{}',
		displayOptions: { show: { resource: ['invoices'], operation: [OPERATION] } },
		description: 'Optional additional request headers',
	},
];

export async function handler(
	this: IExecuteFunctions,
	params: {
		baseUrl?: string;
		path: string;
		inputMode: 'form' | 'json' | 'raw' | 'passthrough';
		environment?: string;
		jsonBody?: object;
		rawBody?: string;
		headers?: Record<string, string>;
		_itemIndex?: number;
	} & Partial<InvoiceFormParams>,
): Promise<unknown> {
	const { baseUrl, path, inputMode, headers } = params;
	const requestOptions: PopRequestOptions = { url: path, method: 'POST', headers: { ...(headers ?? {}) } };

	if (inputMode === 'passthrough') {
		requestOptions.json = true;
		requestOptions.body = this.getInputData()[params._itemIndex ?? 0].json;
	} else if (inputMode === 'form') {
		requestOptions.json = true;
		const formKey = (params.licenseKey ?? '').trim();
		if (formKey) requestOptions.headers = { ...(requestOptions.headers ?? {}), 'X-API-Key': formKey };
		requestOptions.body = buildInvoicePayload(params as InvoiceFormParams, 'zugferd', false);
	} else if (inputMode === 'json') {
		requestOptions.json = true;
		requestOptions.body = params.jsonBody ?? {};
	} else {
		requestOptions.json = false;
		requestOptions.body = params.rawBody ?? '';
		requestOptions.headers = { 'Content-Type': requestOptions.headers?.['Content-Type'] ?? 'application/json', ...(requestOptions.headers ?? {}) };
	}

	return await popRequest.call(this, requestOptions, baseUrl);
}
