import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { GoogleAuth } from 'google-auth-library';
import { redirect, type Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { GOOGLE_APPLICATION_CREDENTIALS } from '$env/static/private';
import fs from 'fs';
import type { Voice } from './lib/models/language';

// Initialize the Text-to-Speech client
let ttsClient: TextToSpeechClient | null = null;

// Only initialize the client when not building
if (!building) {
  try {
    // This will use application default credentials or the GOOGLE_APPLICATION_CREDENTIALS env variable
    // read the file from the path where GOOGLE_APPLICATION_CREDENTIALS is set
    const credentials = JSON.parse(fs.readFileSync(GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
    const auth = new GoogleAuth({
      credentials: credentials,
    });
    ttsClient = new TextToSpeechClient({ auth });
    const [result] = await ttsClient.listVoices({});
    const voices: Voice[] = result.voices as Voice[] || [];
    console.log('Google Cloud Text-to-Speech client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Google Cloud Text-to-Speech client:', error);
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  // Add the TTS client to the event.locals for use in routes
  event.locals.ttsClient = ttsClient;
  
  // Check if the user is accessing protected routes and if the TTS client is not initialized
  if (event.url.pathname.startsWith('/tts-protected') && !event.locals.ttsClient) {
    // Redirect to login if accessing protected routes without authentication
    throw redirect(303, '/login');
  }
  
  // Continue with the request
  const response = await resolve(event);
  return response;
}; 