// Get references to HTML elements
const hindiInput = document.getElementById('hindiInput');
const startSpeechBtn = document.getElementById('startSpeechBtn');
const stopSpeechBtn = document.getElementById('stopSpeechBtn');
const generateEmailBtn = document.getElementById('generateEmailBtn');
const speechStatus = document.getElementById('speechStatus');
const englishOutput = document.getElementById('englishOutput');
const copyEmailBtn = document.getElementById('copyEmailBtn');
const exportEmailBtn = document.getElementById('exportEmailBtn');
const mappingOutput = document.getElementById('mappingOutput');

// --- Web Speech API Setup ---
// Check if the browser supports the Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;
let isListening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Set language to Hindi (India)
    recognition.interimResults = false; // Only return final results
    recognition.continuous = false; // Stop listening after a single utterance

    // Event handler when speech recognition starts
    recognition.onstart = () => {
        isListening = true;
        speechStatus.textContent = 'Listening... Speak now.';
        startSpeechBtn.disabled = true;
        stopSpeechBtn.disabled = false;
        hindiInput.placeholder = 'Listening...';
        hindiInput.value = ''; // Clear previous input
    };

    // Event handler for when a speech result is obtained
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        hindiInput.value = transcript; // Display the recognized Hindi text
        speechStatus.textContent = 'Speech recognized.';
        console.log('Recognized Hindi:', transcript);
        // Automatically enable generate email button after speech
        generateEmailBtn.disabled = false;
    };

    // Event handler for when speech recognition ends (either manually stopped or automatically finished)
    recognition.onend = () => {
        isListening = false;
        speechStatus.textContent = 'Speech recognition ended.';
        startSpeechBtn.disabled = false;
        stopSpeechBtn.disabled = true;
        hindiInput.placeholder = 'Speak your instructions in Hindi, or type here...';
    };

    // Event handler for errors during speech recognition
    recognition.onerror = (event) => {
        isListening = false;
        speechStatus.textContent = `Speech recognition error: ${event.error}`;
        startSpeechBtn.disabled = false;
        stopSpeechBtn.disabled = true;
        hindiInput.placeholder = 'Speak your instructions in Hindi, or type here...';
        console.error('Speech Recognition Error:', event.error);
    };

    // Add event listeners to buttons
    startSpeechBtn.addEventListener('click', () => {
        if (!isListening) {
            recognition.start();
        }
    });

    stopSpeechBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        }
    });

} else {
    // If Web Speech API is not supported
    speechStatus.textContent = 'Web Speech API is not supported in this browser. Please try Chrome.';
    startSpeechBtn.disabled = true;
    stopSpeechBtn.disabled = true;
    generateEmailBtn.disabled = true; // Disable if speech isn't working
    console.warn('Web Speech API not supported.');
}

// --- Placeholder for Email Generation (will be filled in next phase) ---
// --- Connect to Backend for Email Generation ---
generateEmailBtn.addEventListener('click', async () => {
    const hindiText = hindiInput.value.trim();

    if (!hindiText) {
        speechStatus.textContent = 'Please provide Hindi instructions first (speak or type).';
        return;
    }

    speechStatus.textContent = 'Generating email... Please wait.';
    englishOutput.value = ''; // Clear previous output
    mappingOutput.innerHTML = '<p>Generating mapping...</p>'; // Clear previous mapping

    try {
        const response = await fetch('http://localhost:3000/generate-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ hindiText: hindiText }) // Send Hindi text as JSON
        });

        if (!response.ok) {
            // If the server response was not OK (e.g., 400, 500 status)
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json(); // Parse the JSON response from the backend

        englishOutput.value = data.englishEmail; // Display the generated English email
        
        // Display the mapping
        if (data.hindiEnglishMapping && data.hindiEnglishMapping.length > 0) {
            mappingOutput.innerHTML = ''; // Clear placeholder
            data.hindiEnglishMapping.forEach(line => {
                const p = document.createElement('p');
                p.textContent = line;
                mappingOutput.appendChild(p);
            });
        } else {
            mappingOutput.innerHTML = '<p>No specific line-by-line mapping provided.</p>';
        }

        speechStatus.textContent = 'Email generated successfully!';
        console.log('Email and mapping received from backend:', data);

    } catch (error) {
        console.error('Error generating email:', error);
        speechStatus.textContent = `Error: ${error.message}. Could not generate email.`;
        englishOutput.value = 'Failed to generate email. Please check console for details.';
        mappingOutput.innerHTML = '<p>Failed to generate mapping.</p>';
    }
});

// --- Copy and Export functionality (Basic) ---
copyEmailBtn.addEventListener('click', () => {
    if (englishOutput.value) {
        navigator.clipboard.writeText(englishOutput.value)
            .then(() => {
                alert('Email copied to clipboard!');
                console.log('Email copied to clipboard.');
            })
            .catch(err => {
                console.error('Failed to copy email: ', err);
                alert('Failed to copy email. Please copy manually.');
            });
    } else {
        alert('No email to copy!');
    }
});

exportEmailBtn.addEventListener('click', () => {
    if (englishOutput.value) {
        const filename = 'generated_email.txt';
        const blob = new Blob([englishOutput.value], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Append to body is required for Firefox
        a.click();
        document.body.removeChild(a); // Clean up
        URL.revokeObjectURL(url); // Release the object URL
        alert('Email exported as ' + filename);
        console.log('Email exported as ' + filename);
    } else {
        alert('No email to export!');
    }
});