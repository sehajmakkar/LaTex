"use client";

import { useSyncExternalStore } from "react";
import { ConfidentialFolder } from "@/components/ui/confidential-folder";
import { VeroLogo, VeroMark } from "@/components/brand/VeroLogo";
import { site } from "@/lib/site";

/**
 * The sign-in page's folder: a resume peeks out on hover; clicking pulls it
 * out and flips it to Vero's tagline. The front is a real template preview.
 */
const subscribe = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
/** Laptop screens (under 800px tall) get a smaller folder so the panel's text keeps its spacing. */
const useShortScreen = () => useSyncExternalStore(subscribe, () => window.innerHeight < 800, () => false);

export function ResumeFolder() {
  const short = useShortScreen();
  return (
    <ConfidentialFolder
      stage={false}
      width={short ? 244 : 296}
      height={short ? 305 : 370}
      title="resume.tex"
      cover={
        <div className="relative flex h-full flex-col justify-between px-6 py-7">
          <VeroMark className="h-5 text-zinc-200" />
          <div>
            <p className="font-mono text-[11px] text-zinc-500">\documentclass{"{resume}"}</p>
            <h3 className="mt-2 font-display text-[22px] leading-tight tracking-tight text-zinc-100">resume.tex</h3>
            <p className="mt-1.5 text-[13px] text-zinc-400">Click to take it out</p>
          </div>
        </div>
      }
      letterFront={
        // eslint-disable-next-line @next/next/no-img-element -- static preview inside a 3D transform
        <img src="/templates/catalog/jakes-resume.webp" alt="" className="h-full w-full object-cover object-top" draggable={false} />
      }
      letterBack={
        <div className="flex h-full flex-col justify-between p-6 text-zinc-900">
          <VeroLogo className="h-4 text-zinc-900" />
          <div>
            <p className="font-display text-[26px] leading-[1.05] tracking-tight">Cursor for LaTeX</p>
            <p className="mt-2 text-[14px] text-zinc-600">Write smarter, land faster.</p>
          </div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">{site.tagline}</p>
        </div>
      }
    />
  );
}
