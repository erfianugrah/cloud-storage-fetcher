/**
 * Configuration Generator
 * 
 * A utility script to help users generate and update their wrangler.jsonc configuration
 * through an interactive command-line interface.
 */

import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CONFIG = {
  name: 'signed-storage',
  main: 'src/index.js',
  compatibility_date: '2025-03-03',
  observability: { enabled: true },
  vars: {
    DEFAULT_PROVIDER: 's3',
    S3_BUCKET: '',
    AWS_REGION: 'us-east-1',
    GCS_BUCKET: '',
    S3_URL_PREFIX: '/s3/',
    GCS_URL_PREFIX: '/gcs/',
    HEALTH_CHECK_PATH: '/__health',
    DEFAULT_CACHE_TTL: 60,
    FETCH_TIMEOUT: 30000,
    DEBUG_MODE: false,
    ENABLE_LOGGING: false
  }
};

const ADVANCED_OPTIONS = {
  CACHE_CONFIG: 'Custom cache configuration for different file types',
  HEADERS_TO_REMOVE: 'Headers to remove from storage provider responses',
  S3_ENDPOINT: 'Custom S3 endpoint URL',
  S3_PATH_PREFIX: 'Path prefix to add to all S3 requests',
  GCS_ENDPOINT: 'Custom GCS endpoint URL',
  GCS_PATH_PREFIX: 'Path prefix to add to all GCS requests',
  ERROR_FORMAT: 'Error response format (text or json)',
  PROVIDER_MAPPINGS: 'Custom URL-to-provider mappings'
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promise-based question function
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Load existing config if available
async function loadExistingConfig() {
  const configPath = path.join(process.cwd(), 'wrangler.jsonc');
  
  try {
    if (fs.existsSync(configPath)) {
      // Remove comments from JSONC file
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const jsonContent = fileContent.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? '' : m);
      return JSON.parse(jsonContent);
    }
  } catch (error) {
    console.log('Could not parse existing configuration. Starting with defaults.');
  }
  
  return DEFAULT_CONFIG;
}

// Write formatted config to file
function writeConfig(config) {
  const configPath = path.join(process.cwd(), 'wrangler.jsonc');
  
  const content = `/**
 * SIGNED STORAGE WORKER CONFIGURATION
 * 
 * This file configures your Cloudflare Worker for serving signed content from S3 and GCS.
 * Edit the values below to match your requirements.
 * 
 * For advanced configuration options, see the documentation or run: npm run config
 */
${JSON.stringify(config, null, 2)
  .replace(/"vars": {/g, '"vars": {\n    // Required Configuration')
  .replace(/"DEFAULT_PROVIDER"/g, '\n    // Choose your default provider: "s3" or "gcs"\n    "DEFAULT_PROVIDER"')
  .replace(/"S3_BUCKET"/g, '\n    // S3 Configuration\n    "S3_BUCKET"')
  .replace(/"GCS_BUCKET"/g, '\n    // GCS Configuration\n    "GCS_BUCKET"')}

/**
 * IMPORTANT: Set up your credentials securely using wrangler secrets:
 * 
 * wrangler secret put AWS_ACCESS_KEY_ID
 * wrangler secret put AWS_SECRET_ACCESS_KEY
 * wrangler secret put GCS_ACCESS_KEY_ID
 * wrangler secret put GCS_SECRET_ACCESS_KEY
 */`;

  fs.writeFileSync(configPath, content);
  console.log(`Configuration saved to ${configPath}`);
}

