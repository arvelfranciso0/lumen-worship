"use client";

import Image from "next/image";
import { cx } from "../../cx";

// App logo, name, and version badge; name/version hidden below desktop width.
export function HeaderBrand({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div className={cx("flex items-center gap-2.5 flex-none", isDesktop ? "w-73.5" : "w-auto")}>
      <div className="w-6.5 h-6.5 rounded-2">
        <Image src={"/lumen.png"} width={200} height={200} alt="Lume" />
      </div>
      {isDesktop && (
        <>
          <div className="text-[15px] font-semibold tracking-[-0.01em]">
            Lumen Worship
          </div>
          <div className="font-mono text-[10px] text-faint border border-border p-[2px_5px] rounded-[5px]">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </div>
        </>
      )}
    </div>
  );
}
