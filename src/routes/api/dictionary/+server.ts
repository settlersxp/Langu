import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { OLLAMA_API_URL, CHAT_MODEL_NAME } from '$env/static/private';

function resolveWordsPath(wordsFile: string): string {
  const base = path.resolve('currated_words/german');
  const candidate = path.join(base, wordsFile);
  const withTxt = candidate.endsWith('.txt') ? candidate : candidate + '.txt';
  return withTxt;
}

function resolveTranslationsPath(wordsFile: string): string {
  const base = path.resolve('translations/german');
  const file = wordsFile.endsWith('.txt') ? wordsFile : wordsFile + '.txt';
  return path.join(base, file);
}

function readTranslations(wordsFile: string): Record<string, string> {
  try {
    const p = resolveTranslationsPath(wordsFile);
    if (!fs.existsSync(p)) return {};
    const content = fs.readFileSync(p, 'utf8');
    const map: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [w, t] = trimmed.split('\t');
      if (w && t) map[w] = t;
    }
    return map;
  } catch {
    return {};
  }
}

function writeTranslations(wordsFile: string, map: Record<string, string>) {
  const p = resolveTranslationsPath(wordsFile);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const lines = Object.keys(map)
    .sort((a, b) => a.localeCompare(b))
    .map((w) => `${w}\t${map[w] ?? ''}`)
    .join('\n');
  fs.writeFileSync(p, lines, 'utf8');
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const wordsFile = url.searchParams.get('wordsFile') || 'B1.txt';
    const filePath = resolveWordsPath(wordsFile);
    if (!fs.existsSync(filePath)) {
      return json({ error: 'Dictionary not found' }, { status: 404 });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const words = content.split('\n').map((w) => w.trim()).filter(Boolean);
    const translations = readTranslations(wordsFile);
    return json({ wordsFile: path.basename(filePath), words, translations });
  } catch (e: any) {
    return json({ error: e?.message || 'Failed to read dictionary' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { word, wordsFile } = await request.json();
    if (!wordsFile) {
      // Create the empty file
      fs.writeFileSync(resolveWordsPath(wordsFile), '');
    }
    if (!word || typeof word !== 'string') {
      return json({ error: 'word is required' }, { status: 400 });
    }

    // If the word is already in the file, return the translation
    let existing = readTranslations(wordsFile);
    if (existing[word]) {
      return json({ word, translation: existing[word] });
    }

    // Translate the word
    const prompt = `Translate the following German word to English. Provide only the translation, no extra text.\n\nGerman: ${word}\n\nEnglish:`;
    const body = {
      model: CHAT_MODEL_NAME,
      prompt,
      stream: false,
      options: { temperature: 0.1 }
    }
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json' };
    const bodyString = JSON.stringify(body);
    // console.log('CURL version: ', `curl -X ${method} ${OLLAMA_API_URL}/api/generate -H "${headers}" -d '${bodyString}'`);

    const ollamaResp = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: method,
      headers,
      body: bodyString
    });
    if (!ollamaResp.ok) {
      return json({ error: 'Translation failed' }, { status: 502 });
    }
    const data = await ollamaResp.json();
    const translation = (data?.response || '').trim();
    // Persist in cache
    existing = readTranslations(wordsFile);
    existing[word] = translation;
    writeTranslations(wordsFile, existing);
    return json({ word, translation });
  } catch (e: any) {
    return json({ error: e?.message || 'Failed to translate' }, { status: 500 });
  }
};


