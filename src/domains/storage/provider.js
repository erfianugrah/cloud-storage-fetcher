/**
 * Base storage provider interface
 * All storage providers should implement this interface
 */
class StorageProvider {
	constructor(config) {
		this.config = config;
	}

	/**
	 * Sign a request using HMAC
	 * @param {Request} request - The request to sign
	 * @returns {Promise<Request>} - The signed request
	 */
	async signRequest(request) {
		throw new Error('signRequest method must be implemented by subclass');
	}

	/**
	 * Get the bucket name for this provider
	 * @returns {string} - The bucket name
	 */
	getBucketName() {
		throw new Error('getBucketName method must be implemented by subclass');
	}

	/**
	 * Transform a URL for this provider
	 * @param {string} originalUrl - The original URL
	 * @returns {string} - The transformed URL
	 */
	transformUrl(originalUrl) {
		throw new Error('transformUrl method must be implemented by subclass');
	}
}

export default StorageProvider;