<script lang="ts">
  import { onMount } from 'svelte';
  import { selectedVoiceForeign, selectedVoiceEnglish } from '$lib/stores/voiceStore';
  import type { Voice } from '$lib/models/language';

  let voices: Voice[] = $state([]);
  let filteredVoices: Voice[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Filter inputs
  let languageCodeFilter = $state('');
  let nameFilter = $state('');
  let genderFilter = $state('');

  // Voice testing
  let testText = $state('Hallo, dies ist ein Test für die ausgewählte Stimme.');
  let testingVoice = $state(false);
  let audioSrc = $state<string | null>(null);
  let audioElement = $state<HTMLAudioElement | null>(null);

  // Voice selection mode
  let selectionMode = $state<'foreign' | 'english'>('foreign');

  // Unique language codes for dropdown
  let uniqueLanguageCodes = $state<string[]>([]);
  let uniqueGenders = $state<string[]>([]);

  onMount(async () => {
    try {
      const response = await fetch('/api/voices');
      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }
      
      const data = await response.json();
      voices = data.voices;
      filteredVoices = voices;
      
      // Extract unique language codes and genders
      uniqueLanguageCodes = [...new Set(voices.flatMap(voice => voice.languageCodes))].sort();
      uniqueGenders = [...new Set(voices.map(voice => voice.ssmlGender))].sort();
      
      loading = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error occurred';
      loading = false;
    }
  });

  // Apply filters when any filter changes
  $effect(() => {
    applyFilters();
  });

  function applyFilters() {
    filteredVoices = voices.filter(voice => {
      // Language code filter
      const matchesLanguageCode = !languageCodeFilter || 
        voice.languageCodes.some(code => code.toLowerCase().includes(languageCodeFilter.toLowerCase()));
      
      // Name filter
      const matchesName = !nameFilter || 
        voice.name.toLowerCase().includes(nameFilter.toLowerCase());
      
      // Gender filter
      const matchesGender = !genderFilter || 
        voice.ssmlGender === genderFilter;
      
      return matchesLanguageCode && matchesName && matchesGender;
    });
  }

  function selectVoice(voice: Voice) {
    if (selectionMode === 'foreign') {
      selectedVoiceForeign.set(voice);
    } else {
      selectedVoiceEnglish.set(voice);
    }
  }

  function clearFilters() {
    languageCodeFilter = '';
    nameFilter = '';
    genderFilter = '';
  }

  function switchMode(mode: 'foreign' | 'english') {
    selectionMode = mode;
    
    // Update test text based on selected mode
    if (mode === 'foreign') {
      testText = 'Hallo, dies ist ein Test für die ausgewählte Stimme.';
    } else {
      testText = 'Hello, this is a test for the selected voice.';
    }
  }

  async function testVoice() {
    const selectedVoice = selectionMode === 'foreign' ? $selectedVoiceForeign : $selectedVoiceEnglish;
    if (!selectedVoice) return;
    
    testingVoice = true;
    
    try {
      const response = await fetch('/api/tts/test-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: testText,
          voice: selectedVoice
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to test voice: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.audioContent) {
        // Create audio source from base64 data
        audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
        
        // Play the audio
        if (audioElement) {
          audioElement.load();
          audioElement.play();
        }
      } else {
        throw new Error('No audio content received');
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to test voice';
    } finally {
      testingVoice = false;
    }
  }
</script>

<div class="voice-selector">
  <h2>Voice Selector</h2>
  
  <div class="mode-selector">
    <button 
      class:active={selectionMode === 'foreign'} 
      onclick={() => switchMode('foreign')}
    >
      Foreign Language Voice
    </button>
    <button 
      class:active={selectionMode === 'english'} 
      onclick={() => switchMode('english')}
    >
      English Voice
    </button>
  </div>
  
  {#if loading}
    <div class="loading">Loading voices...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else}
    <div class="filters">
      <div class="filter-group">
        <label for="language-filter">Language:</label>
        <select id="language-filter" bind:value={languageCodeFilter}>
          <option value="">All Languages</option>
          {#each uniqueLanguageCodes as code}
            <option value={code}>{code}</option>
          {/each}
        </select>
      </div>
      
      <div class="filter-group">
        <label for="name-filter">Name:</label>
        <input 
          id="name-filter" 
          type="text" 
          placeholder="Search by name" 
          bind:value={nameFilter}
        />
      </div>
      
      <div class="filter-group">
        <label for="gender-filter">Gender:</label>
        <select id="gender-filter" bind:value={genderFilter}>
          <option value="">All Genders</option>
          {#each uniqueGenders as gender}
            <option value={gender}>{gender}</option>
          {/each}
        </select>
      </div>
      
      <button onclick={clearFilters} class="clear-button">Clear Filters</button>
    </div>
    
    <div class="results-info">
      Showing {filteredVoices.length} of {voices.length} voices
    </div>
    
    <div class="voice-list">
      {#each filteredVoices as voice (voice.name)}
        <button 
          class="voice-item" 
          class:selected={
            (selectionMode === 'foreign' && $selectedVoiceForeign?.name === voice.name) || 
            (selectionMode === 'english' && $selectedVoiceEnglish?.name === voice.name)
          }
          onclick={() => selectVoice(voice)}
        >
          <div class="voice-name">{voice.name}</div>
          <div class="voice-details">
            <span class="language">{voice.languageCodes.join(', ')}</span>
            <span class="gender">{voice.ssmlGender}</span>
          </div>
        </button>
      {/each}
    </div>
    
    {#if filteredVoices.length === 0}
      <div class="no-results">No voices match your filters</div>
    {/if}
  {/if}
  
  <div class="selected-voices">
    {#if $selectedVoiceForeign}
      <div class="selected-voice">
        <h3>Selected Foreign Voice</h3>
        <div class="voice-name">{$selectedVoiceForeign.name}</div>
        <div class="voice-details">
          <span>Language: {$selectedVoiceForeign.languageCodes.join(', ')}</span>
          <span>Gender: {$selectedVoiceForeign.ssmlGender}</span>
        </div>
        
        {#if selectionMode === 'foreign'}
          <div class="voice-test">
            <h4>Test Voice</h4>
            <div class="test-controls">
              <input 
                type="text" 
                bind:value={testText} 
                placeholder="Enter text to test voice" 
                class="test-input"
              />
              <button 
                onclick={testVoice} 
                class="test-button"
                disabled={testingVoice || !testText}
              >
                {testingVoice ? 'Testing...' : 'Test Voice'}
              </button>
            </div>
            
            {#if audioSrc && selectionMode === 'foreign'}
              <div class="audio-player">
                <audio bind:this={audioElement} controls src={audioSrc}></audio>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
    
    {#if $selectedVoiceEnglish}
      <div class="selected-voice">
        <h3>Selected English Voice</h3>
        <div class="voice-name">{$selectedVoiceEnglish.name}</div>
        <div class="voice-details">
          <span>Language: {$selectedVoiceEnglish.languageCodes.join(', ')}</span>
          <span>Gender: {$selectedVoiceEnglish.ssmlGender}</span>
        </div>
        
        {#if selectionMode === 'english'}
          <div class="voice-test">
            <h4>Test Voice</h4>
            <div class="test-controls">
              <input 
                type="text" 
                bind:value={testText} 
                placeholder="Enter text to test voice" 
                class="test-input"
              />
              <button 
                onclick={testVoice} 
                class="test-button"
                disabled={testingVoice || !testText}
              >
                {testingVoice ? 'Testing...' : 'Test Voice'}
              </button>
            </div>
            
            {#if audioSrc && selectionMode === 'english'}
              <div class="audio-player">
                <audio bind:this={audioElement} controls src={audioSrc}></audio>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .voice-selector {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }
  
  .mode-selector {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .mode-selector button {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #ddd;
    background-color: #f5f5f5;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  }
  
  .mode-selector button.active {
    background-color: #2196f3;
    color: white;
    border-color: #0b7dda;
  }
  
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background-color: #f5f5f5;
    border-radius: 4px;
  }
  
  .filter-group {
    display: flex;
    flex-direction: column;
    min-width: 200px;
  }
  
  label {
    margin-bottom: 0.25rem;
    font-weight: bold;
  }
  
  input, select {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .clear-button {
    align-self: flex-end;
    background-color: #f44336;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 1.5rem;
  }
  
  .voice-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .voice-item {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .voice-item:hover {
    background-color: #f0f0f0;
    transform: translateY(-2px);
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  }
  
  .voice-item.selected {
    background-color: #e3f2fd;
    border-color: #2196f3;
  }
  
  .voice-name {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  
  .voice-details {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #666;
  }
  
  .loading, .error, .no-results {
    text-align: center;
    padding: 2rem;
    color: #666;
  }
  
  .error {
    color: #f44336;
  }
  
  .results-info {
    margin: 1rem 0;
    font-size: 0.9rem;
    color: #666;
  }
  
  .selected-voices {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .selected-voice {
    padding: 1rem;
    background-color: #e3f2fd;
    border-radius: 4px;
  }
  
  .selected-voice h3 {
    margin-top: 0;
  }
  
  .selected-voice .voice-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .voice-test {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #ccc;
  }
  
  .voice-test h4 {
    margin-top: 0;
    margin-bottom: 0.5rem;
  }
  
  .test-controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .test-input {
    flex-grow: 1;
  }
  
  .test-button {
    background-color: #2196f3;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .test-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  
  .test-button:not(:disabled):hover {
    background-color: #0b7dda;
  }
  
  .audio-player {
    margin-top: 1rem;
  }
  
  audio {
    width: 100%;
  }
</style> 