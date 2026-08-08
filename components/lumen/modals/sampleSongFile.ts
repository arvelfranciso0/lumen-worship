// Sample song text for the "Download sample .txt" button.
const SAMPLE_SONG_TEXT = `Title: Amazing Grace
Artist: John Newton
Key: G
BPM: 72
Category: Hymn
Tags: hymn, classic
CCLI: 22025

Verse 1
Amazing grace, how sweet the sound
That saved a wretch like me
I once was lost, but now am found
Was blind but now I see

Chorus
'Twas grace that taught my heart to fear
And grace my fears relieved
How precious did that grace appear
The hour I first believed
`;

export function downloadSampleSongFile() {
  const blob = new Blob([SAMPLE_SONG_TEXT], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sample-song.txt";
  link.click();
  URL.revokeObjectURL(url);
}
