<script lang="ts">
	/*
    This component represents a section within a deck.
    It displays the foreign text and English text of the section.
    It also provides buttons to play the audio and remove the section.
    */

	import type { Section } from '$lib/database/schema';

	interface Props {
		section: Section;
		onRemove: () => void;
		onPlay: () => void;
	}

	let { section, onRemove, onPlay }: Props = $props();
</script>

<div class="section-card">
	<div class="section-content">
		<div class="text-container">
			<div class="foreign-text">{section.foreignText}</div>
			<div class="english-text">{section.englishText}</div>
		</div>
		<div class="section-controls">
			<button class="play-btn" onclick={onPlay}>▶</button>
			<button class="remove-btn" onclick={onRemove}>×</button>
		</div>
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
	}

	.english-text {
		font-size: 0.9rem;
		color: #666;
	}

	.section-controls {
		display: flex;
		gap: 0.5rem;
	}

	.play-btn,
	.remove-btn {
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
	}

	.play-btn:hover {
		background-color: #45a049;
	}

	.remove-btn {
		color: #ff5252;
	}

	.remove-btn:hover {
		background-color: rgba(255, 82, 82, 0.1);
	}
</style>
