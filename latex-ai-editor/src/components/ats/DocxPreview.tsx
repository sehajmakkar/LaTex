"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type DocxPreviewProps = {
  fileUrl: string;
  className?: string;
};

export function DocxPreview({ fileUrl, className }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fit, setFit] = useState<{ scale: number; w: number; h: number } | null>(null);

  const updateFit = () => {
    const wrapper = wrapperRef.current;
    const container = containerRef.current;
    if (!wrapper || !container || container.scrollWidth <= 0) return;
    const wrapperWidth = wrapper.clientWidth;
    const contentWidth = container.scrollWidth;
    const contentHeight = container.scrollHeight;
    if (wrapperWidth <= 0) return;
    const scale = Math.min(1, wrapperWidth / contentWidth);
    setFit({ scale, w: contentWidth, h: contentHeight });
  };

  useEffect(() => {
    if (!containerRef.current || !fileUrl) return;

    let cancelled = false;
    setStatus("loading");
    setErrorMessage(null);
    setFit(null);

    (async () => {
      try {
        const res = await fetch(fileUrl, { credentials: "include" });
        if (!res.ok) {
          throw new Error(res.status === 401 ? "Unauthorized" : "Failed to load document");
        }
        const blob = await res.blob();
        if (cancelled || !containerRef.current) return;

        const { renderAsync } = await import("docx-preview");
        containerRef.current.innerHTML = "";
        await renderAsync(blob, containerRef.current, null, {
          className: "ats-docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });

        if (!cancelled) {
          setStatus("done");
          requestAnimationFrame(() => updateFit());
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Failed to preview document");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  useEffect(() => {
    if (status !== "done" || !wrapperRef.current || !containerRef.current) return;
    const wrapper = wrapperRef.current;
    const ro = new ResizeObserver(() => updateFit());
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [status]);

  if (status === "error") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground ${className ?? ""}`}
      >
        <p>{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className={`relative h-full min-h-0 overflow-hidden ${className ?? ""}`}>
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-muted/30">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading document…</p>
        </div>
      )}
      <div
        ref={wrapperRef}
        className="h-full w-full overflow-auto bg-white"
        style={{ visibility: status === "done" ? "visible" : "hidden" }}
      >
        <div
          style={
            fit
              ? {
                  width: fit.w * fit.scale,
                  height: fit.h * fit.scale,
                  position: "relative",
                }
              : undefined
          }
        >
          <div
            style={
              fit
                ? {
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: fit.w,
                    height: fit.h,
                    transformOrigin: "top left",
                    transform: `scale(${fit.scale})`,
                    overflow: "visible",
                  }
                : undefined
            }
          >
            <div ref={containerRef} className="min-w-0" data-docx-preview />
          </div>
        </div>
      </div>
    </div>
  );
}
