import { describe, it, expect, vi, beforeEach } from 'vitest';
import StorageProvider from '../src/domains/storage/provider.js';
import S3Provider from '../src/domains/storage/s3-provider.js';
import GCSProvider from '../src/domains/storage/gcs-provider.js';
import R2Provider from '../src/domains/storage/r2-provider.js';
import AzureProvider from '../src/domains/storage/azure-provider.js';
import ProviderFactory from '../src/domains/storage/provider-factory.js';

// Mock config data
const mockConfig = {
  // S3 config
  AWS_ACCESS_KEY_ID: 'test-s3-key',
  AWS_SECRET_ACCESS_KEY: 'test-s3-secret',
  AWS_REGION: 'us-east-1',
  S3_BUCKET: 'test-s3-bucket',
  S3_URL_PREFIX: '/s3/',
  
  // GCS config
  GCS_ACCESS_KEY_ID: 'test-gcs-key',
  GCS_SECRET_ACCESS_KEY: 'test-gcs-secret',
  GCS_BUCKET: 'test-gcs-bucket',
  GCS_URL_PREFIX: '/gcs/',
  
  // R2 config
  R2_ACCESS_KEY_ID: 'test-r2-key',
  R2_SECRET_ACCESS_KEY: 'test-r2-secret',
  R2_ACCOUNT_ID: 'test-r2-account',
  R2_BUCKET: 'test-r2-bucket',
  R2_URL_PREFIX: '/r2/',
  
  // Azure config
  AZURE_STORAGE_ACCOUNT_NAME: 'teststorage',
  AZURE_STORAGE_ACCOUNT_KEY: 'test-azure-key',
  AZURE_CONTAINER: 'test-azure-container',
  AZURE_URL_PREFIX: '/azure/',
  
  // Default provider setting
  DEFAULT_PROVIDER: 's3'
};

// Mock global fetch
global.fetch = vi.fn();

describe('Storage Provider Base Class', () => {
  it('should define the required interface', () => {
    const provider = new StorageProvider(mockConfig);
    expect(provider).toHaveProperty('authenticateRequest');
    expect(provider).toHaveProperty('getBucketName');
    expect(provider).toHaveProperty('transformUrl');
    expect(provider).toHaveProperty('getRequestHeaders');
    expect(provider).toHaveProperty('getProviderName');
    expect(provider).toHaveProperty('supportsOperation');
    expect(provider).toHaveProperty('getAuthType');
  });
  
  it('should throw errors for unimplemented methods', async () => {
    const provider = new StorageProvider(mockConfig);
    await expect(provider.authenticateRequest()).rejects.toThrow();
    expect(() => provider.getBucketName()).toThrow();
    expect(() => provider.transformUrl()).toThrow();
    expect(() => provider.getProviderName()).toThrow();
  });
  
  it('should return default values for implemented methods', () => {
    const provider = new StorageProvider(mockConfig);
    expect(provider.getAuthType()).toBe('none');
    expect(provider.getRequestHeaders()).toEqual({});
    expect(provider.supportsOperation('GET')).toBe(true);
    expect(provider.supportsOperation('HEAD')).toBe(true);
    expect(provider.supportsOperation('DELETE')).toBe(false);
  });
});

