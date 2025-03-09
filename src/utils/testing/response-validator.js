/**
 * Response validator utility
 * Helps validate responses from the worker
 */

/**
 * Validate a response from the worker
 * @param {Response} response - The response to validate
 * @returns {Promise<Object>} - Validation result
 */
export async function validateResponse(response) {
	const result = {
		status: response.status,
		headers: {},
		isValid: response.ok,
		body: null
	};
	
	// Extract headers
	response.headers.forEach((value, key) => {
		result.headers[key] = value;
	});
	
	// Try to parse the body
	try {
		const contentType = response.headers.get('Content-Type') || '';
		
		if (contentType.includes('application/json')) {
			result.body = await response.json();
		} else {
			result.body = await response.text();
		}
	} catch (error) {
		result.bodyError = error.message;
		result.isValid = false;
	}
	
	return result;
}

/**
 * Check if a response has appropriate cache headers
 * @param {Response} response - The response to check
 * @param {number} expectedTtl - The expected TTL value, if any
 * @returns {Object} - Validation result
 */
export function validateCacheHeaders(response, expectedTtl = null) {
	const cacheControl = response.headers.get('Cache-Control');
	
	const result = {
		hasCacheControl: !!cacheControl,
		cacheControl
	};
	
	if (expectedTtl !== null && cacheControl) {
		const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
		if (maxAgeMatch) {
			const actualTtl = parseInt(maxAgeMatch[1], 10);
			result.ttlMatches = actualTtl === expectedTtl;
			result.actualTtl = actualTtl;
			result.expectedTtl = expectedTtl;
		} else {
			result.ttlMatches = false;
			result.error = 'max-age directive not found in Cache-Control header';
		}
	}
	
	return result;
}

/**
 * Validate debug headers in a response
 * @param {Response} response - The response to validate
 * @returns {Object} - Validation result with debug information
 */
export function validateDebugHeaders(response) {
	const result = {
		hasDebugHeaders: false,
		debugInfo: {}
	};
	
	const expectedDebugHeaders = [
		'X-Debug-Provider',
		'X-Debug-Bucket',
		'X-Debug-Original-URL',
		'X-Debug-Storage-URL',
		'X-Debug-Cache-Config'
	];
	
	const missingHeaders = [];
	
	for (const header of expectedDebugHeaders) {
		const value = response.headers.get(header);
		if (value) {
			result.debugInfo[header] = value;
		} else {
			missingHeaders.push(header);
		}
	}
	
	result.hasDebugHeaders = missingHeaders.length === 0;
	result.missingDebugHeaders = missingHeaders;
	
	// Try to parse the cache config if present
	const cacheConfig = response.headers.get('X-Debug-Cache-Config');
	if (cacheConfig) {
		try {
			result.debugInfo.parsedCacheConfig = JSON.parse(cacheConfig);
		} catch (error) {
			result.debugInfo.cacheConfigParseError = error.message;
		}
	}
	
	return result;
}

/**
 * Validate a health check response
 * @param {Response} response - The health check response
 * @returns {Promise<Object>} - Validation result
 */
export async function validateHealthCheckResponse(response) {
	const result = {
		status: response.status,
		isValid: false
	};
	
	if (response.status !== 200) {
		result.error = `Expected status 200, got ${response.status}`;
		return result;
	}
	
	const contentType = response.headers.get('Content-Type');
	if (!contentType || !contentType.includes('application/json')) {
		result.error = `Expected Content-Type application/json, got ${contentType}`;
		return result;
	}
	
	try {
		const body = await response.json();
		result.body = body;
		
		// Validate required fields
		if (!body.status) {
			result.error = 'Missing status field in health check response';
			return result;
		}
		
		if (!body.version) {
			result.error = 'Missing version field in health check response';
			return result;
		}
		
		if (!body.timestamp) {
			result.error = 'Missing timestamp field in health check response';
			return result;
		}
		
		// All checks passed
		result.isValid = true;
		return result;
	} catch (error) {
		result.error = `Failed to parse JSON response: ${error.message}`;
		return result;
	}
}

/**
 * Validate an error response
 * @param {Response} response - The error response
 * @param {string} expectedFormat - Expected format ('text' or 'json')
 * @returns {Promise<Object>} - Validation result
 */
export async function validateErrorResponse(response, expectedFormat = 'text') {
	const result = {
		status: response.status,
		isValid: false
	};
	
	if (response.status < 400) {
		result.error = `Expected error status (4xx/5xx), got ${response.status}`;
		return result;
	}
	
	if (expectedFormat === 'json') {
		const contentType = response.headers.get('Content-Type');
		if (!contentType || !contentType.includes('application/json')) {
			result.error = `Expected Content-Type application/json, got ${contentType}`;
			return result;
		}
		
		try {
			const body = await response.json();
			result.body = body;
			
			if (!body.error) {
				result.error = 'Missing error field in JSON error response';
				return result;
			}
			
			if (!body.status) {
				result.error = 'Missing status field in JSON error response';
				return result;
			}
			
			result.isValid = true;
			return result;
		} catch (error) {
			result.error = `Failed to parse JSON response: ${error.message}`;
			return result;
		}
	} else {
		// Text error format
		try {
			const body = await response.text();
			result.body = body;
			
			if (!body.includes('Error:')) {
				result.error = 'Error response does not contain "Error:" prefix';
				return result;
			}
			
			result.isValid = true;
			return result;
		} catch (error) {
			result.error = `Failed to read response text: ${error.message}`;
			return result;
		}
	}
}