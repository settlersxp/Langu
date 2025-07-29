import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { redirect, type Handle } from '@sveltejs/kit';
import { building } from '$app/environment';

// Initialize the Text-to-Speech client
let ttsClient: TextToSpeechClient | null = null;

// Only initialize the client when not building
if (!building) {
  try {
    // This will use application default credentials or the GOOGLE_APPLICATION_CREDENTIALS env variable
    ttsClient = new TextToSpeechClient();
    console.log('Google Cloud Text-to-Speech client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Google Cloud Text-to-Speech client:', error);
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  // Add the TTS client to the event.locals for use in routes
  event.locals.ttsClient = ttsClient;
  
  // Check if the user is authenticated with Google Cloud
  // This is a simple check - you might want to implement a more robust solution
  if (event.url.pathname.startsWith('/tts-protected') && !ttsClient) {
    // Redirect to login if accessing protected routes without authentication
    throw redirect(303, '/login');
  }
  
  // Continue with the request
  const response = await resolve(event);
  return response;
}; 