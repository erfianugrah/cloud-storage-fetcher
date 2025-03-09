/**
 * Test runner utility
 * Integrates all the testing utilities and provides a way to run comprehensive tests
 */
import { createTestConfig, getAdvancedTestConfig } from './config-validator.js';
import {
	createTestRequest,
	createDebugRequest,
	createHealthCheckRequest,
	createFileRequest,
	createPatternRequest
} from './request-mock.js';
import {
	validateResponse,
	validateCacheHeaders,
	validateDebugHeaders,
	validateHealthCheckResponse,
	validateErrorResponse
} from './response-validator.js';
import {
	testS3Provider,
	testGCSProvider,
	testProviderFactory
} from './provider-tester.js';
import {
	testDefaultCacheConfig,
	testCustomCacheConfig,
	testCacheRuleApplication,
	testHeaderRemoval
} from './cache-tester.js';

/**
 * Run a comprehensive test suite for the application
 * @param {Object} worker - The worker instance to test
 * @returns {Promise<Object>} - Comprehensive test results
 */
export async function runTestSuite(worker) {
	const results = {
		config: {},
		providers: {},
		cache: {},
		requests: {},
		integration: {}
	};
	
	// Test configuration
	results.config.basic = createTestConfig('s3');
	results.config.advanced = getAdvancedTestConfig();
	
	// Test providers
	results.providers.s3 = testS3Provider();
	results.providers.gcs = testGCSProvider();
	results.providers.factory = testProviderFactory();
	
	// Test cache
	results.cache.defaultConfig = testDefaultCacheConfig();
	results.cache.customConfig = testCustomCacheConfig();
	results.cache.ruleApplication = testCacheRuleApplication();
	results.cache.headerRemoval = testHeaderRemoval();
	
	// Test requests (integration tests)
	if (worker) {
		// Create a mock execution context
		const mockCtx = {
			waitUntil: () => Promise.resolve()
		};
		
		// Test basic S3 request
		const s3Request = createFileRequest('jpg', 's3');
		const s3Response = await worker.fetch(s3Request, results.config.basic, mockCtx);
		results.requests.s3 = await validateResponse(s3Response);
		
		// Test basic GCS request
		const gcsConfig = createTestConfig('gcs');
		const gcsRequest = createFileRequest('mp4', 'gcs');
		const gcsResponse = await worker.fetch(gcsRequest, gcsConfig, mockCtx);
		results.requests.gcs = await validateResponse(gcsResponse);
		
		// Test debug request
		const debugRequest = createDebugRequest('debug-test.jpg', 's3');
		const debugResponse = await worker.fetch(debugRequest, results.config.basic, mockCtx);
		results.requests.debug = validateDebugHeaders(debugResponse);
		
		// Test health check
		const healthRequest = createHealthCheckRequest();
		const healthResponse = await worker.fetch(healthRequest, results.config.basic, mockCtx);
		results.requests.health = await validateHealthCheckResponse(healthResponse);
		
		// Test with custom provider mappings
		const mappedConfig = {
			...results.config.basic,
			GCS_ACCESS_KEY_ID: 'test-gcs-key',
			GCS_SECRET_ACCESS_KEY: 'test-gcs-secret',
			GCS_BUCKET: 'test-gcs-bucket',
			PROVIDER_MAPPINGS: JSON.stringify([
				{ pattern: "\\/images\\/.*", provider: "gcs" }
			])
		};
		
		const imageRequest = createPatternRequest('/images/', 'test.jpg');
		const imageResponse = await worker.fetch(imageRequest, mappedConfig, mockCtx);
		results.requests.mappedProvider = await validateResponse(imageResponse);
		
		// Test with all advanced features
		const advancedRequest = createFileRequest('mp4', 's3');
		const advancedResponse = await worker.fetch(advancedRequest, results.config.advanced, mockCtx);
		results.requests.advanced = await validateResponse(advancedResponse);
	}
	
	return results;
}

/**
 * Run a health check test with the worker
 * @param {Object} worker - The worker instance to test
 * @returns {Promise<Object>} - Health check result
 */
export async function checkHealth(worker) {
	if (!worker) {
		return {
			success: false,
			error: 'Worker instance not provided'
		};
	}
	
	try {
		const config = createTestConfig('s3');
		const request = createHealthCheckRequest();
		const ctx = { waitUntil: () => Promise.resolve() };
		
		const response = await worker.fetch(request, config, ctx);
		const result = await validateHealthCheckResponse(response);
		
		return {
			success: result.isValid,
			status: response.status,
			body: result.body,
			error: result.error
		};
	} catch (error) {
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Run a quick test with basic functionality
 * @param {Object} worker - The worker instance to test
 * @returns {Promise<Object>} - Quick test results
 */
export async function quickTest(worker) {
	if (!worker) {
		return {
			success: false,
			error: 'Worker instance not provided'
		};
	}
	
	try {
		const results = {
			s3: null,
			gcs: null,
			health: null,
			debug: null
		};
		
		// Create configs
		const s3Config = createTestConfig('s3');
		const gcsConfig = createTestConfig('gcs');
		const ctx = { waitUntil: () => Promise.resolve() };
		
		// Test S3
		const s3Request = createFileRequest('jpg', 's3');
		const s3Response = await worker.fetch(s3Request, s3Config, ctx);
		results.s3 = {
			status: s3Response.status,
			cacheControl: s3Response.headers.get('Cache-Control')
		};
		
		// Test GCS
		const gcsRequest = createFileRequest('mp4', 'gcs');
		const gcsResponse = await worker.fetch(gcsRequest, gcsConfig, ctx);
		results.gcs = {
			status: gcsResponse.status,
			cacheControl: gcsResponse.headers.get('Cache-Control')
		};
		
		// Test health
		const healthRequest = createHealthCheckRequest();
		const healthResponse = await worker.fetch(healthRequest, s3Config, ctx);
		results.health = {
			status: healthResponse.status,
			isJson: healthResponse.headers.get('Content-Type')?.includes('application/json')
		};
		
		// Test debug
		const debugRequest = createDebugRequest('test.jpg', 's3');
		const debugResponse = await worker.fetch(debugRequest, s3Config, ctx);
		results.debug = {
			hasDebugHeaders: debugResponse.headers.has('X-Debug-Provider')
		};
		
		// Overall test result
		results.success = 
			s3Response.ok && 
			gcsResponse.ok && 
			healthResponse.ok && 
			debugResponse.ok;
		
		return results;
	} catch (error) {
		return {
			success: false,
			error: error.message
		};
	}
}