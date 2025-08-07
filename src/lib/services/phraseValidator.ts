import { WORD_SELECTOR_API_URL } from '$env/static/private';

export interface PhraseValidationResult {
  percentage: number;
}

export interface PhraseValidationError {
  error: string;
}

export async function validatePhrase(phrase: string): Promise<number | null> {
  try {
    const response = await fetch(`${WORD_SELECTOR_API_URL}/validate-phrase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phrase })
    });

    if (!response.ok) {
      console.error('Phrase validation failed:', response.statusText);
      return null;
    }

    const result: PhraseValidationResult = await response.json();
    return result.percentage;
  } catch (error) {
    console.error('Error calling phrase validator:', error);
    return null;
  }
}