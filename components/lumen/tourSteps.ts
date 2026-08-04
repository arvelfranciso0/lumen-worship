import type { TourMode } from "./data";

export type TourStep = { target: string; title: string; body: string };

// `target` matches a data-tour="..." attribute somewhere in the tree (see
// Header.tsx, Sidebar.tsx). Each mode gets its own sequence, auto-started
// the first time that mode is visited (state.tourSeen[mode]).
export const TOUR_STEPS: Record<TourMode, TourStep[]> = {
  songs: [
    { target: "search", title: "Find a song fast", body: "Search by title, artist, or tag — or ⌘K for search across everything (songs, Bible books, lineups)." },
    { target: "upload", title: "Add your own songs", body: "Upload a song's lyrics, or paste a text file with Title/Artist/Key header lines to prefill everything." },
    { target: "present", title: "Go live", body: "Present (or F5) sends the current slide to the audience — a second monitor if one's connected, otherwise fullscreen." },
  ],
  bible: [
    { target: "bible-nav", title: "Browse Scripture", body: "Pick a book and chapter here — arrow keys or the transport buttons step through verses, crossing into the next chapter or book automatically." },
    { target: "bible-import", title: "Import a translation", body: "This app doesn't bundle any Bible text. Get a translation file from the Lumen website, then import it here to start browsing and presenting." },
    { target: "present", title: "Go live", body: "Present (or F5) sends the current verse to the audience display." },
  ],
  lineups: [
    { target: "lineup-new", title: "Group songs into a lineup", body: "Create a lineup for a service or event, then drag songs in from the library to build it out." },
    { target: "present", title: "Go live", body: "Activate a lineup, pick a song, and hit Present (or F5) to send it to the audience display." },
  ],
};
