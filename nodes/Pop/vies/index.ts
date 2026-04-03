/**
 * VAT (VIES) resource — aggregates all operations
 *
 * This module serves two purposes:
 *
 * 1. Exports the `properties` array used by Pop.node.ts to register all UI
 *    fields for the vies resource. This includes the operation selector and
 *    each operation's own fields. The shared resource selector lives in
 *    invoices/index.ts (where it was first defined) and lists both resources.
 *
 * 2. Exports the `vies` object used by the router to look up operation
 *    modules by name for dispatch.
 *
 * To add a new operation to the vies resource:
 * 1. Create a new file (e.g. newOperation.ts) with options, properties, and handler
 * 2. Import it here
 * 3. Add its options to the operation selector below
 * 4. Spread its properties into the combined array
 * 5. Add it to the vies dispatch object
 */
import { INodeProperties } from 'n8n-workflow';

import * as validateVat from './validateVat';

/**
 * Combined properties array for the vies resource.
 * Does not include the resource selector — that lives in invoices/index.ts
 * and already lists 'vies' as an option.
 */
export const properties: INodeProperties[] = [
	// Operation selector for the vies resource
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['vies'],
			},
		},
		options: [validateVat.options],
		default: '',
	},
	// Spread each operation's fields — n8n uses displayOptions to show/hide them
	...validateVat.properties,
];

/**
 * Operation dispatch map used by the router.
 * Keys match the operation values defined in each module's options export.
 */
export const vies = {
	validateVat,
};
