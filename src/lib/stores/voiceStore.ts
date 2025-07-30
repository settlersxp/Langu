import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Voice } from '$lib/models/language';

// Initialize the store with the value from localStorage if available
const storedVoice = browser ? localStorage.getItem('selectedVoice') : null;
const initialVoice = storedVoice ? JSON.parse(storedVoice) : null;

// Create the writable store
const selectedVoice = writable<Voice | null>(initialVoice);

// Subscribe to the store and update localStorage when it changes
if (browser) {
  selectedVoice.subscribe((value) => {
    if (value) {
      localStorage.setItem('selectedVoice', JSON.stringify(value));
    }
  });
}

export { selectedVoice }; 