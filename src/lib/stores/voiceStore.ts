import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Voice } from '$lib/models/language';

// Initialize the stores with values from localStorage if available
const storedForeignVoice = browser ? localStorage.getItem('selectedVoiceForeign') : null;
const initialForeignVoice = storedForeignVoice ? JSON.parse(storedForeignVoice) : null;

const storedEnglishVoice = browser ? localStorage.getItem('selectedVoiceEnglish') : null;
const initialEnglishVoice = storedEnglishVoice ? JSON.parse(storedEnglishVoice) : null;

// Create the writable stores
const selectedVoiceForeign = writable<Voice | null>(initialForeignVoice);
const selectedVoiceEnglish = writable<Voice | null>(initialEnglishVoice);

// Subscribe to the stores and update localStorage when they change
if (browser) {
  selectedVoiceForeign.subscribe((value) => {
    if (value) {
      localStorage.setItem('selectedVoiceForeign', JSON.stringify(value));
    }
  });

  selectedVoiceEnglish.subscribe((value) => {
    if (value) {
      localStorage.setItem('selectedVoiceEnglish', JSON.stringify(value));
    }
  });
}

export { selectedVoiceForeign, selectedVoiceEnglish }; 