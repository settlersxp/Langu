// src/lib/database/schema.ts
export interface Deck {
	id: number;
	name: string;
	description?: string;
	playCount: number;
	languageCode: string;
	languageName: string;
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

export interface CreateDeckInput {
	name: string;
	description?: string;
	languageCode: string;
	languageName: string;
}

export interface UpdateDeckInput {
	name?: string;
	description?: string;
	languageCode?: string;
	languageName?: string;
}
