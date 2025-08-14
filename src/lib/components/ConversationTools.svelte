<script lang="ts">
  import DictionaryPanel from '$lib/components/DictionaryPanel.svelte';
  import TranslationAssistent from '$lib/components/TranslationAssistent.svelte';
  import SpellcheckAssistent from '$lib/components/SpellcheckAssistent.svelte';

  interface ToolConfig {
    id: string;
    title: string;
    open: boolean;
    lastOpen?: boolean; // Track previous open state
  }

  const { wordsFile = 'B1.txt', messageText = '' } = $props<{ wordsFile?: string; messageText?: string }>();

  let tools = $state<ToolConfig[]>([
    { id: 'dictionary', title: 'Dictionary', open: true, lastOpen: true },
    { id: 'translation-assistent', title: 'TranslationAssistent', open: false, lastOpen: false },
    { id: 'spellcheck-assistent', title: 'SpellcheckAssistent', open: false, lastOpen: false },
  ]);

  function toggle(toolId: string) {
    tools = tools.map((t) => {
      if (t.id === toolId) {
        const newOpen = !t.open;
        return { ...t, open: newOpen, lastOpen: t.open ? true : t.lastOpen };
      }
      return t;
    });
  }
</script>

<aside class="tools">
  {#each tools as tool (tool.id)}
    <section class="tool" class:open={tool.open}>
      <button class="tool-header" type="button" aria-expanded={tool.open} onclick={() => toggle(tool.id)}>
        <span class="title">{tool.title}</span>
        <span class="chev" aria-hidden="true">{tool.open ? '▾' : '▸'}</span>
      </button>
      {#if tool.open}
        <div class="tool-body">
          {#if tool.id === 'dictionary'}
            <DictionaryPanel wordsFile={wordsFile} />
          {:else if tool.id === 'translation-assistent'}
            <TranslationAssistent wordsFile={wordsFile} />
          {:else if tool.id === 'spellcheck-assistent'}
            <SpellcheckAssistent messageText={messageText} />
          {/if}
        </div>
      {/if}
    </section>
  {/each}
</aside>

<style>
  .tools {
    display: flex;
    flex-direction: column;
    border-left: 1px solid #ddd;
    width: 340px;
    min-width: 280px;
    max-width: 480px;
    height: 100%;
    background: #fff;
    overflow: hidden;
  }
  .tool { 
    display: flex; 
    flex-direction: column; 
    min-height: 0;
  }
  
  .tool.open {
    flex: 1; /* Only expanded tools take up flex space */
  }
  
  .tool:not(.open) {
    flex: 0 0 auto; /* Collapsed tools take minimal space */
  }
  .tool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.8rem;
    background: #f7f7f8;
    border: none;
    border-bottom: 1px solid #e6e6e6;
    cursor: pointer;
    text-align: left;
  }
  .tool-header .title { font-weight: 600; }
  .tool-body {
    flex: 1;
    min-height: 0; /* allow children to scroll */
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  /* Make inner panels use the available height */
  .tool-body :global(.panel) {
    height: 100%;
  }
</style>


