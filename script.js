// code by Gemini AI
// 1. Select HTML Elements
const textInput = document.getElementById('detector');
const editorPreview = document.getElementById('editor-preview');
const proofreadBtn = document.getElementById('proofread-btn');

const wordCountSpan = document.getElementById('word-count');
const charCountSpan = document.getElementById('char-count');
const typoCountSpan = document.getElementById('typo-count');
const grammarCountSpan = document.getElementById('grammar-count');
const qualityScoreSpan = document.getElementById('quality-score');

const loadingContainer = document.getElementById('loading-container');
const resultsSection = document.getElementById('results-section');

// Store mistake counts globally so we can decrement them when clicked
let currentTypos = 0;
let currentGrammar = 0;

// 2. Click "Proofread" Button
proofreadBtn.addEventListener('click', async () => {
    const text = textInput.value;

    if (!text.trim()) {
        alert('Please enter some text first!');
        return;
    }

    // Show loading cats & hide previous stats
    loadingContainer.classList.remove('hidden');
    resultsSection.classList.add('hidden');

    try {
        const response = await fetch('https://catproof-api.onrender.com/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        const data = await response.json();

        // Process dynamic errors & display preview
        displayResults(data);

    } catch (error) {
        console.error('Error connecting to backend:', error);
        alert('Could not connect to Python server. Is proofreader.py running?');
    } finally {
        loadingContainer.classList.add('hidden');
    }
});

// 3. Click inside preview container to handle fixing individual mistakes OR returning to edit mode
editorPreview.addEventListener('click', (e) => {
    const errorSpan = e.target.closest('.typos, .grammar');

    // If clicking directly on a highlighted error span
    if (errorSpan) {
        e.stopPropagation(); // Stop click from switching back to textarea mode

        const correction = errorSpan.getAttribute('data-correction');
        const isTypo = errorSpan.classList.contains('typos');

        // Apply correction text if available
        if (correction) {
            errorSpan.textContent = correction;
        }

        // Remove error classes and apply green reviewed style
        errorSpan.classList.remove('typos', 'grammar');
        errorSpan.classList.add('reviewed');
        errorSpan.removeAttribute('data-suggestion');

        // Decrement corresponding mistake count
        if (isTypo && currentTypos > 0) currentTypos--;
        if (!isTypo && currentGrammar > 0) currentGrammar--;

        // Update stats on screen
        updateStats();

        // Sync the corrected text back into the hidden textarea input
        textInput.value = editorPreview.innerText;
        return;
    }

    // If clicking outside an error (plain text/empty space), switch back to editing textarea
    if (e.target === editorPreview) {
        editorPreview.style.display = 'none';
        textInput.style.display = 'block';
        textInput.focus();
    }
});

// 4. Build dynamic HTML spans for ANY input text
function displayResults(data) {
    const text = textInput.value;
    
    // Reset counters
    currentTypos = 0;
    currentGrammar = 0;

    // Update basic counts
    wordCountSpan.textContent = `${data.word_count} words`;
    charCountSpan.textContent = `${data.char_count} chars`;

    // Sort matches from LAST to FIRST so string slicing doesn't ruin earlier offsets
    const matches = (data.matches || []).sort((a, b) => b.offset - a.offset);

    let formattedText = text;

    matches.forEach(match => {
        const rule = match.ruleID || match.rule_id || '';
        const isTypo = rule.includes('MORFOLOGIK') || rule.includes('SPELLER') || rule.includes('TYPOS');

        if (isTypo) {
            currentTypos++;
        } else {
            currentGrammar++;
        }

        // Extract replacement suggestion
        const replacement = (match.replacements && match.replacements.length > 0) ? match.replacements[0] : '';
        const suggestionText = replacement ? `Correct: ${replacement}` : match.message;

        const cssClass = isTypo ? 'typos' : 'grammar';

        // Extract exact error word from original text
        const errorWord = formattedText.substring(match.offset, match.offset + match.length);

        // Build HTML span with correction attribute attached
        const spanTag = `<span class="${cssClass}" data-suggestion="${suggestionText}" data-correction="${replacement}">${errorWord}</span>`;

        // Inject span tag into formatted string
        formattedText = formattedText.slice(0, match.offset) + spanTag + formattedText.slice(match.offset + match.length);
    });

    updateStats();

    // Inject highlighted HTML into editor-preview and display it
    editorPreview.innerHTML = formattedText;
    textInput.style.display = 'none';
    editorPreview.style.display = 'block';

    // Show stats box
    resultsSection.classList.remove('hidden');
}

// 5. Helper function to update stats & Quality Score display
function updateStats() {
    typoCountSpan.textContent = `${currentTypos} mistakes`;
    grammarCountSpan.textContent = `${currentGrammar} mistakes`;

    const penalty = (currentTypos * 1) + (currentGrammar * 2);
    const qualityScore = Math.max(0, 100 - penalty);
    qualityScoreSpan.textContent = `${qualityScore}/100`;
}
