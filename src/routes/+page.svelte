<script lang="ts">
	/*
    This page displays a list of decks.
    It allows users to add, remove, and reorder decks through drag-and-drop functionality.

    The page uses the DeckComponent to display each deck.
    The page uses the dndzone action to handle the drag-and-drop functionality.
    */

	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import type { Deck } from '$lib/database/schema';
	import DeckComponent from '$lib/components/DeckComponent.svelte';
	import VoiceSelector from '$lib/components/VoiceSelector.svelte';
	import { selectedVoiceForeign } from '$lib/stores/voiceStore';
	import { onMount } from 'svelte';

	let decks: Deck[] = $state([]);

	const flipDurationMs = 200;
	let showVoiceSelector = $state(false);

// Dictionary builder form state
let pdfFilename = $state('A1_SD1_Wortliste_02.pdf');
let minLen = $state(3);
const allowedPosOptions = ['NOUN', 'VERB', 'ADJ', 'ADV'] as const;
let allowedPosSelected = $state(new Set<string>(allowedPosOptions));
let saveOutput = $state(true);
let outFile = $state('curated_words.txt');
let returnLimit = $state(100);
let refreshEmbeddings = $state(false);

// Result state
let isBuilding = $state(false);
let buildError: string | null = $state(null);
let buildResultCount: number | null = $state(null);
let buildWords: string[] = $state([]);

	onMount(async () => {
		const response = await fetch('/api/decks');
		const data = await response.json();
		decks = data;
	});

	function addDeck() {
		decks = [
			...decks,
			{
				id: 0,
				name: 'New Deck',
				description: 'Click to edit',
				playCount: 0,
				languageCode: 'de',
				languageName: 'German'
			}
		];
	}

	async function removeDeck(deckId: number) {
		const response = await fetch(`/api/decks/${deckId}`, {
			method: 'DELETE'
		});
		if (response.ok) {
			decks = decks.filter((deck) => deck.id !== deckId);
		} else {
			console.error('Failed to remove deck');
		}
	}

	function handleDndEvent(e: CustomEvent<{ items: Deck[] }>) {
		decks = e.detail.items;
	}

	function toggleVoiceSelector() {
		showVoiceSelector = !showVoiceSelector;
	}

	function handleUpdate(updatedDeck: Deck) {
		decks = decks.map((deck) => deck.id === updatedDeck.id ? updatedDeck : deck);
	}

function toggleAllowedPos(tag: string) {
    const next = new Set(allowedPosSelected);
    if (next.has(tag)) {
        next.delete(tag);
    } else {
        next.add(tag);
    }
    allowedPosSelected = next;
}