describe('S3 Provider', () => {
  let s3Provider;
  
  beforeEach(() => {
    s3Provider = new S3Provider(mockConfig);
  });
  
  it('should initialize correctly with AWS credentials', () => {
    expect(s3Provider.aws).toBeDefined();
    expect(s3Provider.bucket).toBe('test-s3-bucket');
    expect(s3Provider.authType).toBe('aws-v4');
  });
  
  it('should transform URLs correctly', () => {
    expect(s3Provider.transformUrl('/s3/image.jpg')).toBe(
      'https://test-s3-bucket.s3.us-east-1.amazonaws.com/image.jpg'
    );
    
    // With custom endpoint
    const configWithEndpoint = { ...mockConfig, S3_ENDPOINT: 'https://custom-s3.example.com' };
    const s3WithEndpoint = new S3Provider(configWithEndpoint);
    expect(s3WithEndpoint.transformUrl('/s3/image.jpg')).toBe(
      'https://custom-s3.example.com/test-s3-bucket/image.jpg'
    );
  });
  
  it('should add required headers for S3', () => {
    const headers = s3Provider.getRequestHeaders();
    expect(headers).toHaveProperty('X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD');
  });
  
  it('should authenticate requests with AWS SignV4', async () => {
    const request = new Request('https://test-s3-bucket.s3.us-east-1.amazonaws.com/image.jpg');
    // Mock the sign method
    s3Provider.aws.sign = vi.fn().mockResolvedValue('signed-request');
    
    const signedRequest = await s3Provider.authenticateRequest(request);
    expect(s3Provider.aws.sign).toHaveBeenCalledWith(request);
    expect(signedRequest).toBe('signed-request');
  });
  
  it('should support standard S3 operations', () => {
    expect(s3Provider.supportsOperation('GET')).toBe(true);
    expect(s3Provider.supportsOperation('HEAD')).toBe(true);
    expect(s3Provider.supportsOperation('PUT')).toBe(true);
    expect(s3Provider.supportsOperation('POST')).toBe(true);
    expect(s3Provider.supportsOperation('DELETE')).toBe(true);
  });
});

describe('GCS Provider', () => {
  let gcsProvider;
  
  beforeEach(() => {
    gcsProvider = new GCSProvider(mockConfig);
  });
  
  it('should initialize correctly with GCS credentials', () => {
    expect(gcsProvider.aws).toBeDefined();
    expect(gcsProvider.bucket).toBe('test-gcs-bucket');
    expect(gcsProvider.authType).toBe('aws-v4');
    expect(gcsProvider.endpoint).toBe('https://storage.googleapis.com');
  });
  
  it('should transform URLs correctly', () => {
    expect(gcsProvider.transformUrl('/gcs/image.jpg')).toBe(
      'https://storage.googleapis.com/test-gcs-bucket/image.jpg'
    );
  });
  
  it('should add required headers for GCS', () => {
    const headers = gcsProvider.getRequestHeaders();
    expect(headers).toHaveProperty('X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD');
    expect(headers).toHaveProperty('x-goog-api-version', '2');
  });
  
  it('should authenticate requests with AWS SignV4 for GCS', async () => {
    const request = new Request('https://storage.googleapis.com/test-gcs-bucket/image.jpg');
    // Mock the sign method
    gcsProvider.aws.sign = vi.fn().mockResolvedValue('signed-request');
    
    const signedRequest = await gcsProvider.authenticateRequest(request);
    expect(gcsProvider.aws.sign).toHaveBeenCalledWith(request);
    expect(signedRequest).toBe('signed-request');
  });
  
  it('should ensure host header for non-googleapis URLs', async () => {
    const request = new Request('https://localhost/test-gcs-bucket/image.jpg');
    // Create spy on Request constructor
    const requestSpy = vi.spyOn(global, 'Request');
    // Mock sign
    gcsProvider.aws.sign = vi.fn().mockImplementation(req => req);
    
    await gcsProvider.authenticateRequest(request);
    
    expect(requestSpy).toHaveBeenCalled();
    const modifiedRequest = requestSpy.mock.results[0].value;
    expect(modifiedRequest.headers.get('Host')).toBe('storage.googleapis.com');
  });
});

