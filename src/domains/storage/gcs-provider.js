import { AwsClient } from 'aws4fetch';
import StorageProvider from './provider.js';
import { getConfigValue } from '../../config/config.js';

/**
 * Google Cloud Storage provider using S3-compatible API
 */
class GCSProvider extends StorageProvider {
	constructor(config) {
		super(config);
		
		// Set auth type
		this.authType = 'aws-v4';
		
		const accessKeyId = getConfigValue(config, 'GCS_ACCESS_KEY_ID');
		const secretAccessKey = getConfigValue(config, 'GCS_SECRET_ACCESS_KEY');
		
		if (!accessKeyId || !secretAccessKey) {
			throw new Error('GCS credentials not configured. Please set GCS_ACCESS_KEY_ID and GCS_SECRET_ACCESS_KEY.');
		}
		
		// GCS S3 interoperability requires proper host and service settings
		this.endpoint = getConfigValue(config, 'GCS_ENDPOINT', 'https://storage.googleapis.com');
		const region = getConfigValue(config, 'GCS_REGION', 'auto');
		
		// Important: For GCS's S3 interoperability, we must use:
		// - service: 's3' (not 'storage')
		// - region: 'auto' (or specific region if regional storage)
		// - host: 'storage.googleapis.com' (fixed in constructor and request creation)
		this.aws = new AwsClient({
			accessKeyId,
			secretAccessKey,
			service: 's3',
			region
		});
		
		// Get bucket name
		this.bucket = getConfigValue(config, 'GCS_BUCKET');
		if (!this.bucket) {
			throw new Error('GCS bucket not configured. Please set GCS_BUCKET.');
		}
		
		// Path prefix support
		this.pathPrefix = getConfigValue(config, 'GCS_PATH_PREFIX', '');
		if (this.pathPrefix && !this.pathPrefix.endsWith('/')) {
			this.pathPrefix += '/';
		}
		
		// Store region for reference
		this.region = region;
	}

	/**
	 * Authenticate a request using AWS SignV4 compatible with GCS XML API
	 * @param {Request} request - The request to authenticate
	 * @returns {Promise<Request>} - The authenticated request
	 */
	async authenticateRequest(request) {
		// For GCS S3 interoperability, we need to ensure proper host header
		// Get the current request URL
		const url = new URL(request.url);
		
		// Create a new request with modified host header if needed
		if (!url.hostname.includes('googleapis.com')) {
			const newRequest = new Request(request);
			newRequest.headers.set('Host', 'storage.googleapis.com');
			return this.aws.sign(newRequest);
		}
		
		return this.aws.sign(request);
	}

	/**
	 * Get the bucket name
	 * @returns {string} - The GCS bucket name
	 */
	getBucketName() {
		return this.bucket;
	}
	
	/**
	 * Get provider name
	 * @returns {string} - Provider name
	 */
	getProviderName() {
		return 'gcs';
	}

	/**
	 * Transform the URL to GCS format
	 * @param {string} originalUrl - The original URL path
	 * @returns {string} - The transformed GCS URL
	 */
	transformUrl(originalUrl) {
		// Remove the /gcs prefix if present and add any configured path prefix
		const path = originalUrl.replace(/^\/gcs\//, '');
		
		// GCS prefers path-style URLs for interoperability
		return `${this.endpoint}/${this.bucket}/${this.pathPrefix}${path}`;
	}
	
	/**
	 * Get GCS-specific headers for S3 interoperability
	 * @returns {Object} - Headers to add to the request
	 */
	getRequestHeaders() {
		return {
			// GCS requires this header for SignV4 compatibility
			'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
			// Ensure we're using the XML API
			'x-goog-api-version': '2'
		};
	}
	
	/**
	 * Check if the GCS provider supports the requested operation
	 * @param {string} method - HTTP method
	 * @returns {boolean} - Whether operation is supported
	 */
	supportsOperation(method) {
		// GCS S3 interoperability supports these methods
		return ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'].includes(method);
	}
}

export default GCSProvider;