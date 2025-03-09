/**
 * Signed Storage Worker Configuration Generator
 * 
 * This interactive CLI tool helps users create and update their wrangler.jsonc configuration.
 * It guides users through setting up:
 * - Basic worker configuration
 * - Storage provider settings (S3 and GCS)
 * - URL routing paths
 * - Caching behavior
 * - Advanced options
 * 
 * Run with: npm run config
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

/**
 * Default configuration values for a new Signed Storage Worker
 * These values provide a starting point for the configuration wizard
 */
const DEFAULT_CONFIG = {
  name: 'signed-storage',
  main: 'src/index.js',
  compatibility_date: '2025-03-03',
  observability: { enabled: true },
  vars: {
    // Core provider settings
    DEFAULT_PROVIDER: 's3',      // Default storage provider (s3 or gcs)
    S3_BUCKET: '',               // AWS S3 bucket name
    AWS_REGION: 'us-east-1',     // AWS region for S3 bucket
    GCS_BUCKET: '',              // Google Cloud Storage bucket name
    
    // URL routing settings
    S3_URL_PREFIX: '/s3/',       // URL path prefix for S3 content
    GCS_URL_PREFIX: '/gcs/',     // URL path prefix for GCS content
    
    // Performance and debug settings
    HEALTH_CHECK_PATH: '/__health', // Health check endpoint path
    DEFAULT_CACHE_TTL: 60,       // Default cache time in seconds
    FETCH_TIMEOUT: 30000,        // Request timeout in milliseconds
    DEBUG_MODE: false,           // Enable/disable debug information
    ENABLE_LOGGING: false        // Enable/disable detailed logging
  }
};

/**
 * Advanced configuration options
 * These options are presented to users who select the advanced configuration path
 * Each option includes a description of its purpose
 */
const ADVANCED_OPTIONS = {
  // Cache configuration
  CACHE_CONFIG: 'Custom cache configuration for different file types (JSON string of rules)',
  
  // Response processing
  HEADERS_TO_REMOVE: 'Headers to remove from storage provider responses (comma-separated)',
  ERROR_FORMAT: 'Error response format (text or json)',
  
  // Provider endpoints
  S3_ENDPOINT: 'Custom S3 endpoint URL (for S3-compatible storage)',
  GCS_ENDPOINT: 'Custom GCS endpoint URL (defaults to storage.googleapis.com)',
  
  // Path prefixes
  S3_PATH_PREFIX: 'Path prefix to add to all S3 requests (for subdirectory access)',
  GCS_PATH_PREFIX: 'Path prefix to add to all GCS requests (for subdirectory access)',
  
  // Advanced routing
  PROVIDER_MAPPINGS: 'Custom URL-to-provider mappings (JSON string of routing rules)'
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompts the user with a question and returns their response
 * Shows a default value in brackets if provided
 * 
 * @param {string} query - The question to ask the user
 * @returns {Promise<string>} - User's response or empty string
 */
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Loads the existing wrangler.jsonc configuration if available
 * Falls back to default configuration if file doesn't exist or can't be parsed
 * 
 * @returns {Promise<object>} - The configuration object
 */
async function loadExistingConfig() {
  const configPath = path.join(process.cwd(), 'wrangler.jsonc');
  
  try {
    if (fs.existsSync(configPath)) {
      console.log(`Found existing configuration at ${configPath}`);
      
      // Read file and remove JSONC comments to make it valid JSON
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const jsonContent = fileContent.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? '' : m);
      
      try {
        const parsedConfig = JSON.parse(jsonContent);
        console.log('Successfully loaded existing configuration');
        return parsedConfig;
      } catch (parseError) {
        console.log(`Error parsing configuration: ${parseError.message}`);
        console.log('Starting with default configuration...');
      }
    } else {
      console.log('No existing configuration found. Creating new configuration...');
    }
  } catch (error) {
    console.log(`Error reading configuration: ${error.message}`);
    console.log('Starting with default configuration...');
  }
  
  return DEFAULT_CONFIG;
}

/**
 * Writes the configuration to wrangler.jsonc with proper formatting and comments
 * 
 * @param {object} config - The configuration object to write
 */
