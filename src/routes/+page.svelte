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
	import { selectedVoice } from '$lib/stores/voiceStore';
	import { onMount } from 'svelte';

	let decks: Deck[] = $state([]);

	const flipDurationMs = 200;
	let showVoiceSelector = $state(false);

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
</script>

<div class="main-container">
	<div class="deck-management">
		<div class="header-section">
			<h1>My Decks</h1>
			<div class="action-buttons">
				<button onclick={addDeck} class="add-button">Add Deck</button>
				<button onclick={toggleVoiceSelector} class="voice-button">
					{showVoiceSelector ? 'Hide Voice Selector' : 'Select Voice'}
					{#if $selectedVoice}
						<span class="selected-indicator">✓</span>
					{/if}
				</button>
			</div>
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
