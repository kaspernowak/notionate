import { config } from 'dotenv';
import path from 'path';

// Load .env file first
config();

// Verify we have the required values
if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    console.error('Missing required environment variables NOTION_TOKEN or NOTION_DATABASE_ID');
    process.exit(1);
}

// Get absolute path to docs directory
const docsPath = path.resolve(__dirname, '../next-boilerplate-wp/docs/');
console.log('Looking for markdown files in:', docsPath);

// Mock GitHub Action inputs
process.env.INPUT_NOTION_TOKEN = process.env.NOTION_TOKEN;
process.env.INPUT_DESTINATION_ID = process.env.NOTION_DATABASE_ID;
process.env.INPUT_SOURCE = docsPath;
process.env.INPUT_DESTINATION_TYPE = 'wiki';

console.log('Environment variables set:');
console.log('- INPUT_SOURCE:', process.env.INPUT_SOURCE);
console.log('- INPUT_DESTINATION_TYPE:', process.env.INPUT_DESTINATION_TYPE);
console.log('- INPUT_DESTINATION_ID:', process.env.INPUT_DESTINATION_ID);
console.log('- NOTION_TOKEN exists:', !!process.env.INPUT_NOTION_TOKEN);

// Import and run the action
import './src';