function writeConfig(config) {
  const configPath = path.join(process.cwd(), 'wrangler.jsonc');
  
  // Format the configuration with helpful comments
  const content = `/**
 * SIGNED STORAGE WORKER CONFIGURATION
 * 
 * This file configures your Cloudflare Worker for serving signed content from S3 and GCS.
 * Edit the values below to match your requirements.
 * 
 * For advanced configuration options, see the documentation or run: npm run config
 */
${JSON.stringify(config, null, 2)
  // Add section headers and comments for better readability
  .replace(/"vars": {/g, '"vars": {\n    // === REQUIRED CONFIGURATION ===')
  .replace(/"DEFAULT_PROVIDER"/g, '\n    // Choose your default provider: "s3" or "gcs"\n    "DEFAULT_PROVIDER"')
  .replace(/"S3_BUCKET"/g, '\n    // S3 Configuration\n    "S3_BUCKET"')
  .replace(/"GCS_BUCKET"/g, '\n    // GCS Configuration\n    "GCS_BUCKET"')
  .replace(/"S3_URL_PREFIX"/g, '\n    // === URL PATH CONFIGURATION ===\n    "S3_URL_PREFIX"')
  .replace(/"HEALTH_CHECK_PATH"/g, '\n    // === PERFORMANCE & DEBUGGING ===\n    "HEALTH_CHECK_PATH"')
  .replace(/"CACHE_CONFIG"/g, '\n    // === ADVANCED CONFIGURATION ===\n    "CACHE_CONFIG"')
}

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
  console.log(`You can edit this file directly or run 'npm run config' to update it later.`);
}

/**
 * Validates and parses a boolean input
 * @param {string} input - User input string
 * @param {boolean} defaultValue - Default value if input is empty
 * @returns {boolean} - Parsed boolean value
 */
function parseBoolean(input, defaultValue) {
  if (!input) return defaultValue;
  return ['true', 'yes', 'y', '1'].includes(input.toLowerCase());
}

/**
 * Validates and parses a numeric input
 * @param {string} input - User input string
 * @param {number} defaultValue - Default value if input is empty or invalid
 * @returns {number} - Parsed numeric value
 */
function parseNumber(input, defaultValue) {
  if (!input) return defaultValue;
  const parsed = parseInt(input, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Main configuration wizard function
 * Guides users through setting up their wrangler.jsonc file
 */
async function main() {
  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│ SIGNED STORAGE WORKER CONFIGURATION WIZARD          │');
  console.log('│                                                     │');
  console.log('│ This wizard will help you configure your            │');
  console.log('│ Cloudflare Worker for S3 and GCS content delivery   │');
  console.log('└─────────────────────────────────────────────────────┘\n');
  
  // Load existing configuration or start with defaults
  const config = await loadExistingConfig();
  
  // ==============================
  // BASIC CONFIGURATION
  // ==============================
  console.log('\n┌─ BASIC CONFIGURATION ─────────────────────────┐');
  console.log('│ Set the core worker settings                  │');
  console.log('└───────────────────────────────────────────────┘');
  
  // Worker name
  const workerName = await question(`Worker name [${config.name}]: `);
  config.name = workerName || config.name;
  
  // ==============================
  // PROVIDER CONFIGURATION
  // ==============================
  console.log('\n┌─ PROVIDER CONFIGURATION ───────────────────────┐');
  console.log('│ Configure your storage providers                │');
  console.log('└────────────────────────────────────────────────┘');
  
  // Default provider selection with validation
  let providerInput = await question(`Default provider (s3 or gcs) [${config.vars.DEFAULT_PROVIDER}]: `);
  providerInput = (providerInput || config.vars.DEFAULT_PROVIDER).toLowerCase();
  
  if (!['s3', 'gcs'].includes(providerInput)) {
    console.log('⚠️  Invalid provider specified. Valid options are "s3" or "gcs".');
    console.log(`⚠️  Using default provider: "${config.vars.DEFAULT_PROVIDER}"`);
  } else {
    config.vars.DEFAULT_PROVIDER = providerInput;
    console.log(`✓ Default provider set to: ${config.vars.DEFAULT_PROVIDER}`);
  }
  
  // S3 configuration - required even if using GCS as default
  console.log('\n> Amazon S3 Configuration:');
  config.vars.S3_BUCKET = await question(`  S3 bucket name [${config.vars.S3_BUCKET}]: `) || config.vars.S3_BUCKET;
  config.vars.AWS_REGION = await question(`  AWS region [${config.vars.AWS_REGION}]: `) || config.vars.AWS_REGION;
  
  // GCS configuration - required even if using S3 as default
  console.log('\n> Google Cloud Storage Configuration:');
  config.vars.GCS_BUCKET = await question(`  GCS bucket name [${config.vars.GCS_BUCKET}]: `) || config.vars.GCS_BUCKET;
  
  // ==============================
  // URL PATH CONFIGURATION
  // ==============================
  console.log('\n┌─ URL PATH CONFIGURATION ───────────────────────┐');
  console.log('│ Configure URL paths for accessing content       │');
  console.log('└────────────────────────────────────────────────┘');
  
  console.log('\nURL prefixes determine how users access content from each provider.');
  console.log('Example: https://your-worker.com/s3/image.jpg → S3 content');
  console.log('Example: https://your-worker.com/gcs/video.mp4 → GCS content');
  
  config.vars.S3_URL_PREFIX = await question(`S3 URL prefix [${config.vars.S3_URL_PREFIX}]: `) || config.vars.S3_URL_PREFIX;
  config.vars.GCS_URL_PREFIX = await question(`GCS URL prefix [${config.vars.GCS_URL_PREFIX}]: `) || config.vars.GCS_URL_PREFIX;
  
  if (config.vars.S3_URL_PREFIX === config.vars.GCS_URL_PREFIX) {
    console.log('⚠️  Warning: S3 and GCS URL prefixes are identical.');
    console.log('   This will cause routing conflicts unless you use custom provider mappings.');
  }
  
  // ==============================
  // PERFORMANCE CONFIGURATION
  // ==============================
  console.log('\n┌─ PERFORMANCE CONFIGURATION ────────────────────┐');
  console.log('│ Configure caching and request handling          │');
  console.log('└────────────────────────────────────────────────┘');
  
  // Basic performance settings
  const cacheTTL = await question(`Default cache TTL in seconds [${config.vars.DEFAULT_CACHE_TTL}]: `);
  config.vars.DEFAULT_CACHE_TTL = parseNumber(cacheTTL, config.vars.DEFAULT_CACHE_TTL);
  
  const timeout = await question(`Request timeout in milliseconds [${config.vars.FETCH_TIMEOUT}]: `);
  config.vars.FETCH_TIMEOUT = parseNumber(timeout, config.vars.FETCH_TIMEOUT);
  
  // ==============================
  // DEBUGGING CONFIGURATION
  // ==============================
  console.log('\n┌─ DEBUGGING CONFIGURATION ──────────────────────┐');
  console.log('│ Configure debugging and logging                 │');
  console.log('└────────────────────────────────────────────────┘');
  
  const debugMode = await question(`Enable debug mode? (true/false) [${config.vars.DEBUG_MODE}]: `);
  config.vars.DEBUG_MODE = parseBoolean(debugMode, config.vars.DEBUG_MODE);
  
  const enableLogging = await question(`Enable detailed logging? (true/false) [${config.vars.ENABLE_LOGGING}]: `);
  config.vars.ENABLE_LOGGING = parseBoolean(enableLogging, config.vars.ENABLE_LOGGING);
  
  config.vars.HEALTH_CHECK_PATH = await question(`Health check endpoint path [${config.vars.HEALTH_CHECK_PATH}]: `) || config.vars.HEALTH_CHECK_PATH;
  
  // ==============================
  // ADVANCED CONFIGURATION
  // ==============================
  console.log('\n┌─ ADVANCED CONFIGURATION ───────────────────────┐');
  console.log('│ Configure advanced features (optional)          │');
  console.log('└────────────────────────────────────────────────┘');
  
  const useAdvanced = parseBoolean(
    await question('Configure advanced options? (y/n) [n]: '), 
    false
  );
  
  if (useAdvanced) {
    console.log('\nAvailable advanced options:');
    
    // Display all available advanced options
    Object.entries(ADVANCED_OPTIONS).forEach(([key, description], index) => {
      console.log(`  ${index + 1}. ${key}: ${description}`);
    });
    
    console.log('\nSelect options to configure:');
    console.log('- Enter option numbers (e.g. "1,3,4")')
    console.log('- Enter "all" to configure all options')
    console.log('- Press Enter to skip advanced configuration');
    
    const selectedOptions = await question('\nOptions to configure: ');
    
    if (selectedOptions.toLowerCase() === 'all') {
      // Configure all advanced options
      console.log('\n> Configuring all advanced options:');
      
      for (const [key, description] of Object.entries(ADVANCED_OPTIONS)) {
        const value = await question(`  ${key} (${description}): `);
        if (value.trim()) {
          config.vars[key] = value;
          console.log(`  ✓ Set ${key}`);
        }
      }
    } else if (selectedOptions.trim()) {
      // Configure selected options only
      console.log('\n> Configuring selected options:');
      
      const options = selectedOptions.split(',').map(n => parseInt(n.trim()) - 1);
      const advancedKeys = Object.keys(ADVANCED_OPTIONS);
      
      for (const index of options) {
        if (index >= 0 && index < advancedKeys.length) {
          const key = advancedKeys[index];
          const description = ADVANCED_OPTIONS[key];
          const value = await question(`  ${key} (${description}): `);
          
          if (value.trim()) {
            config.vars[key] = value;
            console.log(`  ✓ Set ${key}`);
          }
        }
      }
    } else {
      console.log('> Skipping advanced configuration');
    }
  }
  
  // ==============================
  // SAVE CONFIGURATION
  // ==============================
  console.log('\n┌─ SAVING CONFIGURATION ────────────────────────┐');
  console.log('│ Writing configuration to wrangler.jsonc        │');
  console.log('└───────────────────────────────────────────────┘');
  
  // Write the configuration to file
  writeConfig(config);
  
  // ==============================
  // NEXT STEPS
  // ==============================
  console.log('\n┌─ NEXT STEPS ──────────────────────────────────┐');
  console.log('│ Complete your setup with these actions:        │');
  console.log('└───────────────────────────────────────────────┘');
  
  console.log('\n1. Add your secret credentials using wrangler:');
  console.log('   $ wrangler secret put AWS_ACCESS_KEY_ID');
  console.log('   $ wrangler secret put AWS_SECRET_ACCESS_KEY');
  console.log('   $ wrangler secret put GCS_ACCESS_KEY_ID');
  console.log('   $ wrangler secret put GCS_SECRET_ACCESS_KEY');
  
  console.log('\n2. Deploy your worker:');
  console.log('   $ npm run deploy');
  
  console.log('\n3. To reconfigure later:');
  console.log('   $ npm run config');
  
  console.log('\nConfiguration wizard completed successfully! 🎉');
  rl.close();
}

// Run the main function
main().catch(console.error);