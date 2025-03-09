/**
 * Configuration management for the application
 * Allows for dynamic configuration loading from environment variables
 */

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
	// AWS S3 defaults
	AWS_REGION: 'us-east-1',
	S3_BUCKET: null,
	
	// GCS defaults
	GCS_BUCKET: null,
	
	// Application defaults
	DEFAULT_PROVIDER: 's3',
	DEBUG_MODE: false,
	
	// Cache defaults - can be overridden in wrangler.jsonc
	CACHE_CONFIG: null
};

/**
 * Load configuration from environment variables
 * @param {Object} env - Environment variables
 * @returns {Object} - Merged configuration
 */
export function loadConfig(env) {
	// Start with default config
	const config = { ...DEFAULT_CONFIG };
	
	// Override with environment variables
	for (const key in env) {
		config[key] = env[key];
	}
	
	// Process special configuration types like JSON objects
	if (env.CACHE_CONFIG && typeof env.CACHE_CONFIG === 'string') {
		try {
			config.CACHE_CONFIG = JSON.parse(env.CACHE_CONFIG);
		} catch (error) {
			console.error('Error parsing CACHE_CONFIG:', error);
		}
	}
	
	return config;
}

/**
 * Get configuration value with fallback
 * @param {Object} config - Configuration object
 * @param {string} key - Configuration key
 * @param {*} fallback - Fallback value if key is not found
 * @returns {*} - Configuration value or fallback
 */
export function getConfigValue(config, key, fallback = null) {
	return config[key] !== undefined ? config[key] : fallback;
}

/**
 * Validate required configuration
 * @param {Object} config - Configuration object
 * @param {Array<string>} requiredKeys - Required configuration keys
 * @returns {Object} - Validation result
 */
export function validateConfig(config, requiredKeys) {
	const missing = [];
	
	for (const key of requiredKeys) {
		if (!config[key]) {
			missing.push(key);
		}
	}
	
	return {
		isValid: missing.length === 0,
		missing
	};
}