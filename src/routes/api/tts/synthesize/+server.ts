import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  // Check if we have a TTS client
  if (!locals.ttsClient) {
    throw error(401, 'Not authenticated with Google Cloud Text-to-Speech');
  }
  
  try {
    const body = await request.json();
    const { text, voice } = body;
    
    if (!text) {
      throw error(400, 'Text is required');
    }
    
    // Get the language code from the voice name (e.g., en-US from en-US-Wavenet-A)
    const voiceNameParts = voice.split('-');
    const languageCode = voiceNameParts.length >= 2 
      ? `${voiceNameParts[0]}-${voiceNameParts[1]}` 
      : 'en-US';
    
    // Prepare the request
    const request = {
      input: { text },
      voice: {
        languageCode,
        name: voice,
      },
      audioConfig: { audioEncoding: 'MP3' },
    };
    
    // Synthesize speech
    const [response] = await locals.ttsClient.synthesizeSpeech(request);
    
    // Create response with audio content
    return new Response(response.audioContent, {
      headers: {
        'Content-Type': 'audio/mp3',
        'Content-Disposition': 'attachment; filename="speech.mp3"'
      }
    });
  } catch (err) {
    console.error('Error synthesizing speech:', err);
    
    if (err instanceof Error) {
      throw error(500, err.message);
    } else {
      throw error(500, 'Unknown error occurred');
    }
  }
}; 