import { getCacheConfig } from '../../config/cache-config.js';

/**
 * Handles caching logic for requests
 */
class CacheHandler {
	/**
	 * Constructor
	 * @param {Object} config - Application configuration
	 */
	constructor(config) {
		this.config = config;
		this.cacheRules = getCacheConfig(config);
		this.defaultCacheTtl = config.DEFAULT_CACHE_TTL || 60; // Default to 1 minute if not specified
	}

	/**
	 * Apply caching rules to a request
	 * @param {Request} request - The original request
	 * @returns {Request} - Request with caching headers
	 */
	applyRequestCaching(request) {
		// Clone the request to modify it
		const cachedRequest = new Request(request);
		
		// Add cache control header for Cloudflare
		cachedRequest.headers.set('Cache-Control', 'public, max-age=30');
		
		return cachedRequest;
	}
	
	/**
	 * Process the response and apply appropriate caching rules
	 * @param {Response} response - The response from the origin
	 * @param {string} url - The URL of the request
	 * @returns {Response} - The processed response with caching headers
	 */
	processResponse(response, url) {
		// Clone the response to modify it
		const processedResponse = new Response(response.body, response);
		
		// Remove unnecessary headers - can be customized via HEADERS_TO_REMOVE config
		let headersToRemove = [
			'Set-Cookie',
			'x-goog-generation',
			'x-goog-metageneration',
			'x-goog-hash',
			'x-goog-storage-class',
			'x-amz-id-2',
			'x-amz-request-id'
		];
		
		// Parse HEADERS_TO_REMOVE if it's a string (comma-separated values)
		if (this.config.HEADERS_TO_REMOVE) {
			if (typeof this.config.HEADERS_TO_REMOVE === 'string') {
				headersToRemove = this.config.HEADERS_TO_REMOVE.split(',').map(h => h.trim());
			} else if (Array.isArray(this.config.HEADERS_TO_REMOVE)) {
				headersToRemove = this.config.HEADERS_TO_REMOVE;
			}
		}
		
		// Remove the headers
		headersToRemove.forEach(header => {
			processedResponse.headers.delete(header);
		});
		
		// Apply caching rules based on file extension
		let cacheApplied = false;
		
		for (const asset of this.cacheRules) {
			if (asset.regex.test(url)) {
				processedResponse.headers.set('Cache-Control', `public, max-age=${asset.ttl}`);
				cacheApplied = true;
				break;
			}
		}
		
		// Set default cache control if no specific rule matched
		if (!cacheApplied) {
			processedResponse.headers.set('Cache-Control', `public, max-age=${this.defaultCacheTtl}`);
		}
		
		return processedResponse;
	}
}

export default CacheHandler;