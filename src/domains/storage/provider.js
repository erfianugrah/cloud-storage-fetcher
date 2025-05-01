/**
 * Base storage provider interface
 * All storage providers should implement this interface
 */
class StorageProvider {
	constructor(config) {
		this.config = config;
		this.authType = 'none';
	}

	/**
	 * Authenticate a request using provider-specific method
	 * @param {Request} request - The request to authenticate
	 * @returns {Promise<Request>} - The authenticated request
	 */
	async authenticateRequest(request) {
		throw new Error('authenticateRequest method must be implemented by subclass');
	}

	/**
	 * Get the authentication type used by this provider
	 * @returns {string} - The authentication type ('aws-v4', 'azure-sharedkey', 'sas', etc.)
	 */
	getAuthType() {
		return this.authType;
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

	/**
	 * Get provider-specific headers to include in the request
	 * @returns {Object} - Headers to add to the request
	 */
	getRequestHeaders() {
		return {};
	}

	/**
	 * Get the provider name
	 * @returns {string} - Provider name (s3, gcs, r2, azure)
	 */
	getProviderName() {
		throw new Error('getProviderName method must be implemented by subclass');
	}

	/**
	 * Check if the provider supports the requested operation
	 * @param {string} method - HTTP method
	 * @returns {boolean} - Whether operation is supported
	 */
	supportsOperation(method) {
		return ['GET', 'HEAD'].includes(method);
	}
}

export default StorageProvider;