import {
  letterRevealMaxScore,
  parseWordLetterLayout,
  type LetterTile,
} from '../lib/letterReveal';

interface LetterRevealRowProps {
  word: string;
  revealedLetterIndices: ReadonlySet<number>;
  onRevealLetter: (letterIndex: number) => void;
  disabled?: boolean;
}

export default function LetterRevealRow({
  word,
  revealedLetterIndices,
  onRevealLetter,
  disabled = false,
}: LetterRevealRowProps) {
  const { groups, letterCount } = parseWordLetterLayout(word);
  const revealedCount = revealedLetterIndices.size;
  const maxScore = letterRevealMaxScore(revealedCount, letterCount);

  if (letterCount === 0) return null;

  return (
    <div className="letter-reveal">
      <div className="letter-reveal-row" aria-label="Letter hints">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="letter-reveal-group">
            {group.map((tile, tileIndex) => (
              <LetterBox
                key={`${groupIndex}-${tileIndex}-${tile.kind === 'letter' ? tile.index : tile.char}`}
                tile={tile}
                revealed={tile.kind === 'letter' && revealedLetterIndices.has(tile.index)}
                onReveal={onRevealLetter}
                disabled={disabled}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="letter-reveal-cap">Max score · {maxScore}%</p>
    </div>
  );
}

function LetterBox({
  tile,
  revealed,
  onReveal,
  disabled,
}: {
  tile: LetterTile;
  revealed: boolean;
  onReveal: (letterIndex: number) => void;
  disabled: boolean;
}) {
  if (tile.kind === 'punctuation') {
    return (
      <span className="letter-box letter-box-punctuation" aria-hidden>
        {tile.char}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`letter-box letter-box-letter${revealed ? ' revealed' : ''}`}
      onClick={() => onReveal(tile.index)}
      disabled={disabled || revealed}
      aria-label={revealed ? `Letter ${tile.char} revealed` : 'Reveal a letter'}
    >
      {revealed ? tile.char : ''}
    </button>
  );
}
