/*
This file contains the models for the section API.
*/

export interface CreateSectionInput {
	deckId: number;
	foreignText: string;
	englishText: string;
	audioPath: string;
}