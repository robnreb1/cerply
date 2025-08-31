/* web/lib/api.ts */
export type ModuleOutline = {
  id: string;
  title: string;
  estMinutes?: number;
};

export type IngestPreviewResp =
  | { ok: true; modules: ModuleOutline[] }
  | { ok: false; error: unknown };

export type Mcq = {
  id: string;
  stem: string;
  options: string[];
  correctIndex: number;
};

export type FreeQ = {
  prompt: string;
};

export type GeneratedItem = {
  title: string;
  explanation: string;
  questions?: { mcq?: Mcq; free?: FreeQ };
};

export type IngestGenerateResp =
  | { ok: true; items: GeneratedItem[] }
  | { ok: false; error: unknown };

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

export async function previewIngest(input: {
  text?: string;
  url?: string;
  artefact?: unknown;
}): Promise<IngestPreviewResp> {
  try {
    const body =
      input.text != null
        ? { text: input.text }
        : input.url != null
        ? { url: input.url }
        : { artefact: input.artefact ?? { kind: 'text', text: '' } };

    const r = await fetch('/api/ingest/preview', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });

    const j = await r.json();
    if (!r.ok || !j?.modules) {
      return { ok: false, error: j?.error ?? new Error('Preview failed') };
    }
    return { ok: true, modules: j.modules as ModuleOutline[] };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function generateFromModules(args: {
  artefact:
    | { kind: 'text'; text: string }
    | { kind: 'url'; url: string }
    | Record<string, unknown>;
  modules: Pick<ModuleOutline, 'id' | 'title'>[];
  prefs?: Record<string, unknown>;
}): Promise<IngestGenerateResp> {
  try {
    const r = await fetch('/api/ingest/generate', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        artefact: args.artefact,
        modules: args.modules,
        prefs: args.prefs ?? { audience: 'beginner', tone: 'neutral' },
      }),
    });
    const j = await r.json();
    if (!r.ok || !j?.items) {
      return { ok: false, error: j?.error ?? new Error('Generate failed') };
    }
    return { ok: true, items: j.items as GeneratedItem[] };
  } catch (err) {
    return { ok: false, error: err };
  }
}
