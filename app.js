document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const modal = document.getElementById('disclaimer-modal');
    const acceptCheckbox = document.getElementById('accept-checkbox');
    const unlockBtn = document.getElementById('unlock-btn');
    const appContainer = document.getElementById('app-container');
    
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const clearKeyBtn = document.getElementById('clear-key-btn');
    const authStatus = document.getElementById('auth-status');
    const errorMsg = document.getElementById('error-message');
    
    const queryInput = document.getElementById('query-input');
    const submitBtn = document.getElementById('submit-query-btn');
    const outputLog = document.getElementById('output-log');

    // Configure the target model version
    const MODEL_NAME = 'gemini-3.8-flash';

    // 1. Disclaimer Modal Logic
    acceptCheckbox.addEventListener('change', (e) => {
        unlockBtn.disabled = !e.target.checked;
    });

    unlockBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        appContainer.classList.remove('hidden');
        checkExistingKey();
    });

    // 2. Zero-Data Auth / LocalStorage Logic
    function checkExistingKey() {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) {
            apiKeyInput.value = storedKey;
            setAuthStatus(true);
        } else {
            setAuthStatus(false);
        }
    }

    function setAuthStatus(isAuthorized) {
        if (isAuthorized) {
            authStatus.textContent = 'AUTHORIZED';
            authStatus.className = 'authorized';
            hideError();
        } else {
            authStatus.textContent = 'UNAUTHORIZED';
            authStatus.className = 'unauthorized';
        }
    }

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.classList.remove('hidden');
    }

    function hideError() {
        errorMsg.classList.add('hidden');
        errorMsg.textContent = '';
    }

    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            setAuthStatus(true);
        } else {
            showError("API key cannot be empty. Please enter a valid key.");
            setAuthStatus(false);
        }
    });

    clearKeyBtn.addEventListener('click', () => {
        localStorage.removeItem('gemini_api_key');
        apiKeyInput.value = '';
        setAuthStatus(false);
        showError("API key cleared from local storage. Please re-enter to continue.");
    });

    // 3. Engine API Request Logic
    function appendLog(role, text) {
        const entry = document.createElement('div');
        entry.classList.add('log-entry', role);
        
        let prefix = '';
        if (role === 'user') prefix = '> [USER]: ';
        if (role === 'model') prefix = '> [GEMINI]: ';
        if (role === 'error') prefix = '> [ERROR]: ';

        entry.textContent = prefix + text;
        outputLog.appendChild(entry);
        
        // Auto-scroll to bottom
        outputLog.parentElement.scrollTop = outputLog.parentElement.scrollHeight;
    }

    submitBtn.addEventListener('click', async () => {
        const query = queryInput.value.trim();
        const apiKey = localStorage.getItem('gemini_api_key');

        // Security / Error Check
        if (!apiKey) {
            showError("API KEY MISSING: Please enter and save your Gemini API key in the settings above.");
            appendLog('error', 'Execution halted. Missing API key.');
            return;
        }

        if (!query) return;

        hideError();
        queryInput.value = '';
        appendLog('user', query);
        
        // UI Loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            // Target the generativelanguage endpoint directly using fetch()
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
            
            const payload = {
                contents: [{
                    parts: [{ text: query }]
                }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // Catch API-level errors (like an invalid key, or quota hit)
            if (!response.ok) {
                throw new Error(data.error?.message || `HTTP Error ${response.status}`);
            }

            // Extract the generated text from the REST payload
            const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
            appendLog('model', generatedText);

        } catch (error) {
            console.error("API Fetch Error:", error);
            showError(`REQUEST FAILED: ${error.message}. Please check your API key validity.`);
            appendLog('error', `Execution failed: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Execute Query';
        }
    });
});
