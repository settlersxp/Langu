import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { WORD_SELECTOR_API_URL } from '$env/static/private';

export const GET: RequestHandler = async () => {
  const resp = await fetch(`${WORD_SELECTOR_API_URL}/health`);
  const data = await resp.text();
  return json(JSON.parse(data), { status: resp.status });
};


