import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { OLLAMA_API_URL, WORD_SELECTOR_API_URL } from '$env/static/private';

interface Payload {
  mode: 'translate' | 'adapt';
  text: string;
  wordsFile?: string;
  relevantWords?: string[];
}

export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const { mode, text, wordsFile, relevantWords }: Payload = await request.json();
    if (!mode || !text) return json({ error: 'mode and text are required' }, { status: 400 });

    let output = '';
    if (mode === 'translate') {
      const prompt = `Translate the following English text to German. Use simple A2/B1 German. Output only the German translation, no extra text.\n\nEnglish:\n${text}\n\nGerman:`;
      const resp = await fetch(`${OLLAMA_API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3', prompt, stream: false, options: { temperature: 0.2 } })
      });
      if (!resp.ok) return json({ error: 'Translation failed' }, { status: 502 });
      const data = await resp.json();
      output = (data?.response || '').trim();
    } else if (mode === 'adapt') {
      let words = relevantWords;
      if (!words || words.length === 0) {
        // Fallback: get relevant words from the word selector service
        const rel = await fetch(`${WORD_SELECTOR_API_URL}/relevant-words`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: text, top_k: 80, words_file: wordsFile })
        });
        if (rel.ok) {
          const data = await rel.json();
          words = data?.relevant_words ?? [];
        } else {
          words = [];
        }
      }
      const list = words && words.length ? words.join(', ') : '';
      const prompt = `Rewrite the following German sentence using mainly the allowed vocabulary list. Keep the original meaning, make it simpler (A2/B1 level). Output only the rewritten German sentence.\n\nAllowed vocabulary list:\n${list}\n\nOriginal German:\n${text}\n\nRewritten German:`;
      const resp = await fetch(`${OLLAMA_API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3', prompt, stream: false, options: { temperature: 0.2 } })
      });
      if (!resp.ok) return json({ error: 'Adaptation failed' }, { status: 502 });
      const data = await resp.json();
      output = (data?.response || '').trim();
    } else {
      return json({ error: 'Invalid mode' }, { status: 400 });
    }

    return json({ output });
  } catch (e: any) {
    return json({ error: e?.message || 'Translation assistant error' }, { status: 500 });
  }
};


