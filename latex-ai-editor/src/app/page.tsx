import Link from "next/link";
import { FileCode2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6">
      <div className="flex items-center gap-2">
        <FileCode2 className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">LaTeX AI Editor</h1>
      </div>
      <p className="max-w-md text-center text-muted-foreground">
        Create developer resumes and documents with LaTeX. Edit with AI assistance and
        compile to PDF.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button asChild size="lg" className="gap-2">
          <Link href="/templates">
            <FileCode2 className="h-4 w-4" />
            Resume templates
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="gap-2">
          <Link href="/project/new">
            <FileText className="h-4 w-4" />
            Blank project
          </Link>
        </Button>
      </div>
    </div>
  );
}
