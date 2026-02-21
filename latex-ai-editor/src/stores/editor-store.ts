import { create } from "zustand";
import type { CompileState } from "@/types";

type EditorStore = {
  compileState: CompileState;
  setCompileState: (state: CompileState) => void;
  pdfUrl: string | null;
  setPdfUrl: (url: string | null) => void;
  isPreviewVisible: boolean;
  togglePreview: () => void;
  activeTab: "source" | "output";
  setActiveTab: (tab: "source" | "output") => void;
};

export const useEditorStore = create<EditorStore>((set) => ({
  compileState: { status: "idle" },
  setCompileState: (state) => set({ compileState: state }),
  pdfUrl: null,
  setPdfUrl: (url) => set({ pdfUrl: url }),
  isPreviewVisible: true,
  togglePreview: () => set((s) => ({ isPreviewVisible: !s.isPreviewVisible })),
  activeTab: "source",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
