export type CompileState =
  | { status: "idle" }
  | { status: "compiling"; startedAt: Date }
  | { status: "success"; pdfUrl: string; compiledAt: Date }
  | { status: "error"; message: string; log?: string };

export type Project = {
  id: string;
  name: string;
  content: string;
  userId: string | null;
  templateId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewProject = Omit<Project, "id" | "createdAt" | "updatedAt">;

export type CompileResult = {
  pdfUrl: string;
  log?: string;
};

export type ApiResponse<T> = {
  data: T;
  meta?: { timestamp: string };
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type TemplateVariable = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
};

export type TemplateManifest = {
  id: string;
  name: string;
  description: string;
  category: string;
  variables: TemplateVariable[];
};

export type Template = TemplateManifest & {
  content: string;
};

export type TemplateWithContent = Template;
