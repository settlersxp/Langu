import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { protos } from '@google-cloud/text-to-speech';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.ttsClient) {
      return json({ error: 'TTS client not initialized' }, { status: 500 });
    }

    const { text, voice } = await request.json();

    if (!text || !voice) {
      return json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Set up the request
    const request_tts = {
      input: { text },
      voice: {
        languageCode: voice.languageCodes[0],
        name: voice.name,
        ssmlGender: voice.ssmlGender
      },
      audioConfig: { audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3 }
    };

    // Perform the text-to-speech request
    const [response] = await locals.ttsClient.synthesizeSpeech(request_tts);
    
    // Return the audio content as base64
    return json({
      audioContent: response.audioContent ? Buffer.from(response.audioContent).toString('base64') : null
    });
  } catch (error) {
    console.error('Error testing voice:', error);
    return json({ error: 'Failed to test voice' }, { status: 500 });
  }
}; 