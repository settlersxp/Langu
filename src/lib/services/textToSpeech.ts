// src/lib/services/textToSpeech.ts
import type { Section } from '../database/schema';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

class TextToSpeechService {
	private client: TextToSpeechClient;
	private prisma: PrismaClient;
	private audioDir: string = 'static/audio';

	constructor() {
		this.client = new TextToSpeechClient();
		this.prisma = new PrismaClient();
		this.ensureAudioDirExists();
	}

	private async ensureAudioDirExists(): Promise<void> {
		try {
			await fs.mkdir(this.audioDir, { recursive: true });
		} catch (error) {
			console.error('Error creating audio directory:', error);
		}
	}

	async generateForeignLanguageAudio(section: Section): Promise<string> {
		// Check if audio already exists
		if (section.audioPath && (await this.audioFileExists(section.audioPath))) {
			return section.audioPath;
		}

		// Generate a unique filename
		const filename = `foreign_${section.id}_${Date.now()}.mp3`;
		const outputPath = join(this.audioDir, filename);
		const relativePath = `/audio/${filename}`;

		try {
			// Configure the request for Google Cloud TTS
			const request = {
				input: { text: section.foreignText },
				voice: {
					languageCode: 'fr-FR', // This should be dynamic based on the language
					name: 'fr-FR-Neural2-A' // Using Neural2 voice which is part of Chirp3
				},
				audioConfig: { audioEncoding: 'MP3' as const }
			};

			// Make the request
			const [response] = await this.client.synthesizeSpeech(request);

			// Write the audio content to file
			await fs.writeFile(outputPath, response.audioContent as Buffer);

			// Update the database with the new audio path
			await this.updateAudioPath(section.id, relativePath);

			return relativePath;
		} catch (error) {
			console.error('Error generating foreign language audio:', error);
			return '';
		}
	}

	async generateEnglishAudio(section: Section): Promise<string> {
		// Check if audio already exists
		if (section.audioPath && (await this.audioFileExists(section.audioPath))) {
			return section.audioPath;
		}

		// Generate a unique filename
		const filename = `english_${section.id}_${Date.now()}.mp3`;
		const outputPath = join(this.audioDir, filename);
		const relativePath = `/audio/${filename}`;

		try {
			// For English, we'll also use Google Cloud TTS
			const request = {
				input: { text: section.englishText },
				voice: {
					languageCode: 'en-US',
					name: 'en-US-Neural2-F'
				},
				audioConfig: { audioEncoding: 'MP3' as const }
			};

			// Make the request
			const [response] = await this.client.synthesizeSpeech(request);

			// Write the audio content to file
			await fs.writeFile(outputPath, response.audioContent as Buffer);

			// Update the database with the new audio path
			await this.updateAudioPath(section.id, relativePath);

			return relativePath;
		} catch (error) {
			console.error('Error generating English audio:', error);
			return '';
		}
	}

	private async audioFileExists(path: string): Promise<boolean> {
		try {
			// Remove leading slash if present
			const cleanPath = path.startsWith('/') ? path.substring(1) : path;
			const fullPath = join('static', cleanPath);
			await fs.access(fullPath);
			return true;
		} catch {
			return false;
		}
	}

	private async updateAudioPath(sectionId: number, audioPath: string): Promise<void> {
		try {
			await this.prisma.section.update({
				where: { id: sectionId },
				data: { audioPath }
			});
		} catch (error) {
			console.error('Error updating audio path in database:', error);
		}
	}
}

export default TextToSpeechService;
