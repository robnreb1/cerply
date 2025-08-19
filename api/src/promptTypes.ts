export type ManifestEntry = {
  id: string;        // kebab from filename + 6-char hash
  title: string;     // from file name or first heading/line
  role?: string;     // "curation" | "generation" | "review" | "coach" | etc.
  purpose?: string;  // short description if present
  path: string;      // relative path under docs/
  hash: string;      // sha1 of contents
  updatedAt: string; // ISO mtime
};

export type LoadedPrompt = {
  id: string;
  meta: ManifestEntry;
  raw: string;
  template?: string; // first fenced block or explicit "template" when JSON
};
