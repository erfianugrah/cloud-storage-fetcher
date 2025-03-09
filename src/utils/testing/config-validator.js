/**
 * Configuration validator utility
 * Helps validate and test various configuration scenarios
 */
import { loadConfig, validateConfig } from '../../config/config.js';

/**
 * Test if a configuration is valid for S3 access
 * @param {Object} config - The configuration to validate
 * @returns {Object} - Validation result with isValid flag and any missing required keys
 */
export function validateS3Config(config) {
	const requiredKeys = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET'];
	return validateConfig(config, requiredKeys);
}

/**
 * Test if a configuration is valid for GCS access
 * @param {Object} config - The configuration to validate
 * @returns {Object} - Validation result with isValid flag and any missing required keys
 */
export function validateGCSConfig(config) {
	const requiredKeys = ['GCS_ACCESS_KEY_ID', 'GCS_SECRET_ACCESS_KEY', 'GCS_BUCKET'];
	return validateConfig(config, requiredKeys);
}

/**
 * Create a test configuration with the necessary keys for the specified provider
 * @param {string} provider - The provider to create config for ('s3' or 'gcs')
 * @returns {Object} - A test configuration
 */
export function createTestConfig(provider = 's3') {
	const baseConfig = {
		VERSION: '1.0.0-test',
		DEBUG_MODE: true,
		FETCH_TIMEOUT: 5000,
		HEALTH_CHECK_PATH: '/__health'
	};
	
	if (provider === 'gcs') {
		return {
			...baseConfig,
			GCS_ACCESS_KEY_ID: 'test-key',
			GCS_SECRET_ACCESS_KEY: 'test-secret',
			GCS_BUCKET: 'test-gcs-bucket',
			GCS_URL_PREFIX: '/gcs/'
		};
	} else {
		return {
			...baseConfig,
			AWS_ACCESS_KEY_ID: 'test-key',
			AWS_SECRET_ACCESS_KEY: 'test-secret',
			AWS_REGION: 'us-east-1',
			S3_BUCKET: 'test-s3-bucket',
			S3_URL_PREFIX: '/s3/'
		};
	}
}

/**
 * Generate a test configuration with a mapping between URL patterns and providers
 * @param {Array} mappings - Array of mapping objects with pattern and provider
 * @returns {Object} - Configuration with mappings
 */
export function createMappedConfig(mappings) {
	// Create a full config with both S3 and GCS credentials
	const config = {
		...createTestConfig('s3'),
		GCS_ACCESS_KEY_ID: 'test-gcs-key',
		GCS_SECRET_ACCESS_KEY: 'test-gcs-secret',
		GCS_BUCKET: 'test-gcs-bucket',
		GCS_URL_PREFIX: '/gcs/'
	};
	
	// Add the provider mappings
	config.PROVIDER_MAPPINGS = JSON.stringify(mappings);
	
	return config;
}

/**
 * Create a custom cache configuration
 * @param {Array} cacheRules - Array of cache rule objects with pattern and ttl
 * @returns {Object} - Configuration with custom cache rules
 */
export function createCacheConfig(cacheRules) {
	const config = createTestConfig('s3');
	config.CACHE_CONFIG = JSON.stringify(cacheRules);
	return config;
}

/**
 * Get an example configuration with various advanced features enabled
 * @returns {Object} - Advanced test configuration
 */
export function getAdvancedTestConfig() {
	return {
		...createTestConfig('s3'),
		GCS_ACCESS_KEY_ID: 'test-gcs-key',
		GCS_SECRET_ACCESS_KEY: 'test-gcs-secret',
		GCS_BUCKET: 'test-gcs-bucket',
		ENABLE_BACKGROUND_PROCESSING: true,
		ENABLE_LOGGING: true,
		ERROR_FORMAT: 'json',
		HEADERS_TO_REMOVE: 'Set-Cookie,x-goog-generation,x-goog-metageneration',
		PROVIDER_MAPPINGS: JSON.stringify([
			{ pattern: "\\/images\\/.*", provider: "gcs" },
			{ pattern: "\\/videos\\/.*", provider: "s3" }
		]),
		CACHE_CONFIG: JSON.stringify([
			{ pattern: "\\.mp4$|\\.mov$", ttl: 31536000 },
			{ pattern: "\\.jpg$|\\.jpeg$|\\.png$", ttl: 7200 }
		]),
		S3_ENDPOINT: 'https://custom-s3-endpoint.example.com',
		S3_PATH_PREFIX: 'custom-prefix',
		DEFAULT_CACHE_TTL: 120
	};
}