async function submitBuildDictionary(e: Event) {
    e.preventDefault();
    isBuilding = true;
    buildError = null;
    buildResultCount = null;
    buildWords = [];

    try {
        const payload = {
            filename: pdfFilename.trim(),
            min_len: Number(minLen) || 3,
            allowed_pos: Array.from(allowedPosSelected),
            save: Boolean(saveOutput),
            out_file: outFile.trim() || 'curated_words.txt',
            return_limit: Number(returnLimit) || 0,
            refresh_embeddings: Boolean(refreshEmbeddings)
        };

        const resp = await fetch('http://localhost:5004/build-dictionary-from-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();
        if (!resp.ok) {
            buildError = data?.error || 'Failed to build dictionary';
        } else {
            buildResultCount = data?.count ?? 0;
            buildWords = Array.isArray(data?.words) ? data.words : [];
        }
    } catch (err: any) {
        buildError = err?.message || String(err);
    } finally {
        isBuilding = false;
    }
}
</script>

<div class="main-container">
	<div class="deck-management">
		<div class="header-section">
			<h1>My Decks</h1>
			<div class="action-buttons">
				<button onclick={addDeck} class="add-button">Add Deck</button>
				<button onclick={toggleVoiceSelector} class="voice-button">
					{showVoiceSelector ? 'Hide Voice Selector' : 'Select Voice'}
					{#if $selectedVoiceForeign}
						<span class="selected-indicator">✓</span>
					{/if}
				</button>
			</div>
		</div>

        <div class="dictionary-builder">
            <h2>Build Dictionary from PDF</h2>
            <form onsubmit={submitBuildDictionary} class="dict-form">
                <div class="row">
                    <label for="pdf-filename">PDF filename</label>
                    <input
                        type="text"
                        placeholder="A1_SD1_Wortliste_02.pdf"
                        id="pdf-filename"
                        value={pdfFilename}
                        oninput={(e) => (pdfFilename = (e.target as HTMLInputElement).value)}
                    />
                </div>

                <div class="row two-col">
                    <div>
                        <label for="min-len">Min token length</label>
                        <input
                            type="number"
                            min={1}
                            id="min-len"
                            value={minLen}
                            oninput={(e) => (minLen = parseInt((e.target as HTMLInputElement).value || '3'))}
                        />
                    </div>
                    <div>
                        <label for="return-limit">Return limit (0 = all)</label>
                        <input
                            type="number"
                            min={0}
                            id="return-limit"
                            value={returnLimit}
                            oninput={(e) => (returnLimit = parseInt((e.target as HTMLInputElement).value || '0'))}
                        />
                    </div>
                </div>

                <div class="row">
                    <div class="group-label">Allowed POS</div>
                    <div class="pos-grid">
                        {#each allowedPosOptions as pos}
                            <label class="pos-item">
                                <input
                                    type="checkbox"
                                    checked={allowedPosSelected.has(pos)}
                                    onclick={() => toggleAllowedPos(pos)}
                                />
                                <span>{pos}</span>
                            </label>
                        {/each}
                    </div>
                </div>

                <div class="row two-col">
                    <label class="toggle">
                        <input type="checkbox" checked={saveOutput} onclick={() => (saveOutput = !saveOutput)} />
                        <span>Save to file</span>
                    </label>
                    <label class="toggle">
                        <input type="checkbox" checked={refreshEmbeddings} onclick={() => (refreshEmbeddings = !refreshEmbeddings)} />
                        <span>Refresh embeddings</span>
                    </label>
                </div>

                <div class="row">
                    <label for="out-file">Output filename</label>
                    <input
                        type="text"
                        placeholder="curated_words.txt"
                        id="out-file"
                        value={outFile}
                        disabled={!saveOutput}
                        oninput={(e) => (outFile = (e.target as HTMLInputElement).value)}
                    />
                </div>

                <div class="row">
                    <button type="submit" class="build-btn" disabled={isBuilding}>
                        {isBuilding ? 'Building...' : 'Build Dictionary'}
                    </button>
                </div>
            </form>

            {#if buildError}
                <div class="error">{buildError}</div>
            {/if}

            {#if buildResultCount !== null}
                <div class="result">Found {buildResultCount} unique lemmas</div>
                {#if buildWords.length}
                    <div class="words-list">
                        {#each buildWords as w}
                            <span class="word-chip">{w}</span>
                        {/each}
                    </div>
                {/if}
            {/if}
        </div>

		{#if showVoiceSelector}
			<div class="voice-selector-container">
				<VoiceSelector />
			</div>
		{/if}

		<section
			use:dndzone={{ items: decks, flipDurationMs, type: 'decks' }}
			onconsider={handleDndEvent}
			onfinalize={handleDndEvent}
			class="decks-container"
		>
			{#each decks as deck (deck.id)}
				<div animate:flip={{ duration: flipDurationMs }}>
					<DeckComponent 
						{deck} 
						onRemove={() => removeDeck(deck.id)} 
						onUpdate={handleUpdate} 
					/>
				</div>
			{/each}
		</section>
	</div>
</div>

<style>
	.main-container {
		padding: 1rem;
	}

	.deck-management {
		max-width: 800px;
		margin: 0 auto;
	}

	.header-section {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
	}

	button {
		padding: 10px 15px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.add-button {
		background-color: #4caf50;
		color: white;
	}

	.add-button:hover {
		background-color: #45a049;
	}

	.voice-button {
		background-color: #2196f3;
		color: white;
		position: relative;
	}

	.voice-button:hover {
		background-color: #0b7dda;
	}

	.selected-indicator {
		margin-left: 5px;
		font-weight: bold;
	}

	.voice-selector-container {
		margin-bottom: 2rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: white;
	}

	.decks-container {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}
</style>
