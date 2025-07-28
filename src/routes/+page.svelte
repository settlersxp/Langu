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

	let decks: Deck[] = $state([
		{
			id: 1,
			name: 'English Vocabulary',
			description: 'Basic English vocabulary cards',
			playCount: 0
		},
		{ id: 2, name: 'Spanish Verbs', description: 'Common Spanish verb conjugations', playCount: 0 },
		{ id: 3, name: 'French Phrases', description: 'Everyday French expressions', playCount: 0 }
	]);

	const flipDurationMs = 200;

	function addDeck() {
		const newId = Math.max(0, ...decks.map((d) => d.id)) + 1;
		decks = [
			...decks,
			{
				id: newId,
				name: 'New Deck',
				description: 'Click to edit',
				playCount: 0
			}
		];
	}

	function removeDeck(deckId: number) {
		decks = decks.filter((deck) => deck.id !== deckId);
	}

	function handleDndEvent(e: CustomEvent<{ items: Deck[] }>) {
		decks = e.detail.items;
	}
</script>

<div class="deck-management">
	<h1>My Decks</h1>
	<button onclick={addDeck}>Add Deck</button>

	<section
		use:dndzone={{ items: decks, flipDurationMs, type: 'decks' }}
		onconsider={handleDndEvent}
		onfinalize={handleDndEvent}
		class="decks-container"
	>
		{#each decks as deck (deck.id)}
			<div animate:flip={{ duration: flipDurationMs }}>
				<DeckComponent {deck} onRemove={() => removeDeck(deck.id)} />
			</div>
		{/each}
	</section>
</div>

<style>
	.deck-management {
		padding: 1rem;
		max-width: 800px;
		margin: 0 auto;
	}

	button {
		background-color: #4caf50;
		color: white;
		padding: 10px 15px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		margin-bottom: 1rem;
	}

	button:hover {
		background-color: #45a049;
	}

	.decks-container {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}
</style>
