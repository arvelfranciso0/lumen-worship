export type Section = {
  label: string;
  lines: string[];
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: string;
  cat: string;
  tags: string[];
  fav: boolean;
  when: string;
  sections: Section[];
};

export type Look = {
  id: string;
  name: string;
  kind: string;
  swatch: string;
  css: string;
  note?: "image" | "video";
};

export const SONGS: Song[] = [
  {
    id: "s1", title: "Amazing Grace", artist: "John Newton · Trad.", key: "G", bpm: "72 BPM",
    cat: "Hymn", tags: ["Hymn", "Grace"], fav: true, when: "8:12",
    sections: [
      { label: "Verse 1", lines: ["Amazing grace, how sweet the sound", "That saved a wretch like me"] },
      { label: "Verse 1", lines: ["I once was lost, but now am found", "Was blind, but now I see"] },
      { label: "Verse 2", lines: ["'Twas grace that taught my heart to fear", "And grace my fears relieved"] },
      { label: "Verse 2", lines: ["How precious did that grace appear", "The hour I first believed"] },
      { label: "Verse 3", lines: ["Through many dangers, toils and snares", "I have already come"] },
      { label: "Verse 3", lines: ["'Tis grace hath brought me safe thus far", "And grace will lead me home"] },
    ],
  },
  {
    id: "s2", title: "Holy, Holy, Holy", artist: "Reginald Heber · Trad.", key: "D", bpm: "68 BPM",
    cat: "Hymn", tags: ["Hymn", "Opening"], fav: false, when: "8:04",
    sections: [
      { label: "Verse 1", lines: ["Holy, holy, holy!", "Lord God Almighty"] },
      { label: "Verse 1", lines: ["Early in the morning", "Our song shall rise to Thee"] },
      { label: "Verse 2", lines: ["All the saints adore Thee", "Casting down their golden crowns"] },
      { label: "Verse 2", lines: ["Around the glassy sea", "Cherubim and seraphim"] },
    ],
  },
  {
    id: "s3", title: "Morning Light Rising", artist: "Hipe Collective", key: "A", bpm: "74 BPM",
    cat: "Contemporary", tags: ["Modern", "Set opener"], fav: true, when: "Wed",
    sections: [
      { label: "Verse 1", lines: ["Morning light is rising", "Over every shadow"] },
      { label: "Verse 1", lines: ["You were never distant", "You were always near"] },
      { label: "Chorus", lines: ["So we lift our voices", "Louder than the silence", "You are worthy still"] },
      { label: "Verse 2", lines: ["Every quiet promise", "Kept before we asked"] },
      { label: "Chorus", lines: ["So we lift our voices", "Louder than the silence", "You are worthy still"] },
      { label: "Bridge", lines: ["Nothing here can shake us", "Nothing here can shake us", "You go before us"] },
      { label: "Outro", lines: ["You are worthy still"] },
    ],
  },
  {
    id: "s4", title: "Great Is Thy Faithfulness", artist: "Thomas Chisholm · Trad.", key: "C", bpm: "70 BPM",
    cat: "Hymn", tags: ["Hymn", "Communion"], fav: false, when: "Sun",
    sections: [
      { label: "Verse 1", lines: ["Great is Thy faithfulness", "O God my Father"] },
      { label: "Verse 1", lines: ["There is no shadow of turning with Thee"] },
      { label: "Chorus", lines: ["Great is Thy faithfulness", "Morning by morning new mercies I see"] },
      { label: "Chorus", lines: ["All I have needed Thy hand hath provided"] },
    ],
  },
  {
    id: "s5", title: "Held By The Same Hand", artist: "Ridgeway Worship", key: "B♭", bpm: "66 BPM",
    cat: "Contemporary", tags: ["Response", "Slow"], fav: false, when: "Sun",
    sections: [
      { label: "Verse 1", lines: ["When the room goes quiet", "And the questions stay"] },
      { label: "Chorus", lines: ["I am held by the same hand", "That holds the morning"] },
      { label: "Bridge", lines: ["Steady, steady", "You have not let go"] },
    ],
  },
  {
    id: "s6", title: "Come Thou Fount", artist: "Robert Robinson · Trad.", key: "E", bpm: "76 BPM",
    cat: "Hymn", tags: ["Hymn", "Favorite"], fav: true, when: "Jul 12",
    sections: [
      { label: "Verse 1", lines: ["Come thou fount of every blessing", "Tune my heart to sing Thy grace"] },
      { label: "Verse 1", lines: ["Streams of mercy never ceasing", "Call for songs of loudest praise"] },
      { label: "Verse 2", lines: ["Here I raise mine Ebenezer", "Hither by Thy help I come"] },
    ],
  },
  {
    id: "s7", title: "Noche De Paz", artist: "Trad. · Español", key: "F", bpm: "62 BPM",
    cat: "Español", tags: ["Español", "Christmas"], fav: false, when: "Dec",
    sections: [
      { label: "Verso 1", lines: ["Noche de paz, noche de amor", "Todo duerme en derredor"] },
      { label: "Verso 2", lines: ["Entre los astros que esparcen su luz"] },
    ],
  },
];

