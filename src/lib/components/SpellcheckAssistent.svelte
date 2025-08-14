<script lang="ts">
  const { messageText = '' } = $props<{ messageText?: string }>();

  let inputText = $state('');
  let isChecking = $state(false);
  let result = $state<string>('');
  let error = $state<string>('');

  // Sync with messageText prop
  $effect(() => {
    inputText = messageText;
  });

  async function checkGrammar() {
    if (!inputText.trim()) {
      error = 'Please enter some text to check';
      return;
    }

    isChecking = true;
    error = '';
    result = '';

    try {
      const response = await fetch('/api/spellcheck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: inputText })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      result = data.result || 'No issues found';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to check grammar';
      console.error('Spellcheck error:', err);
    } finally {
      isChecking = false;
    }
  }
</script>

<div class="spellcheck-assistant panel">
  <div class="input-section">
    <label for="spellcheck-input">Text to check:</label>
    <textarea
      id="spellcheck-input"
      bind:value={inputText}
      placeholder="Enter text to check for grammar..."
      rows="3"
    ></textarea>
    <button 
      onclick={checkGrammar}
      disabled={isChecking || !inputText.trim()}
      class="check-btn"
    >
      {isChecking ? 'Checking...' : 'Check Grammar'}
    </button>
  </div>

  {#if error}
    <div class="error">
      {error}
    </div>
  {/if}

  {#if result}
    <div class="result">
      <h4>Grammar Check Result:</h4>
      <div class="result-content">
        {result}
      </div>
    </div>
  {/if}
</div>

<style>
  .spellcheck-assistant {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }

  .input-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-weight: 500;
    font-size: 0.9rem;
    color: #333;
  }

  textarea {
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    resize: vertical;
    font-family: inherit;
    font-size: 0.9rem;
  }

  textarea:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  .check-btn {
    padding: 0.6rem 1rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }

  .check-btn:hover:not(:disabled) {
    background-color: #218838;
  }

  .check-btn:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }

  .error {
    padding: 0.75rem;
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 6px;
    font-size: 0.9rem;
  }

  .result {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .result h4 {
    margin: 0;
    color: #333;
    font-size: 1rem;
  }

  .result-content {
    flex: 1;
    padding: 0.75rem;
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    font-size: 0.9rem;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-y: auto;
  }
</style>
