import type { TourMode } from "./data";

// What the tour needs to know about the app to decide which steps apply. Kept
// to plain data so the step list stays pure and testable.
export type TourContext = { hasBibleTranslations: boolean };

// Where a step's target element lives. A tour walks onto a surface by opening
// it and walks off by closing it, so a sequence can lead the operator into a
// dialog, guide them through it, and bring them back out — instead of pointing
// at the button that opens the dialog and then going silent once it's up.
export type TourSurface = "page" | "bibleTranslations" | "songEditor" | "lineupModal";

// Every step advances on a plain Next, and Skip is always available. The tour
// describes the app; it never waits on the operator to complete a real action
// first — an earlier version held the import step until a translation had
// actually been imported, which made finishing a first run depend on
// downloading a file from the website mid-tour.
export type TourStep = {
  target: string;
  title: string;
  body: string;
  // Defaults to "page". The tour opens this surface when it steps onto it and
  // closes it when it steps off.
  surface?: TourSurface;
  // Omitted from the sequence entirely when this returns false — for steps
  // whose target element doesn't exist in that state. A step pointing at a
  // missing element spotlights nothing and dumps the operator in front of a
  // dark screen with a floating popover, which is what the Bible tour did with
  // no translation imported: its first step targeted the book/chapter grid,
  // which only renders once there's a translation to browse.
  when?: (context: TourContext) => boolean;
};

const hasTranslations = (context: TourContext) => context.hasBibleTranslations;
const needsTranslation = (context: TourContext) => !context.hasBibleTranslations;

export function stepSurface(step: TourStep): TourSurface {
  return step.surface ?? "page";
}

// `target` matches a data-tour="..." attribute somewhere in the tree (see
// Header.tsx, Sidebar.tsx, and the dialogs themselves). Each mode gets its own
// sequence, auto-started the first time that mode is visited
// (state.tourSeen[mode]).
const ALL_STEPS: Record<TourMode, TourStep[]> = {
  songs: [
    { target: "search", title: "Find a song fast", body: "Search by title, artist, or tag — or ⌘K for search across everything (songs, Bible books, lineups)." },
    { target: "upload", title: "Add your own songs", body: "Songs are added from their lyrics — no special file format needed. Next opens the editor." },
    {
      target: "song-editor-fields",
      surface: "songEditor",
      title: "Describe the song",
      body: "Title is the only one that's required. Key and BPM show on the operator screen while the song is live; tags feed the library filters.",
    },
    {
      target: "song-editor-lyrics",
      surface: "songEditor",
      title: "Paste the lyrics",
      body: "A section name on its own line — “Verse 1”, “Chorus” — starts a new section, and a blank line starts a new slide. Pasting a whole song usually needs no cleanup.",
    },
    {
      target: "song-editor-save",
      surface: "songEditor",
      title: "Add it to the library",
      body: "Saves the song and its slides. Everything here stays editable afterwards, so a rough first pass is fine.",
    },
    { target: "present", title: "Go live", body: "Present (or F5) sends the current slide to the audience — a second monitor if one's connected, otherwise fullscreen." },
  ],
  // Two paths, chosen by whether anything is imported when the tour starts (the
  // sequence is resolved once, at that moment — see tourStepsFor). With an empty
  // library the only useful thing to teach is how to get Scripture in; once
  // that's done, walking a returning operator back through the import panel
  // teaches them nothing about presenting.
  bible: [
    // --- Empty library: get a translation in. ---
    {
      target: "bible-import",
      title: "Import a translation",
      body: "This app doesn't bundle any Bible text — every translation is a file you download once and import. Next opens the translations panel.",
      when: needsTranslation,
    },
    // Inside the panel: where translations come from, then how one gets in.
    // That order matters — the import button is useless until you know there's a
    // download page behind the other one.
    {
      target: "bible-panel-downloads",
      surface: "bibleTranslations",
      title: "Where translations come from",
      body: "Get more translations opens the Lumen downloads page in your browser, listing every version available.",
      when: needsTranslation,
    },
    {
      target: "bible-panel-import",
      surface: "bibleTranslations",
      title: "Adding one to the app",
      body: "Import translation reads a translation file you've downloaded and adds it to your library, ready to present from.",
      when: needsTranslation,
    },
    // --- Translation already installed: presenting from it. ---
    {
      target: "bible-version",
      title: "Pick a translation",
      body: "Every version you've imported shows here, grouped by language. Switching keeps your place — the same passage, in the new wording.",
      when: hasTranslations,
    },
    {
      target: "bible-nav",
      title: "Pick a book and chapter",
      body: "Books on the left, that book's chapters on the right. Typing a reference in the search box — “John 3:16” — jumps straight there.",
      when: hasTranslations,
    },
    {
      target: "bible-verse",
      title: "Pick a verse",
      body: "Each verse is its own slide. Click one to make it live; the arrow keys and transport buttons then step through, crossing into the next chapter or book on their own.",
      when: hasTranslations,
    },
    { target: "present", title: "Send it live", body: "Present (or F5) puts the current verse on the audience display — a second monitor if one's connected, otherwise fullscreen." },
  ],
  lineups: [
    {
      target: "lineup-new",
      title: "Group songs into a lineup",
      body: "Create a lineup for a service or event, then pick the songs that belong in it. Next opens the dialog.",
    },
    { target: "lineup-name", surface: "lineupModal", title: "Name the lineup", body: "Give it something you'll recognise mid-service — “Sunday AM”, “Youth Night”, “Christmas Eve”." },
    { target: "lineup-search", surface: "lineupModal", title: "Find songs fast", body: "Filter the list below by title, artist or tag. It only narrows what's shown — anything already ticked stays selected." },
    { target: "lineup-songs", surface: "lineupModal", title: "Tick the songs you need", body: "Each tick adds that song to the lineup, and the counter above keeps track. You can reorder them afterwards by dragging." },
    { target: "lineup-upload", surface: "lineupModal", title: "Song not in the list?", body: "Upload it here without leaving this dialog — it lands in your library and can be ticked straight away." },
    { target: "lineup-create", surface: "lineupModal", title: "Create the lineup", body: "Saves it to the Lineups tab. Nothing is final: songs can be added, removed or reordered any time after." },
    { target: "present", title: "Go live", body: "Activate a lineup, pick a song, and hit Present (or F5) to send it to the audience display." },
  ],
};

// The steps that apply right now. Resolved once when a tour starts and then
// held fixed for its duration (see TourOverlay) — recomputing mid-tour would
// renumber the steps under the operator the moment an import succeeds.
export function tourStepsFor(mode: TourMode, context: TourContext): TourStep[] {
  return ALL_STEPS[mode].filter((step) => !step.when || step.when(context));
}
