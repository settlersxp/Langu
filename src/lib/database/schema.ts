// src/lib/database/schema.ts
export interface Deck {
	id: number;
	name: string;
	description?: string;
	playCount: number;
}

export interface Section {
	id: number;
	deckId: number;
	foreignText: string;
	englishText: string;
	audioPath: string;
	position: number;
	playCount: number;
}
