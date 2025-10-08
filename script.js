const generateBtn = document.getElementById("generateButton");
const regenerateBtn = document.getElementById("regenerateButton");
const clearBtn = document.getElementById("clearButton");
const saveBtn = document.getElementById("saveButton");
const copyButton = document.getElementById("copyButton");
const themeButton = document.getElementById("themeButton");
const storyOutputDiv = document.getElementById("storyOutput");
const storyOutput = document.getElementById("generatedStory");
const loading = document.getElementById("loading");
const loadingModel = document.getElementById("loadingModel");
const userInput = document.getElementById("userInput");
const keywordsInput = document.getElementById("keywordsInput");
const charCount = document.getElementById("charCount");
const storyText = document.getElementById("storyText");
const cursor = document.querySelector(".cursor");
const modelSelect = document.getElementById("modelSelect");
const styleSelect = document.getElementById("styleSelect");
const lengthSelect = document.getElementById("lengthSelect");
const genreSelect = document.getElementById("genreSelect");
const body = document.body;
const container = document.querySelector(".container");
const title = document.querySelector(".title");
const inputArea = document.querySelectorAll(".input-area");
const buttons = document.querySelectorAll(".btn");
const historySelect = document.getElementById("historySelect");
const errorMessage = document.getElementById("errorMessage");
const speakButton = document.getElementById("speakButton");
const stopSpeakButton = document.getElementById("stopSpeakButton");

let lastPrompt = ""; // Store the last generated prompt
let inputHistory = loadInputHistory(); // Load history from local storage
let speechUtterance = null;

// Check if SpeechSynthesis API is available
if ('speechSynthesis' in window) {
    speakButton.classList.remove('hidden');
} else {
    speakButton.classList.add('hidden');
    console.log("Speech Synthesis API is not supported in this browser.");
}

// Load Input History from Local Storage
function loadInputHistory() {
    const storedHistory = localStorage.getItem("inputHistory");
    return storedHistory ? JSON.parse(storedHistory) : [];
}

// Save Input History to Local Storage
function saveInputHistory() {
    localStorage.setItem("inputHistory", JSON.stringify(inputHistory));
}

// Populate Input History Dropdown
function populateHistoryDropdown() {
    historySelect.innerHTML = '<option value="" selected disabled>-- Select Previous Idea --</option>';
    inputHistory.slice().reverse().forEach(item => {
        const option = document.createElement("option");
        option.value = item.input;
        option.textContent = item.input + (item.keywords ? ` (Keywords: ${item.keywords})` : '');
        historySelect.appendChild(option);
    });
}

// Character Counter
userInput.addEventListener("input", () => {
    charCount.textContent = `${userInput.value.length}/200`;
    if (userInput.value.length >= 200) {
        charCount.classList.add("limit-reached");
    } else {
        charCount.classList.remove("limit-reached");
    }
});

// Handle History Item Selection
historySelect.addEventListener("change", () => {
    userInput.value = historySelect.value;
    const selectedHistory = inputHistory.find(item => item.input === historySelect.value);
    if (selectedHistory && selectedHistory.keywords) {
        keywordsInput.value = selectedHistory.keywords;
    } else {
        keywordsInput.value = "";
    }
    charCount.textContent = `${userInput.value.length}/200`;
    if (userInput.value.length >= 200) {
        charCount.classList.add("limit-reached");
    } else {
        charCount.classList.remove("limit-reached");
    }
});

