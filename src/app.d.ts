// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { TextToSpeechClient } from '@google-cloud/text-to-speech';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			ttsClient: TextToSpeechClient | null;
			curatedWords: string[];
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
