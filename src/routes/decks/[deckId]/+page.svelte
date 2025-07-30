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
	import type { Voice } from '$lib/models/language';

	// State variables
	let sections: Section[] = $state([]);
	let deck: Deck | null = $state(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deckId: number;
	let selectedVoiceForeign: Voice | null = $state(null);
	let selectedVoiceEnglish: Voice | null = $state(null);
	let isPlayingAll = $state(false);

	// Get the deck ID from the URL parameter and fetch data
	onMount(async () => {
		// Get the selected voices from the browser's cache
		try {
			selectedVoiceForeign = JSON.parse(localStorage.getItem('selectedVoiceForeign') || 'null');
			selectedVoiceEnglish = JSON.parse(localStorage.getItem('selectedVoiceEnglish') || 'null');
		} catch (e) {
			console.error('Error parsing voice data from localStorage:', e);
		}
		
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

	async function playSection(section: Section, language: 'foreign' | 'english' | 'both') {
		try {
			if (language === 'both') {
				await playBothLanguages(section);
			} else {
				// Select the appropriate voice based on language
				const voice = language === 'foreign' ? selectedVoiceForeign : selectedVoiceEnglish;
				
				if (!voice) {
					throw new Error(`No ${language} voice selected. Please select a voice in the Voice Selector.`);
				}
				
				// Play audio for specific section using the API
				const response = await fetch(`/api/sections/${section.id}`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ 
						voice,
						language
					})
				});
				
				if (!response.ok) {
					throw new Error(`Failed to play audio: ${response.statusText}`);
				}
				
				// Create an audio element and play the returned audio
				const audioBlob = await response.blob();
				const audioUrl = URL.createObjectURL(audioBlob);
				const audio = new Audio(audioUrl);
				
				await new Promise<void>((resolve) => {
					audio.onended = () => {
						URL.revokeObjectURL(audioUrl);
						resolve();
					};
					
					audio.onerror = () => {
						URL.revokeObjectURL(audioUrl);
						resolve();
					};
					
					audio.play().catch(() => {
						URL.revokeObjectURL(audioUrl);
						resolve();
					});
				});
			}
		} catch (err) {
			console.error('Error playing section:', err);
			alert(err instanceof Error ? err.message : 'Failed to play audio');
		}
	}
	
	// Play both languages in sequence with a pause between them
	async function playBothLanguages(section: Section) {
		if (!selectedVoiceForeign || !selectedVoiceEnglish) {
			alert('Both foreign and English voices must be selected in the Voice Selector.');
			return;
		}
		
		try {
			// Step 1: Play foreign language
			const foreignResponse = await fetch(`/api/sections/${section.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ 
					voice: selectedVoiceForeign,
					language: 'foreign'
				})
			});
			
			if (!foreignResponse.ok) {
				throw new Error(`Failed to play foreign audio: ${foreignResponse.statusText}`);
			}
			
			// Create audio element for foreign language
			const foreignBlob = await foreignResponse.blob();
			const foreignUrl = URL.createObjectURL(foreignBlob);
			const foreignAudio = new Audio(foreignUrl);
			
			// Play foreign audio and wait for it to complete
			let foreignDuration = 0;
			await new Promise<void>((resolve) => {
				foreignAudio.onloadedmetadata = () => {
					foreignDuration = foreignAudio.duration;
				};
				
				foreignAudio.onended = () => {
					URL.revokeObjectURL(foreignUrl);
					resolve();
				};
				
				foreignAudio.onerror = () => {
					URL.revokeObjectURL(foreignUrl);
					resolve();
				};
				
				foreignAudio.play().catch(() => {
					URL.revokeObjectURL(foreignUrl);
					resolve();
				});
			});
			
			// Step 2: Add a pause (1.5x the duration of the foreign audio or at least 1.5 seconds)
			const pauseDuration = Math.max(foreignDuration * 1.5, 1.5) * 1000;
			await new Promise(resolve => setTimeout(resolve, pauseDuration));
			
			// Step 3: Play English language
			const englishResponse = await fetch(`/api/sections/${section.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ 
					voice: selectedVoiceEnglish,
					language: 'english'
				})
			});
			
			if (!englishResponse.ok) {
				throw new Error(`Failed to play English audio: ${englishResponse.statusText}`);
			}
			
			// Create audio element for English language
			const englishBlob = await englishResponse.blob();
			const englishUrl = URL.createObjectURL(englishBlob);
			const englishAudio = new Audio(englishUrl);
			
			// Play English audio and wait for it to complete
			await new Promise<void>((resolve) => {
				englishAudio.onended = () => {
					URL.revokeObjectURL(englishUrl);
					resolve();
				};
				
				englishAudio.onerror = () => {
					URL.revokeObjectURL(englishUrl);
					resolve();
				};
				
				englishAudio.play().catch(() => {
					URL.revokeObjectURL(englishUrl);
					resolve();
				});
			});
			
		} catch (err) {
			console.error('Error playing both languages:', err);
			throw err;
		}
	}

	async function playAllSections(language: 'foreign' | 'english' | 'both' = 'both') {
		if (isPlayingAll) return; // Prevent multiple simultaneous playback
		
		try {
			isPlayingAll = true;
			
			// Check for required voices
			if (language === 'foreign' || language === 'both') {
				if (!selectedVoiceForeign) {
					throw new Error('No foreign voice selected. Please select a voice in the Voice Selector.');
				}
			}
			
			if (language === 'english' || language === 'both') {
				if (!selectedVoiceEnglish) {
					throw new Error('No English voice selected. Please select a voice in the Voice Selector.');
				}
			}
			
			// Sort sections by position to ensure correct order
			const sortedSections = [...sections].sort((a, b) => a.position - b.position);
			
			// Play each section with a delay between them
			for (const section of sortedSections) {
				await playSection(section, language);
				
				// Add a pause between sections
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		} catch (err) {
			console.error('Error playing all sections:', err);
			alert(err instanceof Error ? err.message : 'Failed to play all sections');
		} finally {
			isPlayingAll = false;
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
			<div class="play-controls">
				<button 
					class="play-all-btn" 
					onclick={() => playAllSections('both')}
					disabled={isPlayingAll}
					title="Play all sections with both languages in sequence"
				>
					{isPlayingAll ? 'Playing...' : 'Play All'}
				</button>
				<div class="language-buttons">
					<button 
						onclick={() => playAllSections('foreign')}
						disabled={isPlayingAll}
						class="foreign"
					>
						Foreign Only
					</button>
					<button 
						onclick={() => playAllSections('english')}
						disabled={isPlayingAll}
						class="english"
					>
						English Only
					</button>
				</div>
			</div>

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
							onPlay={(language) => playSection(section, language)}
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
	
	.play-controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
	
	.play-all-btn {
		background: linear-gradient(135deg, #4caf50 0%, #4caf50 49%, #2196f3 51%, #2196f3 100%);
		font-weight: bold;
		font-size: 1.1rem;
		padding: 0.7rem 1rem;
	}
	
	.language-buttons {
		display: flex;
		gap: 0.5rem;
	}
	
	.language-buttons button {
		flex: 1;
		font-size: 0.9rem;
		padding: 0.5rem;
	}
	
	.language-buttons button.foreign {
		background-color: #4caf50;
	}
	
	.language-buttons button.foreign:hover:not(:disabled) {
		background-color: #45a049;
	}
	
	.language-buttons button.english {
		background-color: #2196f3;
	}
	
	.language-buttons button.english:hover:not(:disabled) {
		background-color: #0b7dda;
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

	button:hover:not(:disabled) {
		background-color: #2980b9;
	}
	
	button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
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
