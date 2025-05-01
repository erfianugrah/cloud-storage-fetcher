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
			
			// Add provider-specific headers
			const providerHeaders = provider.getRequestHeaders();
			for (const [key, value] of Object.entries(providerHeaders)) {
				cachedRequest.headers.set(key, value);
			}
			
			// Authenticate the request using provider-specific method
			const authenticatedRequest = await provider.authenticateRequest(cachedRequest);
			
			// Fetch timeout support
			const fetchTimeout = getConfigValue(this.config, 'FETCH_TIMEOUT', 30000);
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);
			
			try {
				// Check if this is an R2 Worker binding URL (r2://BINDING_NAME/path)
				const url = new URL(authenticatedRequest.url);
				let response;
				
				if (url.protocol === 'r2:') {
					// Handle R2 binding request
					const bindingName = url.hostname;
					const objectKey = url.pathname.substring(1); // Remove leading /
					
					// Get the binding from environment
					const r2Binding = this.config[bindingName];
					if (!r2Binding) {
						throw new Error(`R2 binding '${bindingName}' not found in Worker environment`);
					}
					
					// Handle different request methods
					switch (authenticatedRequest.method) {
						case 'GET':
							// Get the object from R2
							const object = await r2Binding.get(objectKey);
							if (!object) {
								response = new Response('Not Found', { status: 404 });
							} else {
								// Create response with the object body and metadata
								const headers = new Headers();
								if (object.httpMetadata) {
									object.writeHttpMetadata(headers);
								}
								headers.set('ETag', object.httpEtag);
								response = new Response(object.body, { 
									headers
								});
							}
							break;
						case 'HEAD':
							// Get only metadata
							const headObject = await r2Binding.head(objectKey);
							if (!headObject) {
								response = new Response('Not Found', { status: 404 });
							} else {
								// Create response with just metadata
								const headers = new Headers();
								if (headObject.httpMetadata) {
									headObject.writeHttpMetadata(headers);
								}
								headers.set('ETag', headObject.httpEtag);
								headers.set('Content-Length', headObject.size);
								response = new Response(null, { 
									headers
								});
							}
							break;
						default:
							response = new Response('Method Not Allowed', { status: 405 });
					}
				} else {
					// Normal fetch for non-R2 binding URLs
					response = await fetch(authenticatedRequest, {
						signal: controller.signal
					});
				}
				
				// Clear the timeout
				clearTimeout(timeoutId);
				
				// If the response is not successful, return it directly
				if (!response.ok) {
					// Add error context in debug mode
					if (isDebug) {
						const errorResponse = new Response(response.body, response);
						errorResponse.headers.set('X-Debug-Provider', provider.getProviderName());
						errorResponse.headers.set('X-Debug-Bucket', provider.getBucketName());
						errorResponse.headers.set('X-Debug-Original-URL', url.pathname);
						errorResponse.headers.set('X-Debug-Storage-URL', storageUrl);
						errorResponse.headers.set('X-Debug-Auth-Type', provider.getAuthType());
						return errorResponse;
					}
					return response;
				}
				
				// Process the response and apply caching
				const processedResponse = cacheHandler.processResponse(response, url.pathname);
				
				// Add debug information if requested
				if (isDebug) {
					processedResponse.headers.set('X-Debug-Provider', provider.getProviderName());
					processedResponse.headers.set('X-Debug-Bucket', provider.getBucketName());
					processedResponse.headers.set('X-Debug-Original-URL', url.pathname);
					processedResponse.headers.set('X-Debug-Storage-URL', storageUrl);
					processedResponse.headers.set('X-Debug-Auth-Type', provider.getAuthType());
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