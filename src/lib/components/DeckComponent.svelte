<script lang="ts">
	import type { Deck } from '$lib/database/schema';
	import EditDeckComponent from './EditDeckComponent.svelte';
	interface Props {
		deck: Deck;
		onRemove: () => void;
		onUpdate: (updatedDeck: Deck) => void;
	}

	let { deck, onRemove, onUpdate }: Props = $props();

	let editDeck = $state(false);

	function handleUpdate(updatedDeck: Deck) {
		deck = updatedDeck;
		onUpdate(updatedDeck);
		editDeck = false;
	}

	function handleClose() {
		editDeck = false;
	}
</script>

<div class="deck-card">
	<div class="deck-header">
		<h3>{deck.name}</h3>
		<button class="remove-btn" onclick={onRemove}>×</button>
	</div>
	<p class="description">{deck.description || 'No description'}</p>
	<div class="deck-footer">
		<span class="play-count">Played {deck.playCount} times</span>
		<a href="/decks/{deck.id}" class="view-btn">Open</a>
		<button class="edit-btn" onclick={() => editDeck = true}>Edit</button>
	</div>
</div>

{#if editDeck}
	<EditDeckComponent 
		deck={deck} 
		update={handleUpdate}
		close={handleClose}
	/>
{/if}

<style>
	.deck-card {
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 1rem;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		cursor: grab;
		user-select: none;
	}

	.deck-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.deck-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	h3 {
		margin: 0;
		font-size: 1.2rem;
		color: #333;
	}

	.remove-btn {
		background: none;
		border: none;
		color: #ff5252;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.description {
		color: #666;
		font-size: 0.9rem;
		margin-bottom: 1rem;
		min-height: 2.5em;
	}

	.deck-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.8rem;
	}

	.play-count {
		color: #888;
	}

	.view-btn {
		background-color: #4caf50;
		color: white;
		padding: 0.3rem 0.6rem;
		border-radius: 4px;
		text-decoration: none;
		font-weight: 500;
	}

	.view-btn:hover {
		background-color: #45a049;
	}

	.edit-btn {
		background-color: #2196f3;
		color: white;
		padding: 0.3rem 0.6rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 500;
	}

	.edit-btn:hover {
		background-color: #0b7dda;
	}
</style>
