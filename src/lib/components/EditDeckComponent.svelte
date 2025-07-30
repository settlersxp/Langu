
<script lang="ts">
    import type { Deck } from '$lib/database/schema';

    /*
    This component is used to edit a deck.

    The user must be able to edit the deck name and description.
    */

    interface Props {
        deck: Deck;
        update: (updatedDeck: Deck) => void;
        close: () => void;
    }

    let { deck, update, close }: Props = $props();

    let name = $state(deck.name);
    let description = $state(deck.description || '');
    let languageCode = $state(deck.languageCode || '');
    let languageName = $state(deck.languageName || '');
    let isSubmitting = $state(false);
    
    async function updateDeck() {
        isSubmitting = true;
        try {
            const payload = {
                name,
                description,
                languageCode,
                languageName
            };
            
            let response;
            
            if (deck.id === 0) {
                // Create new deck
                response = await fetch('/api/decks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                // Update existing deck
                response = await fetch(`/api/decks/${deck.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            }

            if (response.ok) {
                const updatedDeck = await response.json();
                update(updatedDeck);
                close();
            } else {
                console.error('Failed to save deck');
            }
        } catch (error) {
            console.error('Error saving deck:', error);
        } finally {
            isSubmitting = false;
        }
    }

    function cancel() {
        close();
    }
</script>

<div class="overlay">
    <div class="edit-deck-component">
        <h2>Edit Deck</h2>
        <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" bind:value={name} />
        </div>
        <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" bind:value={description}></textarea>
        </div>
        <div class="form-group">
            <label for="languageName">Language Name</label>
            <input type="text" id="languageName" bind:value={languageName} />
        </div>
        <div class="form-group">
            <label for="languageCode">Language Code</label>
            <input type="text" id="languageCode" bind:value={languageCode} />
        </div>
        <div class="button-group">
            <button class="cancel-btn" onclick={cancel} disabled={isSubmitting}>Cancel</button>
            <button class="save-btn" onclick={updateDeck} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
            </button>
        </div>
    </div>
</div>

<style>
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .edit-deck-component {
        background-color: white;
        border-radius: 8px;
        padding: 20px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    h2 {
        margin-top: 0;
        margin-bottom: 20px;
        color: #333;
    }

    .form-group {
        margin-bottom: 15px;
    }

    label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
    }

    input, textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
    }

    textarea {
        min-height: 100px;
        resize: vertical;
    }

    .button-group {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
    }

    .save-btn {
        background-color: #4caf50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
    }

    .save-btn:hover:not(:disabled) {
        background-color: #45a049;
    }

    .cancel-btn {
        background-color: #f5f5f5;
        color: #333;
        border: 1px solid #ddd;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
    }

    .cancel-btn:hover:not(:disabled) {
        background-color: #e5e5e5;
    }

    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
</style>