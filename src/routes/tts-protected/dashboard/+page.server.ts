import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Check if the user is authenticated
  if (!locals.ttsClient) {
    throw redirect(303, '/login');
  }
  
  try {
    // Get available voices to display in the dashboard
    try {
      const [result] = await locals.ttsClient.listVoices({});
      const voices = result.voices || [];
      
      return {
        authenticated: true,
        voices: voices.map(voice => ({
          name: voice.name,
          languageCodes: voice.languageCodes,
          ssmlGender: voice.ssmlGender,
          naturalSampleRateHertz: voice.naturalSampleRateHertz
        }))
      };
    } catch (error: any) {
      console.error('Error fetching TTS voices:', error);
      // If there's an authentication or credentials error, redirect to login
      if (error.message && typeof error.message === 'string' && error.message.includes('credentials')) {
        throw redirect(303, '/login');
      }
      
      // Otherwise return an error message
      return {
        authenticated: true,
        voices: [],
        error: 'Failed to fetch voices'
      };
    }
  } catch (error) {
    console.error('Error in TTS dashboard:', error);
    return {
      authenticated: false,
      voices: [],
      error: 'Authentication error'
    };
  }
}; 