"use client";

import { InteractiveButton } from "../ui/Interactive";
import type { LookOption } from "../data";
import { LookBackground } from "./LookBackground";
import type { ConnectedOutput } from "./previewPanelHelpers";

// Lists connected output displays, with a shortcut into the displays modal.
export function ConnectedOutputsList({
  connectedOutputs, outputAspectRatio, curLook, black, onManageDisplays,
}: {
  connectedOutputs: ConnectedOutput[]; outputAspectRatio: number; curLook: LookOption; black: boolean; onManageDisplays: () => void;
}) {
  return (
    <div className="flex-none pt-2.5 mt-0.5 border-t border-border">
      <div className="text-[10.5px] font-semibold tracking-[.06em] uppercase text-faint mb-1.75">Connected outputs</div>
      {connectedOutputs.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {connectedOutputs.map((output) => (
            <div key={output.id} className="flex items-center gap-2 p-[7px_9px] rounded-2 border border-border bg-panel2">
              <div className="w-11 flex-none rounded-1 overflow-hidden border border-border relative" style={{ aspectRatio: outputAspectRatio }}>
                <LookBackground look={curLook} black={black} preview />
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-ok flex-none" />
              <span className="text-[11.5px] text-text truncate flex-1 min-w-0">{output.name}</span>
              <span className="font-mono text-[10.5px] text-muted whitespace-nowrap flex-none">{output.liveState}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[11.5px] text-faint p-[7px_9px] rounded-2 border border-dashed border-border">No displays connected</div>
      )}
      <InteractiveButton
        onClick={onManageDisplays}
        className="mt-1.75 w-full h-6.5 rounded-1.75 border border-border bg-transparent text-accent text-[11px] cursor-pointer hover:bg-panel2"
      >
        Manage displays…
      </InteractiveButton>
    </div>
  );
}
