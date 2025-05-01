import { AwsClient } from 'aws4fetch';
import StorageProvider from './provider.js';
import { getConfigValue } from '../../config/config.js';

/**
 * Cloudflare R2 storage provider using S3-compatible API
 */
class R2Provider extends StorageProvider {
	constructor(config) {
		super(config);
		
		// Set auth type
		this.authType = 'aws-v4';
		
		const accessKeyId = getConfigValue(config, 'R2_ACCESS_KEY_ID');
		const secretAccessKey = getConfigValue(config, 'R2_SECRET_ACCESS_KEY');
		
		if (!accessKeyId || !secretAccessKey) {
			throw new Error('R2 credentials not configured. Please set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.');
		}
		
		// R2 specific settings
		const accountId = getConfigValue(config, 'R2_ACCOUNT_ID');
		if (!accountId) {
			throw new Error('R2 account ID not configured. Please set R2_ACCOUNT_ID.');
		}
		
		// R2 uses a special endpoint format and 'auto' region
		this.endpoint = getConfigValue(
			config, 
			'R2_ENDPOINT', 
			`https://${accountId}.r2.cloudflarestorage.com`
		);
		
		this.aws = new AwsClient({
			accessKeyId,
			secretAccessKey,
			service: 's3',
			region: 'auto'
		});
		
		// Get bucket name
		this.bucket = getConfigValue(config, 'R2_BUCKET');
		if (!this.bucket) {
			throw new Error('R2 bucket not configured. Please set R2_BUCKET.');
		}
		
		// Path prefix support
		this.pathPrefix = getConfigValue(config, 'R2_PATH_PREFIX', '');
		if (this.pathPrefix && !this.pathPrefix.endsWith('/')) {
			this.pathPrefix += '/';
		}
		
		// Special options for R2
		this.usePrivateWorkerBinding = getConfigValue(config, 'R2_USE_WORKER_BINDING', false);
		this.workerBindingName = getConfigValue(config, 'R2_WORKER_BINDING_NAME', 'R2_BUCKET');
	}

	/**
	 * Authenticate a request using AWS SignV4 compatible with R2
	 * @param {Request} request - The request to authenticate
	 * @returns {Promise<Request>} - The authenticated request
	 */
	async authenticateRequest(request) {
		// For R2, we don't need to sign the request if using Worker bindings
		if (this.usePrivateWorkerBinding) {
			return request;
		}
		
		// Otherwise use AWS SignV4 for public buckets
		return this.aws.sign(request);
	}

	/**
	 * Get the bucket name
	 * @returns {string} - The R2 bucket name
	 */
	getBucketName() {
		return this.bucket;
	}
	
	/**
	 * Get provider name
	 * @returns {string} - Provider name
	 */
	getProviderName() {
		return 'r2';
	}

	/**
	 * Transform the URL to R2 format
	 * @param {string} originalUrl - The original URL path
	 * @returns {string} - The transformed R2 URL
	 */
	transformUrl(originalUrl) {
		// Remove the /r2 prefix if present and add any configured path prefix
		const path = originalUrl.replace(/^\/r2\//, '');
		
		// If using Worker binding, return a special URL format that will be
		// intercepted by a middleware in the request handler
		if (this.usePrivateWorkerBinding) {
			// This is a virtual URL scheme that will be detected by the worker
			// Format: r2://BINDING_NAME/path/to/object.ext
			return `r2://${this.workerBindingName}/${this.pathPrefix}${path}`;
		}
		
		// Standard R2 public URL format for external bucket access
		return `${this.endpoint}/${this.bucket}/${this.pathPrefix}${path}`;
	}
	
	/**
	 * Get R2-specific headers
	 * @returns {Object} - Headers to add to the request
	 */
	getRequestHeaders() {
		// Cloudflare recommends these headers for R2
		return {
			'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
			// Add R2-specific headers if needed
		};
	}
	
	/**
	 * Check if the R2 provider supports the requested operation
	 * @param {string} method - HTTP method
	 * @returns {boolean} - Whether operation is supported
	 */
	supportsOperation(method) {
		// R2 supports all standard S3 methods
		return ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'].includes(method);
	}
}

export default R2Provider;