describe('R2 Provider', () => {
  let r2Provider;
  
  beforeEach(() => {
    r2Provider = new R2Provider(mockConfig);
  });
  
  it('should initialize correctly with R2 credentials', () => {
    expect(r2Provider.aws).toBeDefined();
    expect(r2Provider.bucket).toBe('test-r2-bucket');
    expect(r2Provider.authType).toBe('aws-v4');
    expect(r2Provider.endpoint).toContain('r2.cloudflarestorage.com');
  });
  
  it('should transform URLs correctly', () => {
    expect(r2Provider.transformUrl('/r2/image.jpg')).toContain('/test-r2-bucket/image.jpg');
  });
  
  it('should handle worker binding if configured', () => {
    const configWithBinding = { 
      ...mockConfig, 
      R2_USE_WORKER_BINDING: true,
      R2_WORKER_BINDING_NAME: 'MY_BUCKET'
    };
    const r2WithBinding = new R2Provider(configWithBinding);
    
    expect(r2WithBinding.transformUrl('/r2/image.jpg')).toBe(
      'r2://MY_BUCKET/image.jpg'
    );
  });
  
  it('should bypass authentication for worker binding', async () => {
    const configWithBinding = { 
      ...mockConfig, 
      R2_USE_WORKER_BINDING: true 
    };
    const r2WithBinding = new R2Provider(configWithBinding);
    
    const request = new Request('r2://MY_BUCKET/image.jpg');
    const authenticatedRequest = await r2WithBinding.authenticateRequest(request);
    
    // Should return the request unchanged
    expect(authenticatedRequest).toBe(request);
  });
  
  it('should authenticate requests with AWS SignV4 for public buckets', async () => {
    const request = new Request('https://test-r2-account.r2.cloudflarestorage.com/test-r2-bucket/image.jpg');
    // Mock the sign method
    r2Provider.aws.sign = vi.fn().mockResolvedValue('signed-request');
    
    const signedRequest = await r2Provider.authenticateRequest(request);
    expect(r2Provider.aws.sign).toHaveBeenCalledWith(request);
    expect(signedRequest).toBe('signed-request');
  });
});

describe('Azure Provider', () => {
  describe('With Shared Key Authentication', () => {
    let azureProvider;
    
    beforeEach(() => {
      azureProvider = new AzureProvider(mockConfig);
    });
    
    it('should initialize correctly with Shared Key credentials', () => {
      expect(azureProvider.accountName).toBe('teststorage');
      expect(azureProvider.accountKey).toBe('test-azure-key');
      expect(azureProvider.container).toBe('test-azure-container');
      expect(azureProvider.authType).toBe('azure-sharedkey');
    });
    
    it('should transform URLs correctly', () => {
      expect(azureProvider.transformUrl('/azure/image.jpg')).toBe(
        'https://teststorage.blob.core.windows.net/test-azure-container/image.jpg'
      );
    });
    
    it('should support Azure-specific headers', () => {
      const headers = azureProvider.getRequestHeaders();
      expect(headers).toHaveProperty('x-ms-version', '2020-04-08');
      expect(headers).toHaveProperty('x-ms-blob-type', 'BlockBlob');
    });
  });
  
  describe('With SAS Token Authentication', () => {
    let azureProviderSas;
    
    beforeEach(() => {
      const configWithSas = { 
        ...mockConfig, 
        AZURE_STORAGE_ACCOUNT_KEY: undefined,
        AZURE_SAS_TOKEN: 'sv=2020-08-04&ss=bf&srt=sco&sp=rwdlacitfx&se=2023-10-05T15:12:35Z&sig=abcdefg'
      };
      azureProviderSas = new AzureProvider(configWithSas);
    });
    
    it('should initialize correctly with SAS token', () => {
      expect(azureProviderSas.authType).toBe('azure-sas');
      expect(azureProviderSas.sasToken).toContain('sv=2020-08-04');
    });
    
    it('should authenticate requests by appending SAS token', async () => {
      const request = new Request('https://teststorage.blob.core.windows.net/test-azure-container/image.jpg');
      const authenticatedRequest = await azureProviderSas.authenticateRequest(request);
      
      // Should be a new request with SAS token in URL
      expect(authenticatedRequest).not.toBe(request);
      expect(authenticatedRequest.url).toContain('sv=2020-08-04');
      expect(authenticatedRequest.url).toContain('sig=abcdefg');
    });
    
    it('should handle SAS tokens with or without leading ?', async () => {
      // Test with token already having ?
      const configWithLeadingQ = { 
        ...mockConfig, 
        AZURE_STORAGE_ACCOUNT_KEY: undefined,
        AZURE_SAS_TOKEN: '?sv=2020-08-04&sig=abcdefg'
      };
      const providerWithLeadingQ = new AzureProvider(configWithLeadingQ);
      
      const request = new Request('https://teststorage.blob.core.windows.net/test-azure-container/image.jpg');
      const authenticatedRequest = await providerWithLeadingQ.authenticateRequest(request);
      
      // Should handle the token correctly
      expect(authenticatedRequest.url).toContain('?sv=2020-08-04');
      expect(authenticatedRequest.url.indexOf('??')).toBe(-1); // Should not have double ??
    });
  });
});