// Main function
async function main() {
  console.log('=== Signed Storage Worker Configuration Generator ===\n');
  console.log('This wizard will help you create or update your wrangler.jsonc configuration file.\n');
  
  const config = await loadExistingConfig();
  
  // Basic configuration
  console.log('\n== Basic Configuration ==\n');
  
  config.name = await question(`Worker name [${config.name}]: `) || config.name;
  
  // Provider configuration
  console.log('\n== Provider Configuration ==\n');
  
  config.vars.DEFAULT_PROVIDER = (await question(`Default provider (s3 or gcs) [${config.vars.DEFAULT_PROVIDER}]: `) || config.vars.DEFAULT_PROVIDER).toLowerCase();
  if (!['s3', 'gcs'].includes(config.vars.DEFAULT_PROVIDER)) {
    console.log('Warning: Provider must be either "s3" or "gcs". Defaulting to "s3".');
    config.vars.DEFAULT_PROVIDER = 's3';
  }
  
  config.vars.S3_BUCKET = await question(`S3 bucket name [${config.vars.S3_BUCKET}]: `) || config.vars.S3_BUCKET;
  config.vars.AWS_REGION = await question(`AWS region [${config.vars.AWS_REGION}]: `) || config.vars.AWS_REGION;
  config.vars.GCS_BUCKET = await question(`GCS bucket name [${config.vars.GCS_BUCKET}]: `) || config.vars.GCS_BUCKET;
  
  // URL path configuration
  console.log('\n== URL Path Configuration ==\n');
  
  config.vars.S3_URL_PREFIX = await question(`S3 URL prefix [${config.vars.S3_URL_PREFIX}]: `) || config.vars.S3_URL_PREFIX;
  config.vars.GCS_URL_PREFIX = await question(`GCS URL prefix [${config.vars.GCS_URL_PREFIX}]: `) || config.vars.GCS_URL_PREFIX;
  
  // Advanced configuration
  console.log('\n== Advanced Configuration ==\n');
  
  const useAdvanced = (await question('Configure advanced options? (y/n) [n]: ') || 'n').toLowerCase() === 'y';
  
  if (useAdvanced) {
    config.vars.DEFAULT_CACHE_TTL = parseInt(await question(`Default cache TTL in seconds [${config.vars.DEFAULT_CACHE_TTL}]: `) || config.vars.DEFAULT_CACHE_TTL);
    config.vars.FETCH_TIMEOUT = parseInt(await question(`Request timeout in milliseconds [${config.vars.FETCH_TIMEOUT}]: `) || config.vars.FETCH_TIMEOUT);
    config.vars.DEBUG_MODE = (await question(`Enable debug mode? (true/false) [${config.vars.DEBUG_MODE}]: `) || config.vars.DEBUG_MODE) === 'true';
    config.vars.ENABLE_LOGGING = (await question(`Enable logging? (true/false) [${config.vars.ENABLE_LOGGING}]: `) || config.vars.ENABLE_LOGGING) === 'true';
    
    console.log('\nAvailable advanced options:');
    Object.entries(ADVANCED_OPTIONS).forEach(([key, description], index) => {
      console.log(`${index + 1}. ${key}: ${description}`);
    });
    
    const selectedOptions = await question('\nEnter the numbers of options to configure (comma-separated, or "all"): ');
    
    if (selectedOptions.toLowerCase() === 'all') {
      for (const [key, description] of Object.entries(ADVANCED_OPTIONS)) {
        const value = await question(`${key} (${description}): `);
        if (value) config.vars[key] = value;
      }
    } else if (selectedOptions.trim()) {
      const options = selectedOptions.split(',').map(n => parseInt(n.trim()) - 1);
      const advancedKeys = Object.keys(ADVANCED_OPTIONS);
      
      for (const index of options) {
        if (index >= 0 && index < advancedKeys.length) {
          const key = advancedKeys[index];
          const description = ADVANCED_OPTIONS[key];
          const value = await question(`${key} (${description}): `);
          if (value) config.vars[key] = value;
        }
      }
    }
  }
  
  // Save configuration
  writeConfig(config);
  
  console.log('\n=== Configuration Complete ===');
  console.log('\nTo set up your secret credentials, run:');
  console.log('  wrangler secret put AWS_ACCESS_KEY_ID');
  console.log('  wrangler secret put AWS_SECRET_ACCESS_KEY');
  console.log('  wrangler secret put GCS_ACCESS_KEY_ID');
  console.log('  wrangler secret put GCS_SECRET_ACCESS_KEY');
  
  rl.close();
}

// Run the main function
main().catch(console.error);