<script lang="ts">
  import { getRelevantWords } from '$lib/services/smartWordSelector';
  import AudioControls from '$lib/components/AudioControls.svelte';
  import { selectedVoiceForeign } from '$lib/stores/voiceStore';

  interface TranslationResult {
    output: string;
  }

  const { wordsFile = 'B1.txt' } = $props<{ wordsFile?: string }>();

  let englishText = $state('');
  let translation = $state('');
  let adapted = $state('');
  let confidence: number | null = $state(null);
  let isTranslating = $state(false);
  let isAdapting = $state(false);
  let error: string | null = $state(null);

  // TTS state
  let ttsText = $state('');
  let isGeneratingAudio = $state(false);
  let isPlaying = $state(false);
  let isPaused = $state(false);
  let audioUrl = $state<string | null>(null);
  let audioEl = $state<HTMLAudioElement | null>(null);

  async function translate() {
    if (!englishText.trim()) return;
    error = null;
    isTranslating = true;
    adapted = '';
    confidence = null;
    try {
      const resp = await fetch('/api/translation-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'translate', text: englishText, wordsFile })
      });
      const data: TranslationResult = await resp.json();
      if (!resp.ok) throw new Error((data as any)?.error || 'Failed to translate');
      translation = data.output || '';
      // Validate confidence
      const val = await fetch('/api/word-selector/validate-phrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: translation, words_file: wordsFile })
      });
      if (val.ok) {
        const result = await val.json();
        confidence = typeof result?.percentage === 'number' ? result.percentage : (result?.response_validation?.percentage ?? null);
      } else {
        confidence = null;
      }
    } catch (e: any) {
      error = e?.message || String(e);
    } finally {
      isTranslating = false;
    }
  }

  async function addapt() {
    if (!translation) return;
    error = null;
    isAdapting = true;
    adapted = '';
    try {
      // Get relevant words using the same technique as chat
      const relevant = await getRelevantWords(englishText, 80, wordsFile);
      const resp = await fetch('/api/translation-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'adapt', text: translation, wordsFile, relevantWords: relevant })
      });
      const data: TranslationResult = await resp.json();
      if (!resp.ok) throw new Error((data as any)?.error || 'Failed to adapt');
      adapted = data.output || '';
    } catch (e: any) {
      error = e?.message || String(e);
    } finally {
      isAdapting = false;
    }
  }

  async function readWithChirp() {
    const text = ttsText.trim();
    if (!text) return;
    isGeneratingAudio = true;
    isPlaying = false;
    isPaused = false;
    try {
      const voiceName = $selectedVoiceForeign?.name || 'de-DE-Wavenet-D';
      const resp = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceName })
      });
      if (!resp.ok) throw new Error('Failed to synthesize speech');
      const blob = await resp.blob();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      audioUrl = URL.createObjectURL(blob);
      // Prepare audio element
      if (!audioEl) {
        audioEl = new Audio();
      }
      audioEl.src = audioUrl;
      audioEl.onended = () => { isPlaying = false; isPaused = false; };
      audioEl.onerror = () => { isPlaying = false; isPaused = false; };
      await audioEl.play();
      isPlaying = true;
      isPaused = false;
    } catch (e) {
      // ignore; error banner elsewhere if needed
    } finally {
      isGeneratingAudio = false;
    }
  }

  function togglePlayPause() {
    if (!audioEl) return;
    if (isPlaying) {
      audioEl.pause();
      isPlaying = false;
      isPaused = true;
    } else {
      audioEl.play();
      isPlaying = true;
      isPaused = false;
    }
  }

  function replayAudio() {
    if (!audioEl) return;
    audioEl.currentTime = 0;
    audioEl.play();
    isPlaying = true;
    isPaused = false;
  }
</script>

<div class="panel">
  <div class="toolbar">
    <input
      type="text"
      placeholder="Enter English phrase…"
      value={englishText}
      oninput={(e) => { englishText = (e.target as HTMLInputElement).value; }}
    />
    <button type="button" class="btn" onclick={translate} disabled={isTranslating || !englishText.trim()}>
      {isTranslating ? 'Translating…' : 'Translate'}
    </button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if translation}
    <div class="result">
      <div class="row">
        <span class="label">German</span>
        <div class="text">{translation}</div>
      </div>
      <div class="meta-row">
        <span class="confidence">Confidence: {confidence == null ? '—' : `${Math.round(confidence)}%`}</span>
        {#if confidence != null && confidence < 60}
          <button type="button" class="btn secondary" onclick={addapt} disabled={isAdapting}>
            {isAdapting ? 'Adapting…' : 'Addapt'}
          </button>
        {/if}
      </div>
    </div>
  {/if}

  {#if adapted}
    <div class="result adapted">
      <div class="row">
        <span class="label">Rewritten</span>
        <div class="text">{adapted}</div>
      </div>
    </div>
  {/if}

  <div class="tts">
    <div class="tts-row">
      <input
        type="text"
        placeholder="Enter German phrase to read…"
        value={ttsText}
        oninput={(e) => { ttsText = (e.target as HTMLInputElement).value; }}
      />
      <button class="btn" type="button" onclick={readWithChirp} disabled={isGeneratingAudio || !ttsText.trim()}>
        {isGeneratingAudio ? 'Generating…' : 'Read'}
      </button>
    </div>
    {#if audioUrl}
      <div class="tts-controls">
        <AudioControls isPlaying={isPlaying} onPlayPause={togglePlayPause} onReplay={replayAudio} />
      </div>
    {/if}
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    border-left: 1px solid #ddd;
    height: 100%;
    background: #fff;
    overflow: hidden;
  }
  .toolbar {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
    position: sticky;
    top: 0;
    background: #fff;
    z-index: 1;
  }
  .toolbar input {
    flex: 1;
    padding: 0.5rem 0.6rem;
    border: 1px solid #ccc;
    border-radius: 6px;
  }
  .btn {
    padding: 0.45rem 0.6rem;
    border: 1px solid #ccc;
    background: #f8f8f8;
    border-radius: 6px;
    cursor: pointer;
  }
  .btn.secondary { background: #eef5ff; border-color: #bcd; }
  .result { padding: 0.75rem; }
  .row { display: grid; grid-template-columns: 96px 1fr; gap: 0.75rem; align-items: start; }
  .label { font-weight: 600; color: #444; }
  .text { white-space: pre-wrap; }
  .meta-row { display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; color: #666; }
  .error { color: #b00; padding: 0.5rem; }
  .adapted { border-top: 1px dashed #eee; }
  .tts { margin-top: 0.75rem; padding: 0.5rem 0.75rem; border-top: 1px solid #eee; }
  .tts-row { display: flex; gap: 0.5rem; align-items: center; }
  .tts-row input { flex: 1; padding: 0.5rem 0.6rem; border: 1px solid #ccc; border-radius: 6px; }
  .tts-controls { margin-top: 0.5rem; }
</style>