// Function to generate the story using Ollama
async function generateStory(prompt, model) {
    loadingModel.textContent = model;
    loading.classList.remove("hidden");
    cursor.style.display = "inline-block";
    regenerateBtn.classList.add("hidden");
    errorMessage.classList.add("hidden");
    storyText.innerText = "";
    stopSpeech(); // Stop any ongoing speech

    try {
        const ollamaApiUrl = 'http://localhost:11434/api/generate';

        const response = await fetch(ollamaApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model.toLowerCase(), // Ollama model names are often lowercase
                prompt: prompt,
                stream: false, // Set to false for a single response
                // You can add other Ollama parameters here if needed,
                // like `temperature`, `top_p`, etc.
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Ollama API Error:", errorData);
            throw new Error(`Ollama API request failed with status ${response.status}: ${errorData.error || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log("Ollama API Response:", data);

        const generatedText = data.response || "No response received from Ollama.";

        loading.classList.add("hidden");
        cursor.style.display = "none";
        regenerateBtn.classList.remove("hidden");
        storyText.innerText = generatedText;

    } catch (error) {
        console.error("Error generating story with Ollama:", error);
        loading.classList.add("hidden");
        cursor.style.display = "none";
        errorMessage.textContent = `Failed to generate story with Ollama: ${error.message}`;
        errorMessage.classList.remove("hidden");
    }
}

// Generate Button Click
generateBtn.addEventListener("click", async () => {
    const input = userInput.value.trim();
    if (input === "") {
        alert("Please enter a story idea!");
        return;
    }

    const keywords = keywordsInput.value.trim();
    const selectedModel = modelSelect.value;
    const selectedStyle = styleSelect.value;
    const selectedLength = lengthSelect.value;
    const selectedGenre = genreSelect.value;

    let prompt = `Write a creative short story`;

    // Add length constraint to the prompt
    if (selectedLength === 'short') {
        prompt += ` that is approximately 50-100 words`;
    } else if (selectedLength === 'medium') {
        prompt += ` that is approximately 150-250 words`;
    } else if (selectedLength === 'long') {
        prompt += ` that is approximately 300-500 words`;
    }

    // Add genre to the prompt
    if (selectedGenre !== 'any') {
        prompt += ` in the genre of ${selectedGenre}`;
    }

    if (selectedStyle !== 'default') {
        prompt += ` with a ${selectedStyle} tone`;
    }
    prompt += ` about: ${input}`;
    if (keywords) {
        prompt += ` including the following elements: ${keywords}`;
    }

    lastPrompt = prompt; // Store the current prompt
    await generateStory(prompt, selectedModel);

    // Save to input history
    const existingIndex = inputHistory.findIndex(item => item.input === input && item.keywords === keywords);
    if (existingIndex === -1 && input) {
        inputHistory.push({ input: input, keywords: keywords });
        saveInputHistory();
        populateHistoryDropdown();
    }
});

// Regenerate Button Click
regenerateBtn.addEventListener("click", async () => {
    if (!lastPrompt) {
        alert("No previous story to regenerate.");
        return;
    }

    const selectedModel = modelSelect.value;
    await generateStory(lastPrompt, selectedModel);
});

// Clear Button Click
clearBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear the input and story?")) {
        userInput.value = "";
        keywordsInput.value = "";
        storyText.innerHTML = "";
        charCount.textContent = "0/200";
        charCount.classList.remove("limit-reached");
        regenerateBtn.classList.add("hidden"); // Hide regenerate button after clear
        lastPrompt = "";
        stopSpeech(); // Stop any ongoing speech
    }
});

// Save Story Button Click
saveBtn.addEventListener("click", () => {
    const story = storyText.innerText.trim();
    if (!story) {
        alert("No story to save!");
        return;
    }

    const blob = new Blob([story], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Biblios_AI.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// Copy to Clipboard Button Click
copyButton.addEventListener("click", () => {
    const story = storyText.innerText.trim();
    if (!story) {
        alert("No story to copy!");
        return;
    }
    navigator.clipboard.writeText(story)
        .then(() => {
            alert("Story copied to clipboard!");
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            alert("Failed to copy story. Please try again.");
        });
});

// Theme Toggle
themeButton.addEventListener("click", () => {
    const isDarkMode = body.classList.toggle("dark-mode");
    themeButton.textContent = isDarkMode ? "Light Mode" : "Dark Mode";
    localStorage.setItem("darkMode", isDarkMode);
    toggleDarkModeStyles(isDarkMode); // Call function to update styles
});

// Function to toggle dark mode styles
function toggleDarkModeStyles(isDarkMode) {
    container.classList.toggle("dark-mode", isDarkMode);
    title.classList.toggle("dark-mode", isDarkMode);
    inputArea.forEach(area => area.classList.toggle("dark-mode", isDarkMode));
    buttons.forEach(btn => btn.classList.toggle("dark-mode", isDarkMode));
    storyOutputDiv.classList.toggle("dark-mode", isDarkMode);
}

// Speech Synthesis Functions
function speakText(text) {
    if ('speechSynthesis' in window) {
        stopSpeech(); // Stop any ongoing speech
        speechUtterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(speechUtterance);
        speakButton.classList.add('hidden');
        stopSpeakButton.classList.remove('hidden');
    }
}

function stopSpeech() {
    if ('speechSynthesis' in window && speechSynthesis.speaking) {
        speechSynthesis.cancel();
        speakButton.classList.remove('hidden');
        stopSpeakButton.classList.add('hidden');
    }
}

// Speak Button Click
speakButton.addEventListener("click", () => {
    const story = storyText.innerText.trim();
    if (story) {
        speakText(story);
    } else {
        alert("No story to speak!");
    }
});

// Stop Speak Button Click
stopSpeakButton.addEventListener("click", () => {
    stopSpeech();
});

// Event listener to reset button states when speech ends
if ('speechSynthesis' in window) {
    speechSynthesis.addEventListener('end', () => {
        speakButton.classList.remove('hidden');
        stopSpeakButton.classList.add('hidden');
    });
}

// Initial theme load and populate history
const isDarkModeStored = localStorage.getItem("darkMode") === "true";
if (isDarkModeStored) {
    body.classList.add("dark-mode");
    themeButton.textContent = "Light Mode";
    toggleDarkModeStyles(true); // Apply dark mode styles on load
}
populateHistoryDropdown();

// CSS for Blinking Cursor (moved here to be with other JS)
const style = document.createElement("style");
style.innerHTML = `
    .cursor {
        display: inline-block;
        width: 8px;
        height: 18px;
        background: white;
        animation: blinkCursor 1s infinite;
    }

    @keyframes blinkCursor {
        50% { opacity: 0; }
    }

    .speak-btn {
        background: #29ABE2; /* A shade of blue */
        color: black;
    }

    .speak-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-3px);
    }

    .stop-speak-btn {
        background: #ff6b6b; /* Red color for stop */
        color: white;
    }

    .stop-speak-btn:hover {
        background: #e05555;
    }
`;
document.head.appendChild(style); 