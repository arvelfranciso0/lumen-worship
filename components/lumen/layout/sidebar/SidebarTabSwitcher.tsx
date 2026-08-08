"use client";

import type { UseLumen } from "../../useLumen";

type SidebarTabSwitcherProps = {
  mode: UseLumen["state"]["mode"];
  patch: UseLumen["patch"];
  tabStyle: UseLumen["tabStyle"];
};

// Songs / Bible / Lineups mode switcher.
export function SidebarTabSwitcher({ mode, patch, tabStyle }: SidebarTabSwitcherProps) {
  return (
    <div className="flex p-0.75 gap-0.75 rounded-[10px] bg-panel2 border border-border">
      <button onClick={() => patch({ mode: "songs", idx: 0 })} className={tabStyle(mode === "songs")}>Songs</button>
      <button onClick={() => patch({ mode: "bible", idx: 0 })} className={tabStyle(mode === "bible")}>Bible</button>
      <button onClick={() => patch({ mode: "lineups", idx: 0 })} className={tabStyle(mode === "lineups")}>Lineups</button>
    </div>
  );
}
