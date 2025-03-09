import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src';
import S3Provider from '../src/domains/storage/s3-provider';
import GCSProvider from '../src/domains/storage/gcs-provider';
import ProviderFactory from '../src/domains/storage/provider-factory';
import { loadConfig } from '../src/config/config';

// Mock fetch
global.fetch = vi.fn();

describe('Signed Storage Worker', () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
		
		// Mock the aws4fetch library
		vi.mock('aws4fetch', () => {
			return {
				AwsClient: vi.fn().mockImplementation(() => {
					return {
						sign: vi.fn().mockImplementation((request) => Promise.resolve(request))
					};
				})
			};
		});
		
		// Mock fetch response
		global.fetch.mockResolvedValue(
			new Response('Test response', {
				status: 200,
				headers: {
					'Content-Type': 'text/plain'
				}
			})
		);
		
		// Mock clearTimeout and setTimeout
		global.clearTimeout = vi.fn();
		global.setTimeout = vi.fn().mockReturnValue(123);
	});
	
	it('handles S3 path-based routing', async () => {
		// Mock the environment
		const mockEnv = {
			AWS_ACCESS_KEY_ID: 'test-key',
			AWS_SECRET_ACCESS_KEY: 'test-secret',
			AWS_REGION: 'us-east-1',
			S3_BUCKET: 'test-s3-bucket',
			S3_URL_PREFIX: '/s3/',
			VERSION: '1.0.0-test'
		};
		
		const request = new Request('http://example.com/s3/test-file.jpg');
		const ctx = createExecutionContext();
		
		// Call the worker
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		
		// Verify response
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Test response');
		expect(response.headers.has('Cache-Control')).toBe(true);
		
		// Verify fetch was called with the correct URL
		expect(global.fetch).toHaveBeenCalled();
		const fetchCall = global.fetch.mock.calls[0][0];
		expect(fetchCall.url).toContain('test-s3-bucket');
	});
	
	it('handles GCS path-based routing', async () => {
		// Mock the environment
		const mockEnv = {
			GCS_ACCESS_KEY_ID: 'test-key',
			GCS_SECRET_ACCESS_KEY: 'test-secret',
			GCS_BUCKET: 'test-gcs-bucket',
			GCS_URL_PREFIX: '/gcs/',
			VERSION: '1.0.0-test'
		};
		
		const request = new Request('http://example.com/gcs/test-file.jpg');
		const ctx = createExecutionContext();
		
		// Call the worker
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		
		// Verify response
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Test response');
		expect(response.headers.has('Cache-Control')).toBe(true);
		
		// Verify fetch was called with the correct URL
		expect(global.fetch).toHaveBeenCalled();
		const fetchCall = global.fetch.mock.calls[0][0];
		expect(fetchCall.url).toContain('storage.googleapis.com');
		expect(fetchCall.url).toContain('test-gcs-bucket');
	});
	
	it('adds debug headers when debug mode is enabled via header', async () => {
		// Mock the environment
		const mockEnv = {
			AWS_ACCESS_KEY_ID: 'test-key',
			AWS_SECRET_ACCESS_KEY: 'test-secret',
			AWS_REGION: 'us-east-1',
			S3_BUCKET: 'test-s3-bucket',
			S3_URL_PREFIX: '/s3/',
			VERSION: '1.0.0-test'
		};
		
		// Create a request with debug header
		const request = new Request('http://example.com/s3/test-file.jpg', {
			headers: {
				'debug': 'test'
			}
		});
		
		const ctx = createExecutionContext();
		
		// Call the worker
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		
		// Verify debug headers
		expect(response.headers.has('X-Debug-Provider')).toBe(true);
		expect(response.headers.has('X-Debug-Bucket')).toBe(true);
		expect(response.headers.has('X-Debug-Original-URL')).toBe(true);
		expect(response.headers.has('X-Debug-Storage-URL')).toBe(true);
		expect(response.headers.has('X-Debug-Cache-Config')).toBe(true);
	});
	
	it('adds debug headers when debug mode is enabled via config', async () => {
		// Mock the environment with debug mode enabled
		const mockEnv = {
			AWS_ACCESS_KEY_ID: 'test-key',
			AWS_SECRET_ACCESS_KEY: 'test-secret',
			AWS_REGION: 'us-east-1',
			S3_BUCKET: 'test-s3-bucket',
			S3_URL_PREFIX: '/s3/',
			DEBUG_MODE: true,
			VERSION: '1.0.0-test'
		};
		
		// Create a request without debug header
		const request = new Request('http://example.com/s3/test-file.jpg');
		
		const ctx = createExecutionContext();
		
		// Call the worker
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		
		// Verify debug headers
		expect(response.headers.has('X-Debug-Provider')).toBe(true);
		expect(response.headers.has('X-Debug-Bucket')).toBe(true);
		expect(response.headers.has('X-Debug-Original-URL')).toBe(true);
		expect(response.headers.has('X-Debug-Storage-URL')).toBe(true);
		expect(response.headers.has('X-Debug-Cache-Config')).toBe(true);
	});
	
	it('handles health check requests', async () => {
		// Mock the environment
		const mockEnv = {
			AWS_ACCESS_KEY_ID: 'test-key',
			AWS_SECRET_ACCESS_KEY: 'test-secret',
			AWS_REGION: 'us-east-1',
			S3_BUCKET: 'test-s3-bucket',
			HEALTH_CHECK_PATH: '/__health',
			VERSION: '1.0.0-test'
		};
		
		// Create a health check request
		const request = new Request('http://example.com/__health');
		
		const ctx = createExecutionContext();
		
		// Call the worker
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		
		// Verify health check response
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/json');
		
		const responseBody = await response.json();
		expect(responseBody.status).toBe('healthy');
		expect(responseBody.version).toBe('1.0.0-test');
		expect(responseBody.timestamp).toBeDefined();
		
		// Verify fetch was not called
		expect(global.fetch).not.toHaveBeenCalled();
	});
	
	it('uses custom configuration for cache rules', async () => {
		// Mock the environment with custom cache configuration
		const mockEnv = {
			AWS_ACCESS_KEY_ID: 'test-key',
			AWS_SECRET_ACCESS_KEY: 'test-secret',
			AWS_REGION: 'us-east-1',
			S3_BUCKET: 'test-s3-bucket',
			S3_URL_PREFIX: '/s3/',
			VERSION: '1.0.0-test',
			DEBUG_MODE: true,
			// Custom cache config with different TTL for images
			CACHE_CONFIG: JSON.stringify([
				{ pattern: "\\.jpg$|\\.jpeg$|\\.png$", ttl: 7200 } // 2 hours
			])
		};
		
		// Create a request for an image
		const request = new Request('http://example.com/s3/test-file.jpg');
		
		const ctx = createExecutionContext();
		
		// Call the worker
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		
		// Verify cache TTL was applied correctly (2 hours = 7200 seconds)
		expect(response.headers.get('Cache-Control')).toBe('public, max-age=7200');
	});
	
	it('handles custom provider mappings', async () => {
		// Mock the environment with custom provider mapping
		const mockEnv = {
			AWS_ACCESS_KEY_ID: 'test-key',
			AWS_SECRET_ACCESS_KEY: 'test-secret',
			AWS_REGION: 'us-east-1',
			S3_BUCKET: 'test-s3-bucket',
			GCS_ACCESS_KEY_ID: 'test-gcs-key',
			GCS_SECRET_ACCESS_KEY: 'test-gcs-secret',
			GCS_BUCKET: 'test-gcs-bucket',
			VERSION: '1.0.0-test',
			// Map /images/ path to GCS
			PROVIDER_MAPPINGS: JSON.stringify([
				{ pattern: "\\/images\\/.*", provider: "gcs" }
			])
		};
		
		// Create a request that matches the custom mapping
		const request = new Request('http://example.com/images/test-file.jpg');
		
		const ctx = createExecutionContext();
		
		// Call the worker
		const response = await worker.fetch(request, mockEnv, ctx);
		await waitOnExecutionContext(ctx);
		
		// Verify fetch was called with GCS URL
		expect(global.fetch).toHaveBeenCalled();
		const fetchCall = global.fetch.mock.calls[0][0];
		expect(fetchCall.url).toContain('storage.googleapis.com');
		expect(fetchCall.url).toContain('test-gcs-bucket');
	});
});
