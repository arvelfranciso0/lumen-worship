"use client";

import { MainPanelHeader } from "./MainPanelHeader";
import { MainPanelToolbar } from "./MainPanelToolbar";
import { SlidesPanel } from "../presentation/SlidesPanel";
import { TransitionRow } from "../presentation/TransitionRow";
import type { UseLumen } from "../useLumen";

// Authoring half of the operator screen: song/text style/slides/backgrounds.
export function MainPanel({ lumen }: { lumen: UseLumen }) {
  return (
    <>
      <MainPanelHeader lumen={lumen} />
      <MainPanelToolbar lumen={lumen} />
      <TransitionRow lumen={lumen} />
      <SlidesPanel lumen={lumen} />
    </>
  );
}
