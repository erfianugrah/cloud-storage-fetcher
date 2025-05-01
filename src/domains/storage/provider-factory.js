import S3Provider from './s3-provider.js';
import GCSProvider from './gcs-provider.js';
import R2Provider from './r2-provider.js';
import AzureProvider from './azure-provider.js';
import { getConfigValue } from '../../config/config.js';

/**
 * Factory for creating storage providers
 */
class ProviderFactory {
	/**
	 * Create a storage provider based on the URL or default configuration
	 * @param {Request} request - The request
	 * @param {Object} config - Application configuration
	 * @returns {StorageProvider} - The appropriate storage provider
	 */
	static createProvider(request, config) {
		const url = new URL(request.url);
		const path = url.pathname;
		
		// Get configured path prefixes for all providers
		const s3Prefix = getConfigValue(config, 'S3_URL_PREFIX', '/s3/');
		const gcsPrefix = getConfigValue(config, 'GCS_URL_PREFIX', '/gcs/');
		const r2Prefix = getConfigValue(config, 'R2_URL_PREFIX', '/r2/');
		const azurePrefix = getConfigValue(config, 'AZURE_URL_PREFIX', '/azure/');
		
		// Check if custom provider mapping is configured
		const customProviderMappings = getConfigValue(config, 'PROVIDER_MAPPINGS');
		if (customProviderMappings) {
			try {
				// If it's a string, try to parse it as JSON
				const mappings = typeof customProviderMappings === 'string' 
					? JSON.parse(customProviderMappings) 
					: customProviderMappings;
				
				// Check if any mapping regex matches the path
				for (const mapping of mappings) {
					if (new RegExp(mapping.pattern).test(path)) {
						const provider = mapping.provider.toLowerCase();
						
						switch (provider) {
							case 'gcs':
								return new GCSProvider(config);
							case 'r2':
								return new R2Provider(config);
							case 'azure':
								return new AzureProvider(config);
							case 's3':
							default:
								return new S3Provider(config);
						}
					}
				}
			} catch (error) {
				console.error('Error parsing PROVIDER_MAPPINGS:', error);
			}
		}

		// Standard path-based routing
		if (path.startsWith(s3Prefix)) {
			return new S3Provider(config);
		} else if (path.startsWith(gcsPrefix)) {
			return new GCSProvider(config);
		} else if (path.startsWith(r2Prefix)) {
			return new R2Provider(config);
		} else if (path.startsWith(azurePrefix)) {
			return new AzureProvider(config);
		} else {
			// Use default provider if specified in configuration
			const defaultProvider = getConfigValue(config, 'DEFAULT_PROVIDER', 's3').toLowerCase();
			
			switch (defaultProvider) {
				case 'gcs':
					return new GCSProvider(config);
				case 'r2':
					return new R2Provider(config);
				case 'azure':
					return new AzureProvider(config);
				case 's3':
				default:
					return new S3Provider(config);
			}
		}
	}
	
	/**
	 * Get a list of all supported provider types
	 * @returns {string[]} - Array of provider type identifiers
	 */
	static getSupportedProviders() {
		return ['s3', 'gcs', 'r2', 'azure'];
	}
	
	/**
	 * Check if a provider type is supported
	 * @param {string} providerType - The provider type to check
	 * @returns {boolean} - Whether the provider is supported
	 */
	static isProviderSupported(providerType) {
		return ProviderFactory.getSupportedProviders().includes(providerType.toLowerCase());
	}
}

export default ProviderFactory;