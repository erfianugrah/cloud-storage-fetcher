import S3Provider from './s3-provider.js';
import GCSProvider from './gcs-provider.js';
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
		
		// Get configured path prefixes for providers
		const s3Prefix = getConfigValue(config, 'S3_URL_PREFIX', '/s3/');
		const gcsPrefix = getConfigValue(config, 'GCS_URL_PREFIX', '/gcs/');
		
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
						if (mapping.provider.toLowerCase() === 'gcs') {
							return new GCSProvider(config);
						} else {
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
		} else {
			// Use default provider if specified in configuration
			const defaultProvider = getConfigValue(config, 'DEFAULT_PROVIDER', 's3').toLowerCase();
			
			if (defaultProvider === 'gcs') {
				return new GCSProvider(config);
			} else {
				return new S3Provider(config);
			}
		}
	}
}

export default ProviderFactory;