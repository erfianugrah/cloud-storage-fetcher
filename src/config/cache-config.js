/**
 * Cache configuration for different asset types
 */

/**
 * Default cache configuration
 * Can be overridden by setting CACHE_CONFIG in wrangler.jsonc
 */
export const DEFAULT_CACHE_CONFIG = [
	{ pattern: "\\.mp4$|\\.mov$|\\.avi$|\\.wmv$", ttl: 60 * 60 * 24 * 365 }, // Video files: 1 year
	{ pattern: "\\.jpg$|\\.jpeg$|\\.png$|\\.gif$|\\.webp$|\\.svg$", ttl: 60 * 60 }, // Images: 1 hour
	{ pattern: "\\.css$|\\.js$", ttl: 60 * 60 }, // CSS/JS: 1 hour
	{ pattern: "\\.mp3$|\\.wav$|\\.ogg$", ttl: 60 * 60 * 24 * 365 }, // Audio: 1 year
	{ pattern: "\\.m3u8$|\\.mpd$", ttl: 3 }, // Manifests: 3 seconds
];

/**
 * Get the cache configuration from environment or use defaults
 * @param {Object} config - Application configuration
 * @returns {Array} - Cache configuration
 */
export function getCacheConfig(config) {
	// If user has provided custom cache config, use it
	if (config.CACHE_CONFIG) {
		// Handle string format (from environment variables)
		if (typeof config.CACHE_CONFIG === 'string') {
			try {
				const parsedConfig = JSON.parse(config.CACHE_CONFIG);
				return parsedConfig.map(item => ({
					...item,
					regex: new RegExp(item.pattern, 'i')
				}));
			} catch (error) {
				console.error('Error parsing CACHE_CONFIG:', error);
				// Fall back to default config
				return DEFAULT_CACHE_CONFIG.map(item => ({
					...item,
					regex: new RegExp(item.pattern, 'i')
				}));
			}
		} 
		// Handle array format (already parsed)
		else if (Array.isArray(config.CACHE_CONFIG)) {
			return config.CACHE_CONFIG.map(item => ({
				...item,
				regex: new RegExp(item.pattern, 'i')
			}));
		}
	}

	// Otherwise use the default config
	return DEFAULT_CACHE_CONFIG.map(item => ({
		...item,
		regex: new RegExp(item.pattern, 'i')
	}));
}