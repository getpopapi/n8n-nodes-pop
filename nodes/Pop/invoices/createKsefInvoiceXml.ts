/**
 * Create KSeF Invoice (FA(3) XML)
 *
 * Generates Polish KSeF FA(3) XML through the POP Cloud API.
 * Supports the same input modes and shared invoice form as the other creation
 * operations, with optional KSeF provider submission.
 *
 * POP API endpoint: POST /create-ksef-xml
 */
import type { IExecuteFunctions, INodePropertyOptions } from 'n8n-workflow';
import { InvoicesProperties } from '../types/pop';
import { popRequest, type PopRequestOptions } from '../utils/request';
import { makeInvoiceFormFields } from './invoiceFields';
import { buildInvoicePayload, type InvoiceFormParams } from './invoicePayloadBuilder';

export const options: INodePropertyOptions = {
	name: 'Create KSeF Invoice (FA(3) XML)',
	value: 'createKsefInvoiceXml',
	description: 'Create a Polish KSeF FA(3) invoice or credit note through POP Cloud API',
	action: 'Create a KSeF invoice',
};

const OPERATION = 'createKsefInvoiceXml';

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
		default: 'create-ksef-xml',
		displayOptions: { show: { resource: ['invoices'], operation: [OPERATION] } },
		description: 'Relative path of the POP KSeF endpoint',
	},
	{
		displayName: 'Submit via KSeF Provider',
		name: 'submitViaKsef',
		type: 'options',
		options: [{ name: 'Yes', value: 'yes' }, { name: 'No', value: 'no' }],
		default: 'no',
		displayOptions: { show: { resource: ['invoices'], operation: [OPERATION] } },
		description: 'Whether to include the KSeF provider integration in the request',
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
		description: 'Choose how the KSeF request body is supplied',
	},
	...makeInvoiceFormFields(OPERATION),
	{
		displayName: 'JSON Body',
		name: 'jsonBody',
		type: 'json',
		default: '{\n  "license_key": "your_license_key",\n  "data": {\n    "invoice_body": {},\n    "order_items": [],\n    "payment_data": {}\n  }\n}',
		displayOptions: { show: { resource: ['invoices'], operation: [OPERATION], inputMode: ['json'] } },
		description: 'Complete request body following the POP API KSeF schema',
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
		submitViaKsef: 'yes' | 'no';
		inputMode: 'form' | 'json' | 'raw' | 'passthrough';
		environment?: string;
		jsonBody?: object;
		rawBody?: string;
		headers?: Record<string, string>;
		_itemIndex?: number;
	} & Partial<InvoiceFormParams>,
): Promise<unknown> {
	const { baseUrl, path, inputMode, submitViaKsef, headers } = params;
	const sendInvoice = submitViaKsef === 'yes';
	const requestOptions: PopRequestOptions = { url: path, method: 'POST', headers: { ...(headers ?? {}) } };

	if (inputMode === 'passthrough') {
		requestOptions.json = true;
		const body = { ...this.getInputData()[params._itemIndex ?? 0].json };
		if (sendInvoice) body.integration = { use: 'ksef-via-pop', action: 'create' };
		requestOptions.body = body;
	} else if (inputMode === 'form') {
		requestOptions.json = true;
		const formKey = (params.licenseKey ?? '').trim();
		if (formKey) requestOptions.headers = { ...(requestOptions.headers ?? {}), 'X-API-Key': formKey };
		requestOptions.body = buildInvoicePayload(params as InvoiceFormParams, 'ksef', sendInvoice);
	} else if (inputMode === 'json') {
		requestOptions.json = true;
		const body = (params.jsonBody ?? {}) as Record<string, unknown>;
		if (sendInvoice) body.integration = { use: 'ksef-via-pop', action: 'create' };
		requestOptions.body = body;
	} else {
		requestOptions.json = false;
		requestOptions.body = params.rawBody ?? '';
		requestOptions.headers = { 'Content-Type': requestOptions.headers?.['Content-Type'] ?? 'application/xml', ...(requestOptions.headers ?? {}) };
	}

	return await popRequest.call(this, requestOptions, baseUrl);
}
