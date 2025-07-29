import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Check if the user is authenticated
  if (!locals.ttsClient) {
    throw redirect(303, '/login');
  }
  
  try {
    // Get available voices to display in the dashboard
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
  } catch (error) {
    console.error('Error fetching TTS voices:', error);
    return {
      authenticated: true,
      voices: [],
      error: 'Failed to fetch voices'
    };
  }
}; 