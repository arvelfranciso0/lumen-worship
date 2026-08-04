// Classic LCS-based word diff, used by BibleComparePanel to highlight where
// two translations' wording of the same verse differs. Pure/no dependencies,
// consistent with this codebase's preference for small hand-rolled utilities
// over adding a diff library for one feature.
export type DiffWord = { text: string; type: "same" | "add" | "del" };

function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

export function diffWords(a: string, b: string): { wordsA: DiffWord[]; wordsB: DiffWord[] } {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  const rows = tokensA.length + 1;
  const cols = tokensB.length + 1;
  const lengths: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = tokensA.length - 1; i >= 0; i--) {
    for (let j = tokensB.length - 1; j >= 0; j--) {
      lengths[i][j] = tokensA[i] === tokensB[j]
        ? lengths[i + 1][j + 1] + 1
        : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const wordsA: DiffWord[] = [];
  const wordsB: DiffWord[] = [];
  let i = 0, j = 0;
  while (i < tokensA.length && j < tokensB.length) {
    if (tokensA[i] === tokensB[j]) {
      wordsA.push({ text: tokensA[i], type: "same" });
      wordsB.push({ text: tokensB[j], type: "same" });
      i++; j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      wordsA.push({ text: tokensA[i], type: "del" });
      i++;
    } else {
      wordsB.push({ text: tokensB[j], type: "add" });
      j++;
    }
  }
  while (i < tokensA.length) { wordsA.push({ text: tokensA[i], type: "del" }); i++; }
  while (j < tokensB.length) { wordsB.push({ text: tokensB[j], type: "add" }); j++; }

  return { wordsA, wordsB };
}
