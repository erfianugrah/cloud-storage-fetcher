import { AwsClient } from 'aws4fetch';
import StorageProvider from './provider.js';
import { getConfigValue } from '../../config/config.js';

/**
 * Google Cloud Storage provider using S3-compatible API
 */
class GCSProvider extends StorageProvider {
	constructor(config) {
		super(config);
		
		const accessKeyId = getConfigValue(config, 'GCS_ACCESS_KEY_ID');
		const secretAccessKey = getConfigValue(config, 'GCS_SECRET_ACCESS_KEY');
		
		if (!accessKeyId || !secretAccessKey) {
			throw new Error('GCS credentials not configured. Please set GCS_ACCESS_KEY_ID and GCS_SECRET_ACCESS_KEY.');
		}
		
		// Allow service customization
		const service = getConfigValue(config, 'GCS_SERVICE', 's3');
		const region = getConfigValue(config, 'GCS_REGION', 'auto');
		
		this.aws = new AwsClient({
			accessKeyId,
			secretAccessKey,
			service,
			region
		});
		
		// Get bucket name
		this.bucket = getConfigValue(config, 'GCS_BUCKET');
		if (!this.bucket) {
			throw new Error('GCS bucket not configured. Please set GCS_BUCKET.');
		}
		
		// Custom endpoint support
		this.endpoint = getConfigValue(config, 'GCS_ENDPOINT', 'https://storage.googleapis.com');
		
		// Path prefix support
		this.pathPrefix = getConfigValue(config, 'GCS_PATH_PREFIX', '');
		if (this.pathPrefix && !this.pathPrefix.endsWith('/')) {
			this.pathPrefix += '/';
		}
	}

	/**
	 * Sign a request using AWS HMAC (compatible with GCS XML API)
	 * @param {Request} request - The request to sign
	 * @returns {Promise<Request>} - The signed request
	 */
	async signRequest(request) {
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
	 * Transform the URL to GCS format
	 * @param {string} originalUrl - The original URL path
	 * @returns {string} - The transformed GCS URL
	 */
	transformUrl(originalUrl) {
		// Remove the /gcs prefix if present and add any configured path prefix
		const path = originalUrl.replace(/^\/gcs\//, '');
		
		return `${this.endpoint}/${this.bucket}/${this.pathPrefix}${path}`;
	}
}

export default GCSProvider;