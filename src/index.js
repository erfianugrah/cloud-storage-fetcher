/**
 * Signed Storage Worker
 * 
 * A Cloudflare Worker for serving signed content from AWS S3 and Google Cloud Storage
 * with intelligent caching. Uses HMAC signing for both providers through the aws4fetch library.
 */

import RequestHandler from './handlers/request-handler.js';
import { loadConfig } from './config/config.js';

export default {
	/**
	 * Main entry point for the worker
	 * @param {Request} request - The incoming request
	 * @param {Object} env - Environment variables and secrets
	 * @param {Object} ctx - Execution context
	 * @returns {Promise<Response>} - The response
	 */
	async fetch(request, env, ctx) {
		// Load configuration from environment variables
		const config = loadConfig(env);

		// Initialize request handler with config
		const handler = new RequestHandler(config);
		
		// Handle the request
		const response = await handler.handleRequest(request);
		
		// Allow for background processing tasks through waitUntil
		if (config.ENABLE_BACKGROUND_PROCESSING && typeof ctx.waitUntil === 'function') {
			// Background processing can include logging, analytics, etc.
			ctx.waitUntil(
				(async () => {
					// Example: Add background logging if enabled
					if (config.ENABLE_LOGGING) {
						// This would be where you'd log request information to a service
						console.log(`Request processed: ${request.url}`);
					}
				})()
			);
		}
		
		return response;
	},
};
