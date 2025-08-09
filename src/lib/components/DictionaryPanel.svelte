<script lang="ts">
  const { wordsFile = 'B1.txt' } = $props<{ wordsFile?: string }>();
  let allWords: string[] = $state([]);
  let query: string = $state('');
  let filtered: string[] = $state([]);
  let isLoading = $state(false);
  let error: string | null = $state(null);
  let translations = $state<Record<string, string>>({});

  async function loadWords() {
    try {
      isLoading = true;
      error = null;
      const resp = await fetch(`/api/dictionary?wordsFile=${encodeURIComponent(wordsFile)}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to load dictionary');
      allWords = Array.isArray(data?.words) ? data.words : [];
      translations = (data?.translations && typeof data.translations === 'object') ? data.translations as Record<string, string> : {};
      filterWords();
    } catch (e: any) {
      error = e?.message || String(e);
    } finally {
      isLoading = false;
    }
  }

  function filterWords() {
    const q = query.trim().toLowerCase();
    filtered = q ? allWords.filter((w) => w.includes(q)) : allWords;
  }

  $effect(() => { loadWords(); });
  $effect(() => { filterWords(); });

  async function translate(word: string) {
    try {
      const resp = await fetch('/api/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to translate');
      return data.translation as string;
    } catch (e) {
      return '';
    }
  }

  // Store per-word translations
  async function ensureTranslation(word: string) {
    if (translations[word]) return;
    translations = { ...translations, [word]: '…' };
    const t = await translate(word);
    translations = { ...translations, [word]: t || '' };
  }

  async function translateAll() {
    // naive sequential to avoid overwhelming backend
    for (const w of filtered) {
      if (!translations[w]) {
        await ensureTranslation(w);
      }
    }
  }
</script>

<div class="panel">
  <div class="toolbar">
    <input
      type="text"
      placeholder="Search words…"
      value={query}
      oninput={(e) => { query = (e.target as HTMLInputElement).value; }}
    />
    <span class="meta">{isLoading ? 'Loading…' : `${filtered.length} words`}</span>
    <button class="translate-all" type="button" onclick={translateAll} disabled={isLoading || !filtered.length}>Translate all</button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {:else}
    <div class="list">
      {#each filtered as w}
        <button class="row" type="button" onclick={() => ensureTranslation(w)}>
          <span class="word">{w}</span>
          <span class="translation">{translations[w] ?? ''}</span>
        </button>
      {/each}
    </div>
  {/if}
  
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    border-left: 1px solid #ddd;
    width: 320px;
    min-width: 280px;
    max-width: 420px;
    height: 100%;
    background: #fff;
    overflow: hidden; /* contain internal scroll */
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
  .translate-all {
    padding: 0.45rem 0.6rem;
    border: 1px solid #ccc;
    background: #f8f8f8;
    border-radius: 6px;
    cursor: pointer;
  }
  .meta { color: #666; font-size: 0.9rem; }
  .list { overflow-y: auto; padding: 0.25rem 0.5rem; height: 100%; }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    padding: 0.4rem 0.25rem;
    border-bottom: 1px dashed #eee;
    cursor: pointer;
    background: transparent;
    border: none;
    width: 100%;
    text-align: left;
  }
  .row:hover { background: #fafafa; }
  .word { font-weight: 600; }
  .translation { color: #2a6; }
  .error { color: #b00; padding: 0.5rem; }
</style>


