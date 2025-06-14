// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
// Import the Google Generative AI SDK

// const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai'); // Import Gemini SDK
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: "AIzaSyDsqngE0DbHGXd5Cm9ypCVypvn9-SGc4RU" });
const app = express();
const port = process.env.PORT || 3000;

// Access your API key as an environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('GEMINI_API_KEY:', GEMINI_API_KEY);

// Check if API key is loaded
if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set in the .env file!');
    process.exit(1); // Exit if no API key is found
}

// Initialize Google Generative AI
// const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// const model = ai.getGenerativeModel({ model: "gemini-1.0-pro" }); // Using gemini-pro model
// TEMPORARY: Function to list available models for debugging
async function debugListModels() {
    try {
        console.log('--- Listing models available to this API Key ---');
        const models = await genAI.listModels();
        if (models.length === 0) {
            console.log('No models found. This often indicates an invalid or unauthorized API key.');
        } else {
            for (const modelInfo of models) {
                console.log(`- ID: ${modelInfo.name}, Supported Methods: ${modelInfo.supportedGenerationMethods?.join(', ') || 'N/A'}`);
            }
        }
        console.log('--- End of Model List ---');
    } catch (listError) {
        console.error('Error while trying to list models:', listError);
        if (listError.message.includes('API key')) {
            console.error('This often confirms an API key issue (invalid or unauthorized).');
        }
    }
}

// Call the debug function once when the server starts
// debugListModels();

// The rest of your server.js code continues below...
// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Root Route (Optional: for testing if server is up) ---
app.get('/', (req, res) => {
    res.send('Hindi Speech-to-Email Generator Backend is running!');
});

// --- API Endpoint for Email Generation ---
app.post('/generate-email', async (req, res) => {
    const { hindiText } = req.body;

    if (!hindiText) {
        return res.status(400).json({ error: 'Hindi text is required.' });
    }

    console.log(`Received Hindi text for LLM: "${hindiText}"`);

    try {
        // --- Prompt Engineering for Gemini ---
        const prompt = `You are an expert email writer. Your task is to generate a professional email in English based on the provided Hindi instructions.
        The email should be clear, concise, and suitable for a professional context.
        Hindi Instruction:
        ${hindiText}
        `;

        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash", // Use the gemini-2.0-flash model
            contents: prompt,
            // generationConfig: {
            //     maxOutputTokens: 500, // Limit output tokens to avoid excessive responses
            //     temperature: 0.7, // Adjust temperature for creativity vs. accuracy
            //     topP: 0.9, // Use top-p sampling for better quality
                
            // }
        });

        // Handle potential blockage due to safety settings
        const response = result;
        console.log('Gemini Response:', response); // Log the response for debugging
        const text = result.text;
        console.log('Gemini Raw Response:\n', text); // Log the raw response for debugging

        // --- Parse the LLM's response ---
        let englishEmail = "Error: Could not extract email.";
        let hindiEnglishMapping = ["Error: Could not extract mapping."];

        const emailStartTag = "ENGLISH_EMAIL_START";
        const emailEndTag = "ENGLISH_EMAIL_END";
        const mappingStartTag = "MAPPING_START";
        const mappingEndTag = "MAPPING_END";

        // Extract email
        const emailMatch = text.match(new RegExp(`${emailStartTag}\\n([\\s\\S]*?)\\n${emailEndTag}`));
        if (emailMatch && emailMatch[1]) {
            englishEmail = emailMatch[1].trim();
        }

        // Extract mapping
        const mappingMatch = text.match(new RegExp(`${mappingStartTag}\\n([\\s\\S]*?)\\n${mappingEndTag}`));
        if (mappingMatch && mappingMatch[1]) {
            hindiEnglishMapping = mappingMatch[1].trim().split('\n');
        }

        res.json({
            englishEmail: englishEmail,
            hindiEnglishMapping: hindiEnglishMapping
        });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        // Provide more user-friendly error message if it's an API error
        let errorMessage = 'Failed to generate email. Please try again.';
        if (error.message.includes('API key')) {
            errorMessage = 'API key error. Please check your GEMINI_API_KEY in the .env file.';
        } else if (error.message.includes('quota')) {
            errorMessage = 'API quota exceeded or rate limited. Please try again later.';
        } else if (error.message.includes('safety')) {
            errorMessage = 'Content potentially violates safety guidelines. Please rephrase your request.';
        }
        res.status(500).json({ error: errorMessage });
    }
});

// --- Start the server ---
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Access backend at http://localhost:${port}`);
});