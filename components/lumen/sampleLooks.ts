import type { Look } from "./data";

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
  {
    id: "charcoal", name: "Charcoal", kind: "Solid", swatch: "#161618",
    css: "radial-gradient(120% 90% at 50% 0%, #1f1f22 0%, #131315 60%, #0a0a0b 100%)",
  },
  {
    id: "ink", name: "Ink", kind: "Solid", swatch: "#0a0e14",
    css: "radial-gradient(120% 90% at 50% 100%, #10161f 0%, #090c11 60%, #050608 100%)",
  },
  {
    id: "stone", name: "Stone", kind: "Solid", swatch: "#1c1a17",
    css: "radial-gradient(120% 90% at 50% 0%, #24211d 0%, #17140f 60%, #0d0b09 100%)",
  },
  {
    id: "navy", name: "Navy", kind: "Solid", swatch: "#0a1120",
    css: "radial-gradient(120% 90% at 50% 100%, #101c33 0%, #0a1120 60%, #050810 100%)",
  },
  {
    id: "maroon", name: "Maroon", kind: "Solid", swatch: "#1a0a0d",
    css: "radial-gradient(120% 90% at 50% 0%, #260f14 0%, #170a0d 60%, #0c0506 100%)",
  },
  {
    id: "sunrise", name: "Sunrise", kind: "Gradient", swatch: "linear-gradient(135deg,#f97316,#ec4899)",
    css: "linear-gradient(135deg, #3a1c14 0%, #331730 55%, #140a17 100%)",
  },
  {
    id: "ocean", name: "Ocean", kind: "Gradient", swatch: "linear-gradient(135deg,#0ea5e9,#0f172a)",
    css: "linear-gradient(150deg, #082032 0%, #0b2a3d 45%, #061018 100%)",
  },
  {
    id: "ember", name: "Ember", kind: "Gradient", swatch: "linear-gradient(135deg,#f87171,#b45309)",
    css: "linear-gradient(150deg, #3a1410 0%, #2a1608 55%, #120705 100%)",
  },
  {
    id: "meadow", name: "Meadow", kind: "Gradient", swatch: "linear-gradient(135deg,#34d399,#0f766e)",
    css: "linear-gradient(150deg, #0f2a22 0%, #0c2a24 55%, #061512 100%)",
  },
  {
    id: "twilight", name: "Twilight", kind: "Gradient", swatch: "linear-gradient(135deg,#6366f1,#1e1b4b)",
    css: "linear-gradient(150deg, #1f1b3d 0%, #171331 55%, #0a0818 100%)",
  },
  {
    id: "rose", name: "Rose", kind: "Gradient", swatch: "linear-gradient(135deg,#fb7185,#7c2d3f)",
    css: "linear-gradient(150deg, #33141d 0%, #2a1017 55%, #130709 100%)",
  },
  {
    id: "glacier", name: "Glacier", kind: "Gradient", swatch: "linear-gradient(135deg,#a5f3fc,#164e63)",
    css: "linear-gradient(150deg, #0c2732 0%, #0a2229 55%, #050f13 100%)",
  },
  {
    id: "gold", name: "Gold", kind: "Gradient", swatch: "linear-gradient(135deg,#fbbf24,#78350f)",
    css: "linear-gradient(150deg, #2e2107 0%, #241a09 55%, #110c04 100%)",
  },
  {
    id: "violet", name: "Violet", kind: "Gradient", swatch: "linear-gradient(135deg,#c084fc,#4c1d95)",
    css: "linear-gradient(150deg, #291b45 0%, #1f1538 55%, #0e0a1c 100%)",
  },
  {
    id: "dawn", name: "Dawn", kind: "Image", swatch: "repeating-linear-gradient(0deg,#2b2620 0 4px,#1a1712 4px 8px)",
    css: "repeating-linear-gradient(4deg, rgba(255,255,255,.04) 0 12px, rgba(255,255,255,0) 12px 24px), linear-gradient(180deg,#231f19,#0d0b08)",
    note: "image",
  },
  {
    id: "diagonal", name: "Diagonal Lines", kind: "Image", swatch: "repeating-linear-gradient(45deg,#26262e 0 6px,#17171d 6px 12px)",
    css: "repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 8px, rgba(255,255,255,0) 8px 16px), linear-gradient(180deg,#1c1c24,#0a0a0e)",
    note: "image",
  },
  {
    id: "grid", name: "Grid", kind: "Image", swatch: "repeating-linear-gradient(0deg,#26262e 0 2px,transparent 2px 26px)",
    css: "repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 32px), linear-gradient(180deg,#17171d,#0a0a0e)",
    note: "image",
  },
  {
    id: "dots", name: "Dots", kind: "Image", swatch: "radial-gradient(#2e2e38 2px, transparent 2px)",
    css: "radial-gradient(rgba(255,255,255,.08) 2px, transparent 2px), linear-gradient(180deg,#18181f,#0a0a0e)",
    note: "image",
  },
  {
    id: "rings", name: "Rings", kind: "Video", swatch: "repeating-radial-gradient(circle,#233b3a 0 4px,#12201f 4px 8px)",
    css: "repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,.06) 0 2px, transparent 2px 28px), linear-gradient(160deg,#101f24,#07100f)",
    note: "video",
  },
  {
    id: "chevron", name: "Chevron", kind: "Video", swatch: "repeating-linear-gradient(135deg,#2a2440 0 5px,#171331 5px 10px)",
    css: "repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 10px, rgba(255,255,255,0) 10px 20px), repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 10px, rgba(255,255,255,0) 10px 20px), linear-gradient(160deg,#181432,#0a0818)",
    note: "video",
  },
];
