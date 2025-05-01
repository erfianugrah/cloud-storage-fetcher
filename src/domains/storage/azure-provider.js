import StorageProvider from './provider.js';
import { getConfigValue } from '../../config/config.js';

/**
 * Azure Blob Storage provider
 * Supports SAS token and Shared Key authentication
 */
class AzureProvider extends StorageProvider {
	constructor(config) {
		super(config);
		
		// Set auth type based on available credentials
		const accountKey = getConfigValue(config, 'AZURE_STORAGE_ACCOUNT_KEY');
		const sasToken = getConfigValue(config, 'AZURE_SAS_TOKEN');
		
		if (accountKey) {
			this.authType = 'azure-sharedkey';
		} else if (sasToken) {
			this.authType = 'azure-sas';
			
			// For SAS token, ensure it starts with '?'
			if (sasToken && !sasToken.startsWith('?')) {
				this.sasToken = `?${sasToken}`;
			} else {
				this.sasToken = sasToken;
			}
		} else {
			throw new Error('Azure credentials not configured. Please set either AZURE_STORAGE_ACCOUNT_KEY or AZURE_SAS_TOKEN.');
		}
		
		// Get account name
		this.accountName = getConfigValue(config, 'AZURE_STORAGE_ACCOUNT_NAME');
		if (!this.accountName) {
			throw new Error('Azure account name not configured. Please set AZURE_STORAGE_ACCOUNT_NAME.');
		}
		
		// Get container name (equivalent to bucket in S3)
		this.container = getConfigValue(config, 'AZURE_CONTAINER');
		if (!this.container) {
			throw new Error('Azure container not configured. Please set AZURE_CONTAINER.');
		}
		
		// Custom endpoint support
		this.endpoint = getConfigValue(
			config, 
			'AZURE_ENDPOINT', 
			`https://${this.accountName}.blob.core.windows.net`
		);
		
		// Path prefix support
		this.pathPrefix = getConfigValue(config, 'AZURE_PATH_PREFIX', '');
		if (this.pathPrefix && !this.pathPrefix.endsWith('/')) {
			this.pathPrefix += '/';
		}
		
		// Store account key for shared key auth
		this.accountKey = accountKey;
	}

	/**
	 * Authenticate a request for Azure Blob Storage
	 * @param {Request} request - The request to authenticate
	 * @returns {Promise<Request>} - The authenticated request
	 */
	async authenticateRequest(request) {
		// Create a new request to modify
		const authRequest = new Request(request);
		
		if (this.authType === 'azure-sas') {
			// For SAS token authentication, just append the token to the URL
			const url = new URL(authRequest.url);
			// Avoid duplicate '?' in URL
			const separator = url.search ? '&' : '?';
			const sasTokenValue = this.sasToken.startsWith('?') 
				? this.sasToken.substring(1) 
				: this.sasToken;
			
			// Create new URL with SAS token
			const newUrl = `${url.origin}${url.pathname}${url.search}${separator}${sasTokenValue}`;
			return new Request(newUrl, authRequest);
		} else if (this.authType === 'azure-sharedkey') {
			// For Shared Key authentication, we need to add an Authorization header
			// This is a simplified implementation - in production, you would need
			// a proper SharedKey signing function
			const date = new Date().toUTCString();
			authRequest.headers.set('x-ms-date', date);
			authRequest.headers.set('x-ms-version', '2020-04-08');
			
			// In a real implementation, you would compute the signature here
			// This is a placeholder - you would need to implement the actual signature computation
			const signature = this.computeSharedKeySignature(authRequest);
			authRequest.headers.set(
				'Authorization', 
				`SharedKey ${this.accountName}:${signature}`
			);
			
			return authRequest;
		}
		
		// Default fallback - return request unchanged
		return request;
	}
	
	/**
	 * Compute the SharedKey signature for Azure (placeholder implementation)
	 * @param {Request} request - The request to sign
	 * @returns {string} - The computed signature
	 */
	computeSharedKeySignature(request) {
		// This is a placeholder - in production code, you would implement
		// the actual Azure Storage Shared Key signature computation here
		// according to Azure docs: https://docs.microsoft.com/en-us/rest/api/storageservices/authorize-with-shared-key
		
		// The full implementation requires:
		// 1. Constructing the string-to-sign from various headers
		// 2. HMAC-SHA256 encoding with the account key
		// 3. Base64 encoding the result
		
		// For now, return a note that this needs implementation
		console.warn('Azure SharedKey signature computation not implemented');
		return 'NOT_IMPLEMENTED';
	}

	/**
	 * Get the container name (equivalent to bucket)
	 * @returns {string} - The Azure container name
	 */
	getBucketName() {
		return this.container;
	}
	
	/**
	 * Get provider name
	 * @returns {string} - Provider name
	 */
	getProviderName() {
		return 'azure';
	}

	/**
	 * Transform the URL to Azure Blob Storage format
	 * @param {string} originalUrl - The original URL path
	 * @returns {string} - The transformed Azure URL
	 */
	transformUrl(originalUrl) {
		// Remove the /azure prefix if present and add any configured path prefix
		const path = originalUrl.replace(/^\/azure\//, '');
		
		// Create Azure Blob Storage URL format
		let azureUrl = `${this.endpoint}/${this.container}/${this.pathPrefix}${path}`;
		
		// If using SAS token and it's part of the configured auth flow, add it
		// Note: this is redundant with authenticateRequest for SAS tokens,
		// but included here for completeness
		if (this.authType === 'azure-sas' && this.sasToken && 
			!this.sasToken.includes('sig=')) {
			// Only append token here if it doesn't contain a signature
			// (which would mean it's handled in authenticateRequest)
			azureUrl += this.sasToken;
		}
		
		return azureUrl;
	}
	
	/**
	 * Get Azure Blob Storage specific headers
	 * @returns {Object} - Headers to add to the request
	 */
	getRequestHeaders() {
		return {
			'x-ms-version': '2020-04-08',
			'x-ms-blob-type': 'BlockBlob'
		};
	}
	
	/**
	 * Check if the Azure provider supports the requested operation
	 * @param {string} method - HTTP method
	 * @returns {boolean} - Whether operation is supported
	 */
	supportsOperation(method) {
		// Azure Blob Storage supports these methods
		return ['GET', 'HEAD', 'PUT', 'DELETE'].includes(method);
	}
}

export default AzureProvider;