"use client";

import { FileText, Loader2 } from "lucide-react";

type PdfPreviewProps = {
  url: string | null;
  isLoading?: boolean;
};

export function PdfPreview({ url, isLoading }: PdfPreviewProps) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border bg-background/70 px-4 py-2">
        <span className="text-sm font-medium text-muted-foreground">PDF Preview</span>
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {url ? (
          <iframe
            src={url}
            title="PDF Preview"
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
            <FileText className="h-16 w-16 opacity-20" />
            <div className="text-center">
              <p className="font-medium">No PDF generated yet</p>
              <p className="text-sm text-muted-foreground">Click &quot;Compile&quot; to generate your PDF</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
