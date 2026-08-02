import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  delay,
  fetchDictionaryComDefinition,
} from '../src/lib/dictionaryCom.ts';
import { wordKey } from '../src/lib/storage.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const wordsPath = path.join(root, 'public', 'words.txt');
const outputPath = path.join(root, 'public', 'definitions.json');

async function main() {
  const words = fs
    .readFileSync(wordsPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const definitions: Record<string, string> = {};
  const missed: string[] = [];
  const delayMs = Number(process.env.DEFINITION_DELAY_MS ?? 350);

  console.log(`Refreshing ${words.length} definitions from Dictionary.com…`);

  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const definition = await fetchDictionaryComDefinition(word);

    if (definition) {
      definitions[wordKey(word)] = definition;
    } else {
      missed.push(word);
    }

    if ((index + 1) % 25 === 0 || index === words.length - 1) {
      console.log(
        `${index + 1}/${words.length} · found ${Object.keys(definitions).length} · missed ${missed.length}`,
      );
    }

    if (index < words.length - 1) {
      await delay(delayMs);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(definitions, null, 2));

  if (missed.length > 0) {
    fs.writeFileSync(
      path.join(root, 'public', 'definitions-missed.txt'),
      missed.join('\n') + '\n',
    );
  }

  console.log(`Saved ${Object.keys(definitions).length} definitions to public/definitions.json`);
  if (missed.length > 0) {
    console.log(`Missed ${missed.length} words · see public/definitions-missed.txt`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
