import ProviderFactory from '../domains/storage/provider-factory.js';
import CacheHandler from '../domains/cache/cache-handler.js';
import { getConfigValue } from '../config/config.js';

/**
 * Main request handler
 */
class RequestHandler {
	/**
	 * Constructor
	 * @param {Object} config - Application configuration
	 */
	constructor(config) {
		this.config = config;
	}

	/**
	 * Handle the incoming request
	 * @param {Request} request - The incoming request
	 * @returns {Promise<Response>} - The response
	 */
	async handleRequest(request) {
		try {
			const url = new URL(request.url);
			
			// Check for debug mode - can be enabled via request header or config
			const debugHeader = request.headers.get('debug');
			const isDebug = debugHeader === 'test' || getConfigValue(this.config, 'DEBUG_MODE', false);
			
			// Check for health check requests
			const healthCheckPath = getConfigValue(this.config, 'HEALTH_CHECK_PATH', '/__health');
			if (url.pathname === healthCheckPath) {
				return this.handleHealthCheck();
			}
			
			// Create the appropriate storage provider based on the URL
			const provider = ProviderFactory.createProvider(request, this.config);
			
			// Transform the URL for the appropriate storage provider
			const storageUrl = provider.transformUrl(url.pathname);
			
			// Create a new request to the storage provider
			const storageRequest = new Request(storageUrl, {
				method: request.method,
				headers: new Headers(request.headers)
			});
			
			// Apply caching to the request
			const cacheHandler = new CacheHandler(this.config);
			const cachedRequest = cacheHandler.applyRequestCaching(storageRequest);
			
			// Sign the request using HMAC
			const signedRequest = await provider.signRequest(cachedRequest);
			
			// Fetch timeout support
			const fetchTimeout = getConfigValue(this.config, 'FETCH_TIMEOUT', 30000);
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);
			
			try {
				// Fetch the content from the storage provider
				const response = await fetch(signedRequest, {
					signal: controller.signal
				});
				
				// Clear the timeout
				clearTimeout(timeoutId);
				
				// If the response is not successful, return it directly
				if (!response.ok) {
					// Add error context in debug mode
					if (isDebug) {
						const errorResponse = new Response(response.body, response);
						errorResponse.headers.set('X-Debug-Provider', provider.constructor.name);
						errorResponse.headers.set('X-Debug-Bucket', provider.getBucketName());
						errorResponse.headers.set('X-Debug-Original-URL', url.pathname);
						errorResponse.headers.set('X-Debug-Storage-URL', storageUrl);
						return errorResponse;
					}
					return response;
				}
				
				// Process the response and apply caching
				const processedResponse = cacheHandler.processResponse(response, url.pathname);
				
				// Add debug information if requested
				if (isDebug) {
					processedResponse.headers.set('X-Debug-Provider', provider.constructor.name);
					processedResponse.headers.set('X-Debug-Bucket', provider.getBucketName());
					processedResponse.headers.set('X-Debug-Original-URL', url.pathname);
					processedResponse.headers.set('X-Debug-Storage-URL', storageUrl);
					processedResponse.headers.set('X-Debug-Cache-Config', JSON.stringify(cacheHandler.cacheRules));
				}
				
				return processedResponse;
			} catch (fetchError) {
				// Clear the timeout
				clearTimeout(timeoutId);
				
				// Handle fetch timeout or other fetch errors
				if (fetchError.name === 'AbortError') {
					return new Response('Request timed out', { status: 504 });
				}
				throw fetchError;
			}
		} catch (error) {
			// Get the error response format from config
			const errorFormat = getConfigValue(this.config, 'ERROR_FORMAT', 'text');
			
			if (errorFormat === 'json') {
				return new Response(
					JSON.stringify({ 
						error: error.message, 
						status: 500 
					}), 
					{ 
						status: 500, 
						headers: { 'Content-Type': 'application/json' } 
					}
				);
			} else {
				// Default to text error
				return new Response(`Error: ${error.message}`, { status: 500 });
			}
		}
	}
	
	/**
	 * Handle health check requests
	 * @returns {Response} - Health check response
	 */
	handleHealthCheck() {
		const healthResponse = {
			status: 'healthy',
			version: getConfigValue(this.config, 'VERSION', '1.0.0'),
			timestamp: new Date().toISOString()
		};
		
		return new Response(
			JSON.stringify(healthResponse),
			{ 
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
}

export default RequestHandler;