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
	import type { Section, Deck } from '$lib/database/schema';
	import SectionComponent from '$lib/components/SectionComponent.svelte';

	// State variables
	let sections: Section[] = $state([]);
	let deck: Deck | null = $state(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deckId: number;
	let selectedVoice: JSON | null = $state(null);

	// Get the deck ID from the URL parameter and fetch data
	onMount(async () => {
		// Get the selected voice from the browser's cache under the key "selectedVoice"
		selectedVoice = JSON.parse(localStorage.getItem('selectedVoice') || '{}');
		
		try {
			// Get deck ID from URL
			deckId = parseInt(window.location.pathname.split('/').pop() || '0', 10);
			
			if (isNaN(deckId)) {
				throw new Error('Invalid deck ID');
			}
			
			// Fetch deck data
			const deckResponse = await fetch(`/api/decks/${deckId}`);
			if (!deckResponse.ok) {
				throw new Error(`Failed to fetch deck: ${deckResponse.statusText}`);
			}
			deck = await deckResponse.json();
			
			// Fetch sections
			const sectionsResponse = await fetch(`/api/sections?deckId=${deckId}`);
			if (!sectionsResponse.ok) {
				throw new Error(`Failed to fetch sections: ${sectionsResponse.statusText}`);
			}
			sections = await sectionsResponse.json();
			
			loading = false;
		} catch (err) {
			console.error('Error loading deck data:', err);
			error = err instanceof Error ? err.message : 'Failed to load deck data';
			loading = false;
		}
	});

	async function addSection() {
		try {
			// Create new section with default values
			const newSection = {
				deckId,
				foreignText: 'New phrase',
				englishText: 'Translation',
				audioPath: ''
			};
			
			// Send to API
			const response = await fetch('/api/sections', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newSection)
			});
			
			if (!response.ok) {
				throw new Error(`Failed to create section: ${response.statusText}`);
			}
			
			// Add the newly created section to the list
			const createdSection = await response.json();
			sections = [...sections, createdSection];
		} catch (err) {
			console.error('Error adding section:', err);
			alert('Failed to add section');
		}
	}

	async function removeSection(sectionId: number) {
		try {
			// Delete from API
			const response = await fetch(`/api/sections/${sectionId}`, {
				method: 'DELETE'
			});
			
			if (!response.ok) {
				throw new Error(`Failed to delete section: ${response.statusText}`);
			}
			
			// Remove from local state
			sections = sections.filter((section) => section.id !== sectionId);
		} catch (err) {
			console.error('Error removing section:', err);
			alert('Failed to remove section');
		}
	}

	function handleDndConsider(e: CustomEvent) {
		// Handle section reordering during drag
		sections = e.detail.items;
	}

	async function handleDndFinalize(e: CustomEvent) {
		// Handle section reordering when drop is finalized
		const newSections = e.detail.items;
		sections = newSections;
		
		// Update positions based on new order
		try {
			for (let i = 0; i < newSections.length; i++) {
				const section = newSections[i];
				if (section.position !== i) {
					// Update position in API
					await fetch(`/api/sections/${section.id}`, {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ position: i })
					});
					
					// Update local state
					section.position = i;
				}
			}
		} catch (err) {
			console.error('Error updating section positions:', err);
			alert('Failed to update section positions');
		}
	}

	async function playSection(section: Section) {
		try {
			// Play audio for specific section using the API. 
			const response = await fetch(`/api/sections/${section.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ voice: selectedVoice })
			});
			
			if (!response.ok) {
				throw new Error(`Failed to play audio: ${response.statusText}`);
			}
			
			// Create an audio element and play the returned audio
			const audioBlob = await response.blob();
			const audioUrl = URL.createObjectURL(audioBlob);
			const audio = new Audio(audioUrl);
			audio.play();
			
			// Clean up URL object after playback
			audio.onended = () => {
				URL.revokeObjectURL(audioUrl);
			};
		} catch (err) {
			console.error('Error playing section:', err);
			alert('Failed to play audio');
		}
	}

	async function playAllSections() {
		// Play sections in sequence
		try {
			// Sort sections by position to ensure correct order
			const sortedSections = [...sections].sort((a, b) => a.position - b.position);
			
			// Play each section with a delay between them
			for (const section of sortedSections) {
				await new Promise<void>((resolve) => {
					// Play the current section
					fetch(`/api/sections/${section.id}`, { method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ voice: selectedVoice })
					})
						.then(response => {
							if (!response.ok) {
								throw new Error(`Failed to play audio: ${response.statusText}`);
							}
							return response.blob();
						})
						.then(audioBlob => {
							const audioUrl = URL.createObjectURL(audioBlob);
							const audio = new Audio(audioUrl);
							
							// When audio ends, resolve promise and move to next section
							audio.onended = () => {
								URL.revokeObjectURL(audioUrl);
								resolve();
							};
							
							// If audio fails to play, still move on
							audio.onerror = () => {
								URL.revokeObjectURL(audioUrl);
								resolve();
							};
							
							audio.play();
						})
						.catch(err => {
							console.error(`Error playing section ${section.id}:`, err);
							resolve(); // Continue with next section even if this one fails
						});
				});
				
				// Add a small pause between sections
				await new Promise(resolve => setTimeout(resolve, 500));
			}
		} catch (err) {
			console.error('Error playing all sections:', err);
			alert('Failed to play all sections');
		}
	}
</script>

<div class="deck-container">
	{#if loading}
		<div class="loading">Loading deck data...</div>
	{:else if error}
		<div class="error">Error: {error}</div>
	{:else if deck}
		<h1>{deck.name}</h1>
		<p>{deck.description || 'No description'}</p>

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
			
			{#if sections.length === 0}
				<div class="empty-state">
					No sections in this deck. Add a section to get started.
				</div>
			{/if}
		</div>
	{:else}
		<div class="error">Deck not found</div>
	{/if}
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
	
	.loading, .error, .empty-state {
		padding: 2rem;
		text-align: center;
		background-color: #f9f9f9;
		border-radius: 4px;
		margin-top: 1rem;
	}
	
	.error {
		color: #e74c3c;
		background-color: #fadbd8;
	}
	
	.empty-state {
		color: #7f8c8d;
	}
</style>
