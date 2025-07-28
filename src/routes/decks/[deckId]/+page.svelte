<script lang="ts">
	/*
    This page displays a deck and its sections.
    It allows users to add, remove, and reorder sections.
    It also allows users to play all sections or a specific section.

    The page uses the SectionComponent to display each section. 
    The page uses the DeckComponent to display the deck.

    The page uses the dndzone action to handle the drag-and-drop functionality.

    */

	import { dndzone } from 'svelte-dnd-action';
	import { onMount } from 'svelte';
	import type { Section } from '$lib/database/schema';
	import SectionComponent from '$lib/components/SectionComponent.svelte';

	// State variables
	let sections: Section[] = $state([]);
	let deckName = $state('');
	let deckDescription = $state('');
	let deckId: number;

	// Get the deck ID from the URL parameter
	onMount(async () => {
		// In a real app, you would fetch the deck and its sections from the database
		// For now, we'll just use placeholder data
		deckId = parseInt(window.location.pathname.split('/').pop() || '0', 10);

		// Placeholder data - in a real app, fetch from API/database
		sections = [
			{
				id: 1,
				deckId: deckId,
				foreignText: 'Bonjour',
				englishText: 'Hello',
				audioPath: '',
				position: 0
			},
			{
				id: 2,
				deckId: deckId,
				foreignText: 'Au revoir',
				englishText: 'Goodbye',
				audioPath: '',
				position: 1
			},
			{
				id: 3,
				deckId: deckId,
				foreignText: 'Merci',
				englishText: 'Thank you',
				audioPath: '',
				position: 2
			}
		];

		deckName = 'French Basics';
		deckDescription = 'Learn basic French greetings';
	});

	function addSection() {
		// Create new section in current deck
		const newSection: Section = {
			id: Date.now(), // Use timestamp as temporary ID
			deckId: deckId,
			foreignText: '',
			englishText: '',
			audioPath: '',
			position: sections.length
		};

		sections = [...sections, newSection];
	}

	function removeSection(sectionId: number) {
		// Remove specific section
		sections = sections.filter((section) => section.id !== sectionId);
	}

	function handleDndConsider(e: CustomEvent) {
		// Handle section reordering during drag
		sections = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent) {
		// Handle section reordering when drop is finalized
		sections = e.detail.items;

		// Update positions based on new order
		sections = sections.map((section, index) => ({
			...section,
			position: index
		}));
	}

	function playSection(section: Section) {
		// Play audio for specific section
		console.log('Playing section:', section.foreignText);
		// In a real app, you would play the audio file
	}

	function playAllSections() {
		// Sequentially play all sections
		console.log('Playing all sections');
		// In a real app, you would play all audio files sequentially
	}
</script>

<div class="deck-container">
	<h1>{deckName}</h1>
	<p>{deckDescription}</p>

	<div class="section-management">
		<button onclick={addSection}>Add Section</button>
		<button onclick={playAllSections}>Play All</button>

		<div
			use:dndzone={{ items: sections, flipDurationMs: 300 }}
			onconsider={handleDndConsider}
			onfinalize={handleDndFinalize}
			class="sections-container"
		>
			{#each sections as section (section.id)}
				<div class="section-wrapper">
					<SectionComponent
						{section}
						onRemove={() => removeSection(section.id)}
						onPlay={() => playSection(section)}
					/>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.deck-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}

	p {
		color: #666;
		margin-bottom: 2rem;
	}

	.section-management {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	button {
		padding: 0.5rem 1rem;
		background-color: #3498db;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		margin-right: 0.5rem;
	}

	button:hover {
		background-color: #2980b9;
	}

	.sections-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1rem;
	}

	.section-wrapper {
		background-color: #f9f9f9;
		border-radius: 4px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		cursor: move;
	}
</style>
