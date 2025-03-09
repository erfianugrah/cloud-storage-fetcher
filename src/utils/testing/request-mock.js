/**
 * Request mock utility
 * Helps create various test request scenarios
 */

/**
 * Create a test request for a specific path and provider
 * @param {string} path - The path to request
 * @param {string} provider - The provider ('s3', 'gcs', or a custom path)
 * @param {Object} options - Additional request options
 * @returns {Request} - The test request
 */
export function createTestRequest(path, provider = 's3', options = {}) {
	const providerPath = provider === 's3' ? '/s3' : 
		provider === 'gcs' ? '/gcs' : 
		provider;
	
	const fullPath = `${providerPath}/${path.replace(/^\//, '')}`;
	const url = `http://example.com${fullPath}`;
	
	// Default options
	const requestOptions = {
		method: 'GET',
		headers: {},
		...options
	};
	
	return new Request(url, requestOptions);
}

/**
 * Create a test request with debug mode enabled
 * @param {string} path - The path to request
 * @param {string} provider - The provider
 * @returns {Request} - The test request with debug header
 */
export function createDebugRequest(path, provider = 's3') {
	return createTestRequest(path, provider, {
		headers: {
			'debug': 'test'
		}
	});
}

/**
 * Create a health check request
 * @param {string} healthPath - The health check path
 * @returns {Request} - The health check request
 */
export function createHealthCheckRequest(healthPath = '/__health') {
	return new Request(`http://example.com${healthPath}`);
}

/**
 * Create a request for a file with a specific extension
 * @param {string} extension - The file extension (without dot)
 * @param {string} provider - The provider
 * @returns {Request} - The test request
 */
export function createFileRequest(extension, provider = 's3') {
	return createTestRequest(`test-file.${extension}`, provider);
}

/**
 * Create a test request with custom headers
 * @param {string} path - The path to request
 * @param {Object} headers - Headers to add to the request
 * @param {string} provider - The provider
 * @returns {Request} - The test request with custom headers
 */
export function createRequestWithHeaders(path, headers, provider = 's3') {
	return createTestRequest(path, provider, { headers });
}

/**
 * Create a test request for a custom URL pattern
 * @param {string} pattern - The URL pattern (e.g., '/images/', '/videos/')
 * @param {string} filename - The filename
 * @returns {Request} - The test request
 */
export function createPatternRequest(pattern, filename) {
	const path = pattern.endsWith('/') ? pattern + filename : pattern + '/' + filename;
	return new Request(`http://example.com${path}`);
}