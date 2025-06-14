require('dotenv').config(); // Load environment variables from .env

// Import the Google Generative AI SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Get your API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Check if the API key is loaded
if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in your .env file!');
    console.error('Please ensure .env is in the same folder as this script, and contains GEMINI_API_KEY=YOUR_KEY');
    process.exit(1); // Exit if no API key
}

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Function to test listing models
async function listModelsTest() {
    console.log("Initializing GoogleGenerativeAI client...");
    console.log("Using API Key starting with:", GEMINI_API_KEY.substring(0, 5) + "...");

    try {
        console.log('Attempting to list models...');
        // This is the specific line that caused the TypeError in server.js
        const models = await genAI.listModels(); // <-- This is the test point

        console.log('\n--- Successfully listed models ---');
        if (models.length === 0) {
            console.log('No models found. This usually indicates an API key issue (invalid, revoked, or no models assigned to it) or regional restriction.');
        } else {
            console.log('Available Models:');
            for (const modelInfo of models) {
                console.log(`- ID: ${modelInfo.name}, Supported Methods: ${modelInfo.supportedGenerationMethods?.join(', ') || 'N/A'}`);
            }
        }
        console.log('--- End of Model List ---\n');
    } catch (error) {
        console.error('\n!!! ERROR in test_gemini_models.js while listing models:', error.message);
        if (error instanceof TypeError && error.message.includes('not a function')) {
            console.error('This means the SDK version you have installed truly does NOT have the `listModels` method on the `GoogleGenerativeAI` object.');
            console.error('Please go back to Step 1 in my previous message (delete node_modules, package-lock.json, then run npm install) VERY carefully.');
        } else if (error.message.includes('API key') || error.message.includes('permission') || error.message.includes('auth')) {
             console.error('This error indicates your API key is likely invalid, has insufficient permissions, or is not activated correctly.');
        } else if (error.message.includes('404 Not Found')) {
            console.error('A 404 here for the listModels endpoint is highly unusual and suggests a deeper API key or network issue.');
        }
    }
}

// Call the test function
listModelsTest();