export const LOOKS: Look[] = [
  {
    id: "midnight", name: "Midnight", kind: "Solid", swatch: "#0b0b10",
    css: "radial-gradient(120% 90% at 50% 0%, #17171f 0%, #0a0a0e 60%, #060608 100%)",
  },
  {
    id: "aurora", name: "Aurora", kind: "Gradient", swatch: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
    css: "linear-gradient(135deg, #241a45 0%, #16233f 55%, #0b0e18 100%)",
  },
  {
    id: "sanctuary", name: "Sanctuary", kind: "Image", swatch: "repeating-linear-gradient(45deg,#2b2b33 0 4px,#1a1a20 4px 8px)",
    css: "repeating-linear-gradient(38deg, rgba(255,255,255,.045) 0 10px, rgba(255,255,255,0) 10px 20px), linear-gradient(180deg,#1b1a22,#0c0c11)",
    note: "image",
  },
  {
    id: "motion", name: "Motion", kind: "Video", swatch: "repeating-linear-gradient(90deg,#233b3a 0 4px,#12201f 4px 8px)",
    css: "repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 12px, rgba(255,255,255,0) 12px 24px), linear-gradient(160deg,#0f2320,#08100f)",
    note: "video",
  },
];

export const BOOKS = [
  "Genesis", "Exodus", "Psalms", "Proverbs", "Isaiah", "Matthew", "Mark", "Luke",
  "John", "Acts", "Romans", "1 Corinthians", "Ephesians", "Philippians", "Hebrews",
  "James", "1 John", "Revelation",
];

export const CHAPTER_COUNTS: Record<string, number> = {
  Genesis: 50, Exodus: 40, Psalms: 150, Proverbs: 31, Isaiah: 66, Matthew: 28, Mark: 16,
  Luke: 24, John: 21, Acts: 28, Romans: 16, "1 Corinthians": 16, Ephesians: 6,
  Philippians: 4, Hebrews: 13, James: 5, "1 John": 5, Revelation: 22,
};

export const TRANSLATIONS = ["KJV", "ASV", "WEB", "RVR"];

export const PASSAGES: Record<string, string[]> = {
  "Psalms 23": [
    "The LORD is my shepherd; I shall not want.",
    "He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
    "He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake.",
    "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me.",
    "Thou preparest a table before me in the presence of mine enemies: my cup runneth over.",
    "Surely goodness and mercy shall follow me all the days of my life.",
  ],
  "John 1": [
    "In the beginning was the Word, and the Word was with God, and the Word was God.",
    "The same was in the beginning with God.",
    "All things were made by him; and without him was not any thing made that was made.",
    "In him was life; and the life was the light of men.",
    "And the light shineth in darkness; and the darkness comprehended it not.",
  ],
  "Isaiah 40": [
    "Hast thou not known? hast thou not heard, that the everlasting God fainteth not, neither is weary?",
    "He giveth power to the faint; and to them that have no might he increaseth strength.",
    "Even the youths shall faint and be weary, and the young men shall utterly fall:",
    "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles.",
  ],
  "Romans 8": [
    "And we know that all things work together for good to them that love God.",
    "If God be for us, who can be against us?",
    "Who shall separate us from the love of Christ?",
    "Nay, in all these things we are more than conquerors through him that loved us.",
  ],
};

export const FALLBACK = [
  "Verse text for this chapter is not downloaded yet.",
  "Tap Sync library to fetch the full translation.",
];

export const VNUMS: Record<string, number[]> = {
  "Isaiah 40": [28, 29, 30, 31],
  "Romans 8": [28, 31, 35, 37],
};

export const CHIPS = ["All", "Favorites", "Hymn", "Contemporary", "Español"];
export const SORTS = ["Recent", "A–Z", "Key"];
