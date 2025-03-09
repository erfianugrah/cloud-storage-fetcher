# Signed Storage Worker

A Cloudflare Worker for serving signed content from AWS S3 and Google Cloud Storage (GCS) with intelligent caching.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Usage](#usage)
  - [URL Patterns](#url-patterns)
  - [HMAC Authentication](#hmac-authentication)
  - [Caching](#caching)
- [Advanced Configuration](#advanced-configuration)
  - [Custom Cache Rules](#custom-cache-rules)
  - [Custom Provider Mapping](#custom-provider-mapping)
  - [Custom Endpoints](#custom-endpoints)
- [Development](#development)
  - [Testing](#testing)
  - [Deployment](#deployment)
- [Architecture](#architecture)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Features

- **Unified Authentication** - Uses HMAC signing for both S3 and GCS through the `aws4fetch` library
- **Smart Caching** - Configurable caching rules based on asset types
- **Provider Abstraction** - Common interface for multiple storage providers
- **Path-Based Routing** - Route requests to different storage providers based on URL paths
- **Cloudflare Workers Platform** - Global distribution with low latency
- **Debug Mode** - Optional debugging information for troubleshooting

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare Workers account
- AWS S3 or GCS credentials

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/username/signed-storage.git
   cd signed-storage
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your worker:
   ```bash
   npm run config
   ```
   This will launch an interactive configuration wizard to help you set up your `wrangler.jsonc` file.

4. Configure secrets:
   ```bash
   wrangler secret put AWS_ACCESS_KEY_ID
   wrangler secret put AWS_SECRET_ACCESS_KEY
   wrangler secret put GCS_ACCESS_KEY_ID
   wrangler secret put GCS_SECRET_ACCESS_KEY
   ```

### Configuration

The worker can be configured in two ways:

1. **Configuration Wizard** (Recommended)
   ```bash
   npm run config
   ```
   This interactive tool will guide you through setting up all required and optional configuration.

2. **Manual Configuration**
   Edit the `wrangler.jsonc` file directly. The file is well-documented with comments explaining each configuration option.

## Usage

### URL Patterns

The worker supports path-based routing:

- `/s3/path/to/file.jpg` - Access files from AWS S3
- `/gcs/path/to/file.jpg` - Access files from Google Cloud Storage

You can customize these URL prefixes in your configuration:

```jsonc
"vars": {
  "S3_URL_PREFIX": "/s3/",
  "GCS_URL_PREFIX": "/gcs/"
}
```

If no path prefix matches, the worker will use the provider specified by `DEFAULT_PROVIDER` in your configuration.

### HMAC Authentication

The worker uses HMAC authentication to securely access content from AWS S3 and Google Cloud Storage. This requires:

1. AWS-style credentials for both S3 and GCS (Access Key ID and Secret Access Key)
2. Proper bucket configuration to allow access using these credentials

The authentication is handled by the `aws4fetch` library, which signs requests according to the AWS Signature Version 4 protocol.

### Caching

The worker implements intelligent caching based on content type to optimize performance. Default caching rules:

- Video files (mp4, mov, etc.): 1 year
- Images (jpg, png, etc.): 1 hour
- CSS/JS: 1 hour
- Audio (mp3, wav, etc.): 1 year
- Streaming manifests (m3u8, mpd): 3 seconds

These rules can be customized using the `CACHE_CONFIG` setting (see [Custom Cache Rules](#custom-cache-rules)).

## Advanced Configuration

### Custom Cache Rules

You can define custom caching rules by setting the `CACHE_CONFIG` environment variable:

```jsonc
"CACHE_CONFIG": "[
  {\"pattern\":\"\\\\.mp4$|\\\\.mov$|\\\\.avi$\",\"ttl\":31536000},
  {\"pattern\":\"\\\\.jpg$|\\\\.jpeg$|\\\\.png$\",\"ttl\":3600},
  {\"pattern\":\"\\\\.css$|\\\\.js$\",\"ttl\":3600},
  {\"pattern\":\"\\\\.mp3$|\\\\.wav$\",\"ttl\":31536000},
  {\"pattern\":\"\\\\.m3u8$|\\\\.mpd$\",\"ttl\":3}
]"
```

Each rule consists of:
- `pattern`: A regular expression to match file paths
- `ttl`: Time-to-live in seconds for matched files

### Custom Provider Mapping

For more complex routing needs, you can define custom mappings between URL patterns and storage providers:

```jsonc
"PROVIDER_MAPPINGS": "[
  {\"pattern\":\"\\\\/images\\\\/.*\",\"provider\":\"gcs\"},
  {\"pattern\":\"\\\\/videos\\\\/.*\",\"provider\":\"s3\"}
]"
```

Each mapping consists of:
- `pattern`: A regular expression to match URL paths
- `provider`: The storage provider to use ("s3" or "gcs")

### Custom Endpoints

You can specify custom endpoints for S3 or GCS:

```jsonc
"S3_ENDPOINT": "https://custom-s3-endpoint.com",
"GCS_ENDPOINT": "https://storage.googleapis.com"
```

This is useful for S3-compatible storage providers or GCS with custom endpoints.

## Development

### Testing

Run tests:

```bash
npm test
```

Run specific test suites:

```bash
npm run test:quick  # Quick tests
npm run test:health # Health check tests
npm run test:full   # Complete test suite
```

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

Run locally for development:

```bash
npm run dev
```

## Architecture

The worker follows a domain-driven design approach:

```
/
├── src/
│   ├── config/            # Configuration management
│   ├── domains/           # Core business logic domains
│   │   ├── storage/       # Storage provider domain
│   │   └── cache/         # Cache management domain
│   ├── handlers/          # Request handlers
│   ├── utils/             # Utility functions
│   └── index.js           # Main entry point
```

Key components:

1. **Provider Factory**: Creates the appropriate provider based on configuration or URL path
2. **Storage Providers**: Implements access to S3 and GCS through a common interface
3. **Cache Handler**: Applies appropriate caching rules based on asset type
4. **Request Handler**: Processes requests and applies authentication

## Security

Important security considerations:

1. **Credentials**: Always use Wrangler secrets for storing credentials
2. **Access Control**: Configure your S3 and GCS buckets with appropriate access controls
3. **CORS**: Set CORS headers in your storage bucket configuration if needed
4. **Headers**: The worker removes sensitive headers from responses

## Troubleshooting

If you encounter issues:

1. **Enable Debug Mode**: Set `DEBUG_MODE` to `true` in your configuration
2. **Check Logs**: Set `ENABLE_LOGGING` to `true` to get detailed logs
3. **Health Check**: Access the health check endpoint (default: `/__health`) to verify the worker is running
4. **Test Request**: Add the header `debug=test` to your requests to get debugging information
5. **Check Configuration**: Verify your configuration and credentials
6. **Verify Bucket Access**: Ensure your credentials have access to the specified buckets
7. **Check URL Paths**: Make sure you're using the correct URL pattern for each provider