describe('Provider Factory', () => {
  it('should create S3 provider for S3 paths', () => {
    const request = new Request('https://example.com/s3/image.jpg');
    const provider = ProviderFactory.createProvider(request, mockConfig);
    
    expect(provider).toBeInstanceOf(S3Provider);
    expect(provider.getProviderName()).toBe('s3');
  });
  
  it('should create GCS provider for GCS paths', () => {
    const request = new Request('https://example.com/gcs/image.jpg');
    const provider = ProviderFactory.createProvider(request, mockConfig);
    
    expect(provider).toBeInstanceOf(GCSProvider);
    expect(provider.getProviderName()).toBe('gcs');
  });
  
  it('should create R2 provider for R2 paths', () => {
    const request = new Request('https://example.com/r2/image.jpg');
    const provider = ProviderFactory.createProvider(request, mockConfig);
    
    expect(provider).toBeInstanceOf(R2Provider);
    expect(provider.getProviderName()).toBe('r2');
  });
  
  it('should create Azure provider for Azure paths', () => {
    const request = new Request('https://example.com/azure/image.jpg');
    const provider = ProviderFactory.createProvider(request, mockConfig);
    
    expect(provider).toBeInstanceOf(AzureProvider);
    expect(provider.getProviderName()).toBe('azure');
  });
  
  it('should use custom provider mappings if configured', () => {
    const configWithMappings = {
      ...mockConfig,
      PROVIDER_MAPPINGS: JSON.stringify([
        { pattern: "\\/images\\/.*", provider: "gcs" },
        { pattern: "\\/videos\\/.*", provider: "s3" },
        { pattern: "\\/assets\\/.*", provider: "r2" },
        { pattern: "\\/docs\\/.*", provider: "azure" }
      ])
    };
    
    // Test each mapping
    const imagesRequest = new Request('https://example.com/images/photo.jpg');
    const videosRequest = new Request('https://example.com/videos/movie.mp4');
    const assetsRequest = new Request('https://example.com/assets/file.zip');
    const docsRequest = new Request('https://example.com/docs/manual.pdf');
    
    const imagesProvider = ProviderFactory.createProvider(imagesRequest, configWithMappings);
    const videosProvider = ProviderFactory.createProvider(videosRequest, configWithMappings);
    const assetsProvider = ProviderFactory.createProvider(assetsRequest, configWithMappings);
    const docsProvider = ProviderFactory.createProvider(docsRequest, configWithMappings);
    
    expect(imagesProvider).toBeInstanceOf(GCSProvider);
    expect(videosProvider).toBeInstanceOf(S3Provider);
    expect(assetsProvider).toBeInstanceOf(R2Provider);
    expect(docsProvider).toBeInstanceOf(AzureProvider);
  });
  
  it('should use default provider if no match is found', () => {
    const request = new Request('https://example.com/unknown/path.jpg');
    const provider = ProviderFactory.createProvider(request, mockConfig);
    
    // Default is s3 in mockConfig
    expect(provider).toBeInstanceOf(S3Provider);
    
    // Test with different default
    const configWithGcsDefault = {
      ...mockConfig,
      DEFAULT_PROVIDER: 'gcs'
    };
    const providerWithGcsDefault = ProviderFactory.createProvider(
      request, 
      configWithGcsDefault
    );
    expect(providerWithGcsDefault).toBeInstanceOf(GCSProvider);
  });
  
  it('should list all supported providers', () => {
    const providers = ProviderFactory.getSupportedProviders();
    expect(providers).toContain('s3');
    expect(providers).toContain('gcs');
    expect(providers).toContain('r2');
    expect(providers).toContain('azure');
  });
  
  it('should check if a provider is supported', () => {
    expect(ProviderFactory.isProviderSupported('s3')).toBe(true);
    expect(ProviderFactory.isProviderSupported('gcs')).toBe(true);
    expect(ProviderFactory.isProviderSupported('r2')).toBe(true);
    expect(ProviderFactory.isProviderSupported('azure')).toBe(true);
    expect(ProviderFactory.isProviderSupported('unknown')).toBe(false);
  });
});