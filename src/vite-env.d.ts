/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  insightflare?: {
    track?: (name: string, data?: Record<string, unknown>) => void;
    trackOnce?: (name: string, data?: Record<string, unknown>) => void;
  };
}

