import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

class MessageTTSService {
  private client: TextToSpeechClient;
  private audioDir: string = 'static/audio';

  constructor() {
    this.client = new TextToSpeechClient();
    this.ensureAudioDirExists();
  }

  private async ensureAudioDirExists(): Promise<void> {
    try {
      await fs.mkdir(this.audioDir, { recursive: true });
    } catch (error) {
      console.error('Error creating audio directory:', error);
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

  async generateMessageAudio(messageId: number, content: string, language: 'de' | 'en' = 'de'): Promise<{ audioPath: string; audioUuid: string }> {
    // Generate UUID for the audio file
    const audioUuid = uuidv4();
    const filename = `message_${audioUuid}.mp3`;
    const outputPath = join(this.audioDir, filename);
    const relativePath = `/audio/${filename}`;

    try {
      // Configure the request for Google Cloud TTS
      const voiceConfig = language === 'de' 
        ? { languageCode: 'de-DE', name: 'de-DE-Neural2-F' }
        : { languageCode: 'en-US', name: 'en-US-Neural2-F' };

      const request = {
        input: { text: content },
        voice: voiceConfig,
        audioConfig: { audioEncoding: 'MP3' as const }
      };

      // Make the request
      const [response] = await this.client.synthesizeSpeech(request);

      // Write the audio content to file
      await fs.writeFile(outputPath, response.audioContent as Buffer);

      // Update the database with the new audio path and UUID
      await prisma.message.update({
        where: { id: messageId },
        data: { 
          audioPath: relativePath,
          audioUuid: audioUuid
        }
      });

      return { audioPath: relativePath, audioUuid: audioUuid };
    } catch (error) {
      console.error('Error generating message audio:', error);
      throw error;
    }
  }

  async checkAndRegenerateAudio(messageId: number, content: string, currentAudioPath?: string, currentAudioUuid?: string): Promise<{ audioPath: string; audioUuid: string }> {
    // If no audio exists, generate it
    if (!currentAudioPath || !currentAudioUuid) {
      return await this.generateMessageAudio(messageId, content);
    }

    // Check if file exists
    if (await this.audioFileExists(currentAudioPath)) {
      return { audioPath: currentAudioPath, audioUuid: currentAudioUuid };
    }

    // File doesn't exist, regenerate using existing UUID
    const filename = `message_${currentAudioUuid}.mp3`;
    const outputPath = join(this.audioDir, filename);
    const relativePath = `/audio/${filename}`;

    try {
      // Determine language from content (simple heuristic)
      const isGerman = /[äöüßÄÖÜ]/.test(content) || content.includes('der ') || content.includes('die ') || content.includes('das ');
      const voiceConfig = isGerman 
        ? { languageCode: 'de-DE', name: 'de-DE-Neural2-F' }
        : { languageCode: 'en-US', name: 'en-US-Neural2-F' };

      const request = {
        input: { text: content },
        voice: voiceConfig,
        audioConfig: { audioEncoding: 'MP3' as const }
      };

      // Make the request
      const [response] = await this.client.synthesizeSpeech(request);

      // Write the audio content to file
      await fs.writeFile(outputPath, response.audioContent as Buffer);

      // Update the database with the audio path (UUID remains the same)
      await prisma.message.update({
        where: { id: messageId },
        data: { audioPath: relativePath }
      });

      return { audioPath: relativePath, audioUuid: currentAudioUuid };
    } catch (error) {
      console.error('Error regenerating message audio:', error);
      throw error;
    }
  }
}

const messageTTSService = new MessageTTSService();

// POST to generate or play message audio
export const POST: RequestHandler = async ({ params }) => {
  const { messageId } = params;
  
  // Get the message
  const message = await prisma.message.findUnique({
    where: {
      id: parseInt(messageId)
    }
  });
  
  if (!message) {
    return json({ error: 'Message not found' }, { status: 404 });
  }
  
  try {
    const result = await messageTTSService.checkAndRegenerateAudio(
      message.id,
      message.content,
      message.audioPath || undefined,
      message.audioUuid || undefined
    );

    return json({
      audioPath: result.audioPath,
      audioUuid: result.audioUuid
    });
  } catch (error) {
    console.error('Error generating message TTS:', error);
    return json({ error: 'Failed to generate audio' }, { status: 500 });
  }
};