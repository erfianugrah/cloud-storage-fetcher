import { AwsClient } from 'aws4fetch';
import StorageProvider from './provider.js';
import { getConfigValue } from '../../config/config.js';

/**
 * AWS S3 storage provider
 */
class S3Provider extends StorageProvider {
	constructor(config) {
		super(config);
		
		const accessKeyId = getConfigValue(config, 'AWS_ACCESS_KEY_ID');
		const secretAccessKey = getConfigValue(config, 'AWS_SECRET_ACCESS_KEY');
		const region = getConfigValue(config, 'AWS_REGION', 'us-east-1');
		
		if (!accessKeyId || !secretAccessKey) {
			throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
		}
		
		this.aws = new AwsClient({
			accessKeyId,
			secretAccessKey,
			region
		});
		
		this.bucket = getConfigValue(config, 'S3_BUCKET');
		if (!this.bucket) {
			throw new Error('S3 bucket not configured. Please set S3_BUCKET.');
		}
		
		// Custom endpoint support
		this.endpoint = getConfigValue(config, 'S3_ENDPOINT');
		
		// Path prefix support
		this.pathPrefix = getConfigValue(config, 'S3_PATH_PREFIX', '');
		if (this.pathPrefix && !this.pathPrefix.endsWith('/')) {
			this.pathPrefix += '/';
		}
	}

	/**
	 * Sign a request using AWS HMAC
	 * @param {Request} request - The request to sign
	 * @returns {Promise<Request>} - The signed request
	 */
	async signRequest(request) {
		return this.aws.sign(request);
	}

	/**
	 * Get the bucket name
	 * @returns {string} - The S3 bucket name
	 */
	getBucketName() {
		return this.bucket;
	}

	/**
	 * Transform the URL to S3 format
	 * @param {string} originalUrl - The original URL path
	 * @returns {string} - The transformed S3 URL
	 */
	transformUrl(originalUrl) {
		// Remove the /s3 prefix if present and add any configured path prefix
		const path = originalUrl.replace(/^\/s3\//, '');
		
		// Use custom endpoint if configured
		if (this.endpoint) {
			return `${this.endpoint}/${this.bucket}/${this.pathPrefix}${path}`;
		}
		
		// Default S3 URL format
		return `https://${this.bucket}.s3.${this.config.AWS_REGION}.amazonaws.com/${this.pathPrefix}${path}`;
	}
}

export default S3Provider;