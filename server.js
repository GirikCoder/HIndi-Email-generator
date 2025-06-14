// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai'); // Import Gemini SDK
const app = express();
const port = process.env.PORT || 3000;

// Access your API key as an environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Check if API key is loaded
if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set in the .env file!');
    process.exit(1); // Exit if no API key is found
}

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" }); // Using gemini-pro model
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
debugListModels();

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
        const prompt = `You are an AI assistant designed to convert informal Hindi instructions into a formal English email.
        You also need to provide a line-by-line Hindi to English mapping of the *original Hindi instruction*.
        
        The output must strictly follow the specified format:

        ENGLISH_EMAIL_START
        [Formal English Email generated from Hindi instruction]
        ENGLISH_EMAIL_END

        MAPPING_START
        [Original Hindi Line 1] -> [English Translation 1]
        [Original Hindi Line 2] -> [English Translation 2]
        ...
        MAPPING_END

        Example:
        Hindi Instruction:
        मुझे आज छुट्टी चाहिए। कृपया मेरे मैनेजर को ईमेल लिखें कि मैं बीमार हूँ।

        Output:
        ENGLISH_EMAIL_START
        Subject: Leave Request - [Your Name/Employee ID]

        Dear [Manager's Name],

        I am writing to formally request a leave of absence for today, [Current Date], due to illness. I apologize for any inconvenience this may cause.

        I will keep you updated on my condition and estimated return to work.

        Thank you for your understanding.

        Sincerely,
        [Your Name]
        ENGLISH_EMAIL_END

        MAPPING_START
        मुझे आज छुट्टी चाहिए। -> I need a leave today.
        कृपया मेरे मैनेजर को ईमेल लिखें कि मैं बीमार हूँ। -> Please write an email to my manager stating that I am sick.
        MAPPING_END

        Now, process the following Hindi instruction:
        Hindi Instruction:
        ${hindiText}
        `;

        const result = await model.generateContent({
            contents: [{ parts: [{ text: prompt }] }],
            // Optional: Configure safety settings if needed
            // If the model generates content that might be harmful, these settings block it.
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
            ],
        });

        // Handle potential blockage due to safety settings
        const response = result.response;
        const text = response.text();
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