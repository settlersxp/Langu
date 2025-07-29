import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

export const POST: RequestHandler = async ({ locals }) => {
  try {
    // If we already have a client in locals, we're authenticated
    if (locals.ttsClient) {
      return json({ success: true });
    }
    
    // Try to create a new client - this will use application default credentials
    // or the GOOGLE_APPLICATION_CREDENTIALS environment variable
    const client = new TextToSpeechClient();
    
    // Test the connection by making a simple listVoices call
    const [result] = await client.listVoices({});
    
    if (result && result.voices && result.voices.length > 0) {
      // Authentication successful - in a real app, you would store this in a session
      // For now, we'll rely on the client in hooks.server.ts
      return json({ success: true });
    } else {
      return json({ success: false, message: 'Authentication failed: No voices found' }, { status: 401 });
    }
  } catch (error) {
    console.error('Google TTS Authentication error:', error);
    return json(
      { 
        success: false, 
        message: 'Authentication failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      }, 
      { status: 401 }
    );
  }
}; 