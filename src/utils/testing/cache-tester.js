/**
 * Cache handler tester utility
 * Helps test various cache configurations
 */
import CacheHandler from '../../domains/cache/cache-handler.js';
import { createCacheConfig, createTestConfig } from './config-validator.js';
import { validateCacheHeaders } from './response-validator.js';

/**
 * Test the cache handler with default configuration
 * @returns {Object} - Test results
 */
export function testDefaultCacheConfig() {
	const config = createTestConfig('s3');
	const cacheHandler = new CacheHandler(config);
	
	const results = {
		cacheRules: cacheHandler.cacheRules,
		defaultTtl: cacheHandler.defaultCacheTtl
	};
	
	// Check if default cache rules were loaded
	if (!cacheHandler.cacheRules || cacheHandler.cacheRules.length === 0) {
		results.success = false;
		results.error = 'No cache rules were loaded';
		return results;
	}
	
	// Verify that each rule has a regex pattern and TTL
	const invalidRules = cacheHandler.cacheRules.filter(rule => !rule.regex || !rule.ttl);
	if (invalidRules.length > 0) {
		results.success = false;
		results.error = 'Some cache rules are invalid (missing regex or ttl)';
		results.invalidRules = invalidRules;
		return results;
	}
	
	results.success = true;
	return results;
}

/**
 * Test cache handler with custom configuration
 * @returns {Object} - Test results
 */
export function testCustomCacheConfig() {
	// Define custom cache rules
	const customRules = [
		{ pattern: "\\.jpg$|\\.png$", ttl: 7200 },
		{ pattern: "\\.mp4$", ttl: 86400 }
	];
	
	const config = createCacheConfig(customRules);
	const cacheHandler = new CacheHandler(config);
	
	const results = {
		cacheRules: cacheHandler.cacheRules,
		defaultTtl: cacheHandler.defaultCacheTtl
	};
	
	// Check if custom rules were loaded
	if (!cacheHandler.cacheRules || cacheHandler.cacheRules.length !== customRules.length) {
		results.success = false;
		results.error = `Expected ${customRules.length} cache rules, got ${cacheHandler.cacheRules?.length || 0}`;
		return results;
	}
	
	// Check if custom TTLs were set correctly
	const rulesMatch = cacheHandler.cacheRules.every((rule, index) => {
		return rule.ttl === customRules[index].ttl;
	});
	
	if (!rulesMatch) {
		results.success = false;
		results.error = 'Custom cache rules TTLs do not match';
		return results;
	}
	
	results.success = true;
	return results;
}

/**
 * Test how the cache handler processes responses for different file types
 * @returns {Object} - Test results for different file types
 */
export function testCacheRuleApplication() {
	const config = createTestConfig('s3');
	const cacheHandler = new CacheHandler(config);
	
	const results = {};
	
	// Test file types and verify the TTL is applied correctly
	const fileTypes = [
		{ ext: 'jpg', type: 'image' },
		{ ext: 'mp4', type: 'video' },
		{ ext: 'css', type: 'css' },
		{ ext: 'js', type: 'js' },
		{ ext: 'mp3', type: 'audio' },
		{ ext: 'm3u8', type: 'manifest' },
		{ ext: 'txt', type: 'other' } // Should get default TTL
	];
	
	for (const fileType of fileTypes) {
		// Create a basic response
		const response = new Response('Test content', {
			headers: {
				'Content-Type': 'text/plain'
			}
		});
		
		// Process the response with the cache handler
		const processedResponse = cacheHandler.processResponse(
			response, 
			`/test/file.${fileType.ext}`
		);
		
		// Validate cache headers
		const cacheValidation = validateCacheHeaders(processedResponse);
		
		results[fileType.ext] = {
			fileType: fileType.type,
			cacheControl: cacheValidation.cacheControl,
			hasCacheControl: cacheValidation.hasCacheControl
		};
	}
	
	return results;
}

/**
 * Test if headers are properly removed
 * @returns {Object} - Test results 
 */
export function testHeaderRemoval() {
	// Create a configuration with custom headers to remove
	const config = {
		...createTestConfig('s3'),
		HEADERS_TO_REMOVE: 'custom-header-1,custom-header-2,Set-Cookie'
	};
	
	const cacheHandler = new CacheHandler(config);
	
	// Create a response with headers that should be removed
	const headers = new Headers({
		'Content-Type': 'text/plain',
		'custom-header-1': 'value1',
		'custom-header-2': 'value2',
		'Set-Cookie': 'test=value',
		'Keep-This-Header': 'keep'
	});
	
	const response = new Response('Test content', { headers });
	
	// Process the response
	const processedResponse = cacheHandler.processResponse(response, '/test/file.txt');
	
	// Check if headers were removed
	const removedHeaders = ['custom-header-1', 'custom-header-2', 'Set-Cookie'];
	const keptHeaders = ['Content-Type', 'Keep-This-Header'];
	
	const results = {
		success: true,
		removedHeadersCheck: {},
		keptHeadersCheck: {}
	};
	
	// Check headers that should be removed
	for (const header of removedHeaders) {
		const headerExists = processedResponse.headers.has(header);
		results.removedHeadersCheck[header] = !headerExists;
		
		if (headerExists) {
			results.success = false;
		}
	}
	
	// Check headers that should be kept
	for (const header of keptHeaders) {
		const headerExists = processedResponse.headers.has(header);
		results.keptHeadersCheck[header] = headerExists;
		
		if (!headerExists) {
			results.success = false;
		}
	}
	
	return results;
}