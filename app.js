document.addEventListener('DOMContentLoaded', () => {
    // UI Connections
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

    const tosModal = document.getElementById('tos-modal');
    const acceptTosBtn = document.getElementById('accept-tos-btn');
    const signatureInput = document.getElementById('signature-input');

    // Boot Sequence: First-Visit Check with Signature Logic
    if (!localStorage.getItem('aegis_tos_accepted')) {
        tosModal.classList.remove('hidden');
    }

    // Monitor the signature input in real-time
    signatureInput.addEventListener('input', (e) => {
        if (e.target.value.trim().toUpperCase() === 'I ACCEPT') {
            acceptTosBtn.disabled = false;
            acceptTosBtn.textContent = 'INITIALIZE SYSTEM';
            acceptTosBtn.style.background = 'var(--accent-green)';
            acceptTosBtn.style.color = '#000';
            acceptTosBtn.style.border = 'none';
        } else {
            acceptTosBtn.disabled = true;
            acceptTosBtn.textContent = 'SYSTEM LOCKED';
            acceptTosBtn.style.background = 'var(--bg-subtle)';
        }
    });

    acceptTosBtn.addEventListener('click', () => {
        localStorage.setItem('aegis_tos_accepted', 'true');
        tosModal.classList.add('hidden');
        appendLine('system', '[LEGAL] System access verified. Operator clearance granted.');
    });

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
        appendLine('error', '[CONFIG] Memory purged. All API keys and settings erased.');
    });

    // Real-Time Open-Source Sensor (Free Wikipedia Live Fetcher)
    async function fetchLiveContext(query) {
        try {
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
            const response = await fetch(searchUrl);
            const data = await response.json();
            
            if (data.query && data.query.search && data.query.search.length > 0) {
                const snippet = data.query.search[0].snippet.replace(/(<([^>]+)>)/gi, "");
                return `[LIVE SYSTEM SENSOR: Wikipedia reference node reports: "${snippet}"]`;
            }
            return "[LIVE SYSTEM SENSOR: No real-time reference data found for this specific query.]";
        } catch (e) {
            return "[LIVE SYSTEM SENSOR: Connection to open data nodes failed.]";
        }
    }

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

    // Google Gemini API Protocol (with Live Google Search Grounding)
    async function executeGemini(prompt) {
        const apiKey = localStorage.getItem('aegis_key_gemini');
        if (!apiKey) return appendLine('error', '[AUTH ERROR] Missing Gemini API key. Add it in ⚙ [AUTH CONFIG].');

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        try {
            appendLine('system', '[SENSOR] Activating Google Live Search grounding...');
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: prompt }] }],
                    tools: [{ googleSearch: {} }]
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Access Denied by Google Cloud.');
            appendLine('system', data.candidates[0].content.parts[0].text);
        } catch (err) {
            appendLine('error', `[EXECUTE FAILED] ${err.message}`);
        }
    }

    // Standard OpenAI Protocol (Used for Groq and OpenRouter with Live Sensor Data Chaining)
    async function executeOpenAICompatible(prompt, provider) {
        let apiKey, url, model;

        if (provider === 'groq') {
            apiKey = localStorage.getItem('aegis_key_groq');
            url = 'https://api.groq.com/openai/v1/chat/completions';
            model = 'llama-3.3-70b-versatile'; 
        } else {
            apiKey = localStorage.getItem('aegis_key_openrouter');
            url = 'https://openrouter.ai/api/v1/chat/completions';
            model = 'deepseek/deepseek-chat:free';
        }

        if (!apiKey) return appendLine('error', `[AUTH ERROR] Missing ${provider.toUpperCase()} API key. Add it in ⚙ [AUTH CONFIG].`);

        try {
            appendLine('system', '[SENSOR] Pulling real-time context from trusted open-source nodes...');
            const liveContext = await fetchLiveContext(prompt);
            
            const enhancedPrompt = `
You are an Aegis Intelligence Terminal. Use the following real-time context to help answer the user query accurately and concisely.
${liveContext}

User Query: ${prompt}
`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: enhancedPrompt }]
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
        line.innerHTML = text.replace(/\n/g, '<br>');
        terminalFeed.appendChild(line);
        terminalFeed.scrollTop = terminalFeed.scrollHeight;
    }
});
