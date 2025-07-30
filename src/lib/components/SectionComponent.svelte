<script lang="ts">
	/*
    This component represents a section within a deck.
    It displays the foreign text and English text of the section.
    It also provides buttons to play the audio and remove the section.
    */

	import type { Section } from '$lib/database/schema';
	import { fade } from 'svelte/transition';

	interface Props {
		section: Section;
		onRemove: () => void;
		onPlay: (language: 'foreign' | 'english' | 'both') => void;
	}

	let { section, onRemove, onPlay }: Props = $props();
	
	// Edit mode state
	let isEditing = $state(false);
	let editedForeignText = $state('');
	let editedEnglishText = $state('');
	let isSaving = $state(false);
	let errorMessage = $state<string | null>(null);
	
	// Start editing mode
	function startEdit() {
		editedForeignText = section.foreignText;
		editedEnglishText = section.englishText;
		isEditing = true;
	}
	
	// Cancel editing
	function cancelEdit() {
		isEditing = false;
		errorMessage = null;
	}
	
	// Save changes
	async function saveChanges() {
		if (!editedForeignText.trim() || !editedEnglishText.trim()) {
			errorMessage = "Both text fields are required";
			return;
		}
		
		try {
			isSaving = true;
			errorMessage = null;
			
			// Check if foreign text changed - this would require audio cache invalidation
			const foreignTextChanged = editedForeignText !== section.foreignText;
			const englishTextChanged = editedEnglishText !== section.englishText;
			
			// Prepare update data
			const updateData = {
				foreignText: editedForeignText,
				englishText: editedEnglishText,
				invalidateForeignCache: foreignTextChanged,
				invalidateEnglishCache: englishTextChanged
			};
			
			// Send update to API
			const response = await fetch(`/api/sections/${section.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateData)
			});
			
			if (!response.ok) {
				throw new Error(`Failed to update section: ${response.statusText}`);
			}
			
			// Update local section data with response
			const updatedSection = await response.json();
			section = updatedSection;
			
			// Exit edit mode
			isEditing = false;
		} catch (err) {
			console.error('Error updating section:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to update section';
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="section-card">
	<div class="section-content">
		{#if isEditing}
			<div class="edit-form" transition:fade={{ duration: 150 }}>
				<div class="form-group">
					<label for="foreignText">Foreign Text</label>
					<textarea 
						id="foreignText" 
						bind:value={editedForeignText}
						placeholder="Enter text in foreign language"
						rows="2"
					></textarea>
				</div>
				<div class="form-group">
					<label for="englishText">English Text</label>
					<textarea 
						id="englishText" 
						bind:value={editedEnglishText}
						placeholder="Enter English translation"
						rows="2"
					></textarea>
				</div>
				
				{#if errorMessage}
					<div class="error-message">{errorMessage}</div>
				{/if}
				
				<div class="edit-controls">
					<button class="cancel-btn" onclick={cancelEdit} disabled={isSaving}>Cancel</button>
					<button class="save-btn" onclick={saveChanges} disabled={isSaving}>
						{isSaving ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>
		{:else}
			<div class="text-container">
				<div class="foreign-text">
					{section.foreignText}
					<button class="play-btn foreign" onclick={() => onPlay('foreign')} title="Play foreign text">▶</button>
				</div>
				<div class="english-text">
					{section.englishText}
					<button class="play-btn english" onclick={() => onPlay('english')} title="Play English text">▶</button>
				</div>
			</div>
			<div class="section-controls">
				<button class="play-both-btn" onclick={() => onPlay('both')} title="Play both languages in sequence">
					<span class="play-icon">▶</span>
					<span class="play-icon">▶</span>
				</button>
				<button class="edit-btn" onclick={startEdit} title="Edit section">✎</button>
				<button class="remove-btn" onclick={onRemove} title="Remove section">×</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.section-card {
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 1rem;
		margin-bottom: 1rem;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		cursor: grab;
	}

	.section-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.section-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.text-container {
		flex: 1;
	}

	.foreign-text {
		font-size: 1.1rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.english-text {
		font-size: 0.9rem;
		color: #666;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.section-controls {
		display: flex;
		gap: 0.5rem;
	}

	.play-btn,
	.remove-btn,
	.edit-btn,
	.play-both-btn {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1.2rem;
		padding: 0.3rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
	}

	.play-btn {
		background-color: #4caf50;
		color: white;
		font-size: 0.8rem;
		width: 1.5rem;
		height: 1.5rem;
	}

	.play-btn:hover {
		background-color: #45a049;
	}
	
	.play-btn.english {
		background-color: #2196f3;
	}
	
	.play-btn.english:hover {
		background-color: #0b7dda;
	}
	
	.play-both-btn {
		background: linear-gradient(135deg, #4caf50 0%, #4caf50 49%, #2196f3 51%, #2196f3 100%);
		color: white;
		width: 2.5rem;
		height: 2.5rem;
		position: relative;
	}
	
	.play-both-btn:hover {
		opacity: 0.9;
	}
	
	.play-both-btn .play-icon {
		position: absolute;
		font-size: 0.8rem;
	}
	
	.play-both-btn .play-icon:first-child {
		top: 0.7rem;
		left: 0.7rem;
	}
	
	.play-both-btn .play-icon:last-child {
		bottom: 0.7rem;
		right: 0.7rem;
	}
	
	.edit-btn {
		background-color: #2196f3;
		color: white;
	}
	
	.edit-btn:hover {
		background-color: #0b7dda;
	}

	.remove-btn {
		color: #ff5252;
	}

	.remove-btn:hover {
		background-color: rgba(255, 82, 82, 0.1);
	}
	
	/* Edit form styles */
	.edit-form {
		width: 100%;
		padding: 0.5rem;
	}
	
	.form-group {
		margin-bottom: 1rem;
	}
	
	label {
		display: block;
		margin-bottom: 0.3rem;
		font-weight: 500;
		font-size: 0.9rem;
	}
	
	textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-family: inherit;
		font-size: 0.9rem;
		resize: vertical;
	}
	
	.edit-controls {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	
	.save-btn, .cancel-btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
	}
	
	.save-btn {
		background-color: #4caf50;
		color: white;
	}
	
	.save-btn:hover:not(:disabled) {
		background-color: #45a049;
	}
	
	.cancel-btn {
		background-color: #f1f1f1;
		color: #333;
	}
	
	.cancel-btn:hover:not(:disabled) {
		background-color: #e0e0e0;
	}
	
	button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	
	.error-message {
		color: #ff5252;
		font-size: 0.85rem;
		margin-top: 0.5rem;
	}
</style>
