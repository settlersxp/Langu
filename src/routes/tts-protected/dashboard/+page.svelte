<script lang="ts">
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let selectedVoice = data.voices && data.voices.length > 0 ? data.voices[0].name : '';
  let text = 'Hello, welcome to the Google Cloud Text-to-Speech demo!';
  let isGenerating = false;
  let audioUrl = '';
  let errorMessage = '';
  
  async function generateSpeech() {
    if (!text || !selectedVoice) return;
    
    isGenerating = true;
    errorMessage = '';
    audioUrl = '';
    
    try {
      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          voice: selectedVoice
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
      } else {
        const data = await response.json();
        errorMessage = data.message || 'Failed to generate speech';
      }
    } catch (error) {
      errorMessage = 'Error connecting to the TTS service';
      console.error(error);
    } finally {
      isGenerating = false;
    }
  }
</script>

<div class="dashboard">
  <h1>Google Cloud Text-to-Speech Dashboard</h1>
  
  {#if data.error}
    <div class="error">
      {data.error}
    </div>
  {/if}
  
  <div class="tts-form">
    <div class="form-group">
      <label for="voice">Select Voice</label>
      <select id="voice" bind:value={selectedVoice}>
        {#each data.voices as voice}
          <option value={voice.name}>
            {voice.name} ({voice.languageCodes?.[0] || 'unknown'}) - {voice.ssmlGender}
          </option>
        {/each}
      </select>
    </div>
    
    <div class="form-group">
      <label for="text">Text to Synthesize</label>
      <textarea id="text" bind:value={text} rows="4"></textarea>
    </div>
    
    <button on:click={generateSpeech} disabled={isGenerating || !text || !selectedVoice}>
      {isGenerating ? 'Generating...' : 'Generate Speech'}
    </button>
    
    {#if errorMessage}
      <div class="error">
        {errorMessage}
      </div>
    {/if}
    
    {#if audioUrl}
      <div class="audio-player">
        <h3>Generated Audio</h3>
        <audio controls src={audioUrl}>
          Your browser does not support the audio element.
        </audio>
      </div>
    {/if}
  </div>
  
  <div class="voice-list">
    <h2>Available Voices ({data.voices.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Language</th>
          <th>Gender</th>
          <th>Sample Rate</th>
        </tr>
      </thead>
      <tbody>
        {#each data.voices as voice}
          <tr>
            <td>{voice.name}</td>
            <td>{voice.languageCodes?.join(', ') || 'unknown'}</td>
            <td>{voice.ssmlGender}</td>
            <td>{voice.naturalSampleRateHertz}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .dashboard {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .error {
    background-color: #ffdddd;
    color: #d00;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 4px;
  }
  
  .tts-form {
    background-color: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  
  select, textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  button {
    background-color: #4285f4;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  
  .audio-player {
    margin-top: 1.5rem;
    padding: 1rem;
    background-color: #e8f0fe;
    border-radius: 4px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 1px solid #ddd;
  }
  
  th {
    background-color: #f1f3f4;
  }
</style> 