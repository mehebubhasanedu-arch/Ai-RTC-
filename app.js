document.addEventListener('DOMContentLoaded', () => {
    // UI Connections matches index.html exactly
    const terminalFeed = document.getElementById('terminal-feed');
    const terminalForm = document.getElementById('terminal-form');
    const queryInput = document.getElementById('query-input');
    const modelSelector = document.getElementById('model-selector');
    
    const configDrawer = document.getElementById('config-drawer');
    const openConfigBtn = document.getElementById('open-config-btn');
    const closeConfigBtn = document.getElementById('close-config-btn');
    const saveKeysBtn = document.getElementById('save-keys-btn');
    const purgeKeysBtn = document.getElementById('purge-keys-btn');

    const geminiInput = document.getElementById('gemini-key');
    const groqInput = document.getElementById('groq-key');
    const openRouterInput = document.getElementById('openrouter-key');

    // Boot Sequence: Load keys from memory
    geminiInput.value = localStorage.getItem('aegis_key_gemini') || '';
    groqInput.value = localStorage.getItem('aegis_key_groq') || '';
    openRouterInput.value = localStorage.getItem('aegis_key_openrouter') || '';

    // UI Drawer Logic
    openConfigBtn.addEventListener('click', () => configDrawer.classList.remove('hidden'));
    closeConfigBtn.addEventListener('click', () => configDrawer.classList.add('hidden'));

    saveKeysBtn.addEventListener('click', () => {
        localStorage.setItem('aegis_key_gemini', geminiInput.value.trim());
        localStorage.setItem('aegis_key_groq', groqInput.value.trim());
        localStorage.setItem('aegis_key_openrouter', openRouterInput.value.trim());
        appendLine('system', '[CONFIG] Credentials verified and locked into local storage.');
        configDrawer.classList.add('hidden');
    });

    purgeKeysBtn.addEventListener('click', () => {
        localStorage.clear();
        geminiInput.value = '';
        groqInput.value = '';
        openRouterInput.value = '';
        appendLine('error', '[CONFIG] Memory purged. All API keys erased.');
    });

    // Query Execution & Routing
    terminalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = queryInput.value.trim();
        if (!query) return;

        const engine = modelSelector.value;
        appendLine('user', `> [TARGET: ${engine.toUpperCase()}] ${query}`);
        queryInput.value = '';

        if (engine === 'gemini') {
            await executeGemini(query);
        } else if (engine === 'groq') {
            await executeOpenAICompatible(query, 'groq');
        } else if (engine === 'openrouter') {
            await executeOpenAICompatible(query, 'openrouter');
        }
    });

    // Google Gemini API Protocol
    async function executeGemini(prompt) {
        const apiKey = localStorage.getItem('aegis_key_gemini');
        if (!apiKey) return appendLine('error', '[AUTH ERROR] Missing Gemini API key. Add it in ⚙ [AUTH CONFIG].');

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Access Denied by Google Cloud.');
            appendLine('system', data.candidates[0].content.parts[0].text);
        } catch (err) {
            appendLine('error', `[EXECUTE FAILED] ${err.message}`);
        }
    }

    // Standard OpenAI Protocol (Used for Groq and OpenRouter)
    async function executeOpenAICompatible(prompt, provider) {
        let apiKey, url, model;

        if (provider === 'groq') {
            apiKey = localStorage.getItem('aegis_key_groq');
            url = 'https://api.groq.com/openai/v1/chat/completions';
            model = 'llama3-8b-8192'; // Ultra-fast model
        } else {
            apiKey = localStorage.getItem('aegis_key_openrouter');
            url = 'https://openrouter.ai/api/v1/chat/completions';
            model = 'deepseek/deepseek-chat:free'; // Deep research model
        }

        if (!apiKey) return appendLine('error', `[AUTH ERROR] Missing ${provider.toUpperCase()} API key. Add it in ⚙ [AUTH CONFIG].`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Upstream API Error.');
            appendLine('system', data.choices[0].message.content);
        } catch (err) {
            appendLine('error', `[EXECUTE FAILED] ${err.message}`);
        }
    }

    // CLI UI Appender
    function appendLine(type, text) {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}-line`;
        line.innerHTML = text.replace(/\n/g, '<br>'); // Preserves formatting
        terminalFeed.appendChild(line);
        terminalFeed.scrollTop = terminalFeed.scrollHeight;
    }
});
