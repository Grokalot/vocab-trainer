import type { ScoreResult, WordEntry } from '../types';
import { getCachedDefinition, loadSettings } from './storage';
async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const { openaiApiKey } = loadSettings();
  if (!openaiApiKey) {
    throw new Error('Add your OpenAI API key in Settings to use AI features.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
}

export async function fetchDefinition(word: string): Promise<string> {
  const cleaned = word.split(/[/:]/)[0].trim();
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleaned)}`,
    );
    if (response.ok) {
      const data = await response.json();
      const meaning = data[0]?.meanings?.[0]?.definitions?.[0]?.definition;
      if (meaning) return meaning;
    }
  } catch {
    // fall through to AI
  }

  const content = await callOpenAI(
    'You define vocabulary words concisely for learners. Respond with JSON: {"definition": "..."}',
    `Define the word "${word}" in one clear sentence suitable for study.`,
  );
  const parsed = JSON.parse(content) as { definition: string };
  return parsed.definition;
}

export async function loadWordEntries(words: string[]): Promise<WordEntry[]> {
  const entries = await Promise.all(
    words.map(async (word) => {
      const cached = getCachedDefinition(word);
      if (cached) {
        return { word, definition: cached };
      }
      return { word, definition: await fetchDefinition(word) };
    }),
  );
  return entries;
}

export async function scoreAttempt(
  word: string,
  correctDefinition: string,
  userAnswer: string,
): Promise<ScoreResult> {
  const content = await callOpenAI(
    `You score vocabulary recall attempts. Compare the user's definition to the reference.
Score 0-100 where 100 means fully correct meaning (wording can differ).
Respond with JSON: {"score": number, "feedback": "brief encouraging feedback"}`,
    `Word: ${word}
Reference definition: ${correctDefinition}
User's attempt: ${userAnswer}`,
  );

  const parsed = JSON.parse(content) as ScoreResult;
  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    feedback: parsed.feedback,
  };
}
