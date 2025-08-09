import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { WORD_SELECTOR_API_URL } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const resp = await fetch(`${WORD_SELECTOR_API_URL}/words-by-topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await resp.text();
  return json(JSON.parse(data), { status: resp.status });
};


