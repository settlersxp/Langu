import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Voice } from '$lib/models/language';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    if (!locals.ttsClient) {
      return json({ error: 'TTS client not initialized' }, { status: 500 });
    }

    const [result] = await locals.ttsClient.listVoices({});
    const voices: Voice[] = result.voices as Voice[] || [];
    return json({ voices: voices });
  } catch (error) {
    console.error('Error fetching voices:', error);
    return json({ error: 'Failed to fetch voices' }, { status: 500 });
  }
}; 