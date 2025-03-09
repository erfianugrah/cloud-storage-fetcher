#!/usr/bin/env node
/**
 * CLI script for running tests
 * 
 * Usage:
 *   node cli.js --quick     Run a quick test
 *   node cli.js --health    Run a health check
 *   node cli.js --full      Run a full test suite
 *   node cli.js --help      Show help
 */

import { quickTest, checkHealth, runTestSuite, getUsageInfo, PACKAGE_INFO } from './index.js';
import worker from '../../index.js';

/**
 * Parse command line arguments
 * @returns {Object} - Parsed arguments
 */
function parseArgs() {
	const args = process.argv.slice(2);
	const options = {
		quick: false,
		health: false,
		full: false,
		help: false,
		verbose: false
	};
	
	for (const arg of args) {
		if (arg === '--quick') {
			options.quick = true;
		} else if (arg === '--health') {
			options.health = true;
		} else if (arg === '--full') {
			options.full = true;
		} else if (arg === '--help' || arg === '-h') {
			options.help = true;
		} else if (arg === '--verbose' || arg === '-v') {
			options.verbose = true;
		}
	}
	
	// If no specific test is specified, run quick by default
	if (!options.quick && !options.health && !options.full && !options.help) {
		options.quick = true;
	}
	
	return options;
}

/**
 * Show help information
 */
function showHelp() {
	console.log(`
${PACKAGE_INFO.name} v${PACKAGE_INFO.version}
${PACKAGE_INFO.description}

Usage:
  node cli.js [options]

Options:
  --quick    Run a quick test (default)
  --health   Run a health check
  --full     Run a full test suite
  --verbose  Show detailed results
  --help     Show this help information

Examples:
  node cli.js --quick    # Run a quick test
  node cli.js --health   # Run a health check
  node cli.js --full -v  # Run a full test suite with verbose output
`);
}

/**
 * Main function
 */
async function main() {
	const options = parseArgs();
	
	if (options.help) {
		showHelp();
		return;
	}
	
	console.log(`${PACKAGE_INFO.name} v${PACKAGE_INFO.version}`);
	console.log('Running tests...\n');
	
	if (options.health) {
		console.log('Running health check...');
		const result = await checkHealth(worker);
		
		if (result.success) {
			console.log('✅ Health check passed');
			if (options.verbose) {
				console.log('Health check details:', result);
			}
		} else {
			console.error('❌ Health check failed:', result.error);
			if (options.verbose) {
				console.error('Health check details:', result);
			}
			process.exit(1);
		}
	}
	
	if (options.quick) {
		console.log('Running quick test...');
		const result = await quickTest(worker);
		
		if (result.success) {
			console.log('✅ Quick test passed');
			if (options.verbose) {
				console.log('Quick test details:', result);
			}
		} else {
			console.error('❌ Quick test failed:', result.error);
			if (options.verbose) {
				console.error('Quick test details:', result);
			}
			process.exit(1);
		}
	}
	
	if (options.full) {
		console.log('Running full test suite...');
		const results = await runTestSuite(worker);
		
		// Check if all tests passed
		const allProvidersPassed = Object.values(results.providers).every(
			r => r.success !== false
		);
		
		const allCachePassed = Object.values(results.cache).every(
			r => r.success !== false
		);
		
		const allRequestsPassed = Object.values(results.requests).every(
			r => r.isValid !== false
		);
		
		if (allProvidersPassed && allCachePassed && allRequestsPassed) {
			console.log('✅ All tests passed');
			
			if (options.verbose) {
				console.log('Test suite results:', JSON.stringify(results, null, 2));
			} else {
				// Print a summary
				console.log('Summary:');
				console.log(`- Provider tests: ${allProvidersPassed ? '✅' : '❌'}`);
				console.log(`- Cache tests: ${allCachePassed ? '✅' : '❌'}`);
				console.log(`- Request tests: ${allRequestsPassed ? '✅' : '❌'}`);
			}
		} else {
			console.error('❌ Some tests failed');
			
			if (!allProvidersPassed) {
				console.error('Provider tests failed:');
				Object.entries(results.providers).forEach(([name, result]) => {
					if (result.success === false) {
						console.error(`- ${name}: ${result.error}`);
					}
				});
			}
			
			if (!allCachePassed) {
				console.error('Cache tests failed:');
				Object.entries(results.cache).forEach(([name, result]) => {
					if (result.success === false) {
						console.error(`- ${name}: ${result.error}`);
					}
				});
			}
			
			if (!allRequestsPassed) {
				console.error('Request tests failed:');
				Object.entries(results.requests).forEach(([name, result]) => {
					if (result.isValid === false) {
						console.error(`- ${name}: ${result.error || 'Unknown error'}`);
					}
				});
			}
			
			if (options.verbose) {
				console.error('Full test results:', JSON.stringify(results, null, 2));
			}
			
			process.exit(1);
		}
	}
}

// Run the main function
main().catch(error => {
	console.error('Error running tests:', error);
	process.exit(1);
});