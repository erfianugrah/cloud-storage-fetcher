/**
 * Storage provider tester utility
 * Helps test different storage provider configurations
 */
import S3Provider from '../../domains/storage/s3-provider.js';
import GCSProvider from '../../domains/storage/gcs-provider.js';
import ProviderFactory from '../../domains/storage/provider-factory.js';
import { createTestConfig } from './config-validator.js';
import { createTestRequest, createPatternRequest } from './request-mock.js';

/**
 * Test S3 provider creation and URL transformation
 * @returns {Object} - Test result
 */
export function testS3Provider() {
	const config = createTestConfig('s3');
	
	try {
		const provider = new S3Provider(config);
		
		// Test bucket name
		const bucketName = provider.getBucketName();
		if (bucketName !== config.S3_BUCKET) {
			return {
				success: false,
				error: `Bucket name mismatch: expected ${config.S3_BUCKET}, got ${bucketName}`
			};
		}
		
		// Test URL transformation
		const testPath = 'test-file.jpg';
		const transformedUrl = provider.transformUrl(`/s3/${testPath}`);
		const expectedUrl = `https://${config.S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${testPath}`;
		
		if (transformedUrl !== expectedUrl) {
			return {
				success: false,
				error: `URL transform mismatch: expected ${expectedUrl}, got ${transformedUrl}`
			};
		}
		
		// Test with custom endpoint if provided
		if (config.S3_ENDPOINT) {
			const customUrlExpected = `${config.S3_ENDPOINT}/${config.S3_BUCKET}/${testPath}`;
			if (transformedUrl !== customUrlExpected) {
				return {
					success: false,
					error: `Custom endpoint URL mismatch: expected ${customUrlExpected}, got ${transformedUrl}`
				};
			}
		}
		
		return {
			success: true,
			provider,
			config
		};
	} catch (error) {
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Test GCS provider creation and URL transformation
 * @returns {Object} - Test result
 */
export function testGCSProvider() {
	const config = createTestConfig('gcs');
	
	try {
		const provider = new GCSProvider(config);
		
		// Test bucket name
		const bucketName = provider.getBucketName();
		if (bucketName !== config.GCS_BUCKET) {
			return {
				success: false,
				error: `Bucket name mismatch: expected ${config.GCS_BUCKET}, got ${bucketName}`
			};
		}
		
		// Test URL transformation
		const testPath = 'test-file.jpg';
		const transformedUrl = provider.transformUrl(`/gcs/${testPath}`);
		const expectedUrl = `https://storage.googleapis.com/${config.GCS_BUCKET}/${testPath}`;
		
		if (transformedUrl !== expectedUrl) {
			return {
				success: false,
				error: `URL transform mismatch: expected ${expectedUrl}, got ${transformedUrl}`
			};
		}
		
		// Test with custom endpoint if provided
		if (config.GCS_ENDPOINT && config.GCS_ENDPOINT !== 'https://storage.googleapis.com') {
			const customUrlExpected = `${config.GCS_ENDPOINT}/${config.GCS_BUCKET}/${testPath}`;
			if (transformedUrl !== customUrlExpected) {
				return {
					success: false,
					error: `Custom endpoint URL mismatch: expected ${customUrlExpected}, got ${transformedUrl}`
				};
			}
		}
		
		return {
			success: true,
			provider,
			config
		};
	} catch (error) {
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Test provider factory for different URL patterns
 * @returns {Object} - Test results for different scenarios
 */
export function testProviderFactory() {
	const results = {};
	
	// Create configuration with both providers
	const config = {
		...createTestConfig('s3'),
		GCS_ACCESS_KEY_ID: 'test-gcs-key',
		GCS_SECRET_ACCESS_KEY: 'test-gcs-secret',
		GCS_BUCKET: 'test-gcs-bucket',
		GCS_URL_PREFIX: '/gcs/',
		S3_URL_PREFIX: '/s3/'
	};
	
	// Test with S3 path
	try {
		const s3Request = createTestRequest('test.jpg', 's3');
		const s3Provider = ProviderFactory.createProvider(s3Request, config);
		results.s3Path = {
			success: s3Provider instanceof S3Provider,
			providerType: s3Provider.constructor.name
		};
	} catch (error) {
		results.s3Path = {
			success: false,
			error: error.message
		};
	}
	
	// Test with GCS path
	try {
		const gcsRequest = createTestRequest('test.jpg', 'gcs');
		const gcsProvider = ProviderFactory.createProvider(gcsRequest, config);
		results.gcsPath = {
			success: gcsProvider instanceof GCSProvider,
			providerType: gcsProvider.constructor.name
		};
	} catch (error) {
		results.gcsPath = {
			success: false,
			error: error.message
		};
	}
	
	// Test with default provider
	try {
		const defaultRequest = new Request('http://example.com/default/test.jpg');
		const defaultProvider = ProviderFactory.createProvider(defaultRequest, config);
		results.defaultProvider = {
			success: defaultProvider instanceof S3Provider, // Default is S3
			providerType: defaultProvider.constructor.name
		};
	} catch (error) {
		results.defaultProvider = {
			success: false,
			error: error.message
		};
	}
	
	// Test with custom provider mapping
	try {
		// Add provider mappings config
		const mappedConfig = {
			...config,
			PROVIDER_MAPPINGS: JSON.stringify([
				{ pattern: "\\/images\\/.*", provider: "gcs" },
				{ pattern: "\\/videos\\/.*", provider: "s3" }
			])
		};
		
		// Test image pattern should map to GCS
		const imageRequest = createPatternRequest('/images/', 'test.jpg');
		const imageProvider = ProviderFactory.createProvider(imageRequest, mappedConfig);
		
		// Test video pattern should map to S3
		const videoRequest = createPatternRequest('/videos/', 'test.mp4');
		const videoProvider = ProviderFactory.createProvider(videoRequest, mappedConfig);
		
		results.customMapping = {
			success: imageProvider instanceof GCSProvider && videoProvider instanceof S3Provider,
			imageProviderType: imageProvider.constructor.name,
			videoProviderType: videoProvider.constructor.name
		};
	} catch (error) {
		results.customMapping = {
			success: false,
			error: error.message
		};
	}
	
	return results;
}