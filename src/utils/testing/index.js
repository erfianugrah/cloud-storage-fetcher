/**
 * Testing utilities for the Signed Storage Worker
 * This module exports all testing utilities for easy access
 */

// Export test runner
export * from './test-runner.js';

// Export configuration utilities
export * from './config-validator.js';

// Export request mock utilities
export * from './request-mock.js';

// Export response validation utilities
export * from './response-validator.js';

// Export provider test utilities
export * from './provider-tester.js';

// Export cache test utilities
export * from './cache-tester.js';

/**
 * Version information for the testing package
 */
export const VERSION = '1.0.0';

/**
 * Information about the testing package
 */
export const PACKAGE_INFO = {
	name: 'Signed Storage Worker Testing Utilities',
	version: VERSION,
	description: 'Comprehensive testing utilities for the Signed Storage Worker',
	capabilities: [
		'Configuration validation',
		'Request mocking',
		'Response validation',
		'Storage provider testing',
		'Cache handler testing',
		'Integration testing'
	]
};

/**
 * Usage information for the testing package
 * @returns {string} - Usage information
 */
export function getUsageInfo() {
	return `
# Signed Storage Worker Testing Utilities v${VERSION}

This package provides utilities for testing the Signed Storage Worker. 

## Quick Start

To run a quick test of basic functionality:

\`\`\`javascript
import { quickTest } from './utils/testing';
import worker from './index.js';

async function main() {
	const results = await quickTest(worker);
	console.log('Quick test results:', results);
}

main().catch(console.error);
\`\`\`

## Comprehensive Testing

For more comprehensive testing:

\`\`\`javascript
import { runTestSuite } from './utils/testing';
import worker from './index.js';

async function main() {
	const results = await runTestSuite(worker);
	console.log('Test suite results:', JSON.stringify(results, null, 2));
}

main().catch(console.error);
\`\`\`

## Available Utilities

- Configuration validation: createTestConfig, getAdvancedTestConfig
- Request mocking: createTestRequest, createDebugRequest
- Response validation: validateResponse, validateCacheHeaders
- Storage provider testing: testS3Provider, testGCSProvider
- Cache handler testing: testDefaultCacheConfig, testCustomCacheConfig
- Integration testing: runTestSuite, quickTest, checkHealth
`;
}