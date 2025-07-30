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