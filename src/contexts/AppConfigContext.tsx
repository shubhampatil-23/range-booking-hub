import React, { createContext, useContext, useEffect, useState } from "react";

// ── Typed config shape ──────────────────────────────────────
export interface AppConfig {
  companyToken: string;
  companyEnrollmentCode?: string;
  companyName: string;
  url: string;
  coreUrl?: string;
  logo?: string;
  hubApplicationName?: string;
  address?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown; // allow extra keys without breaking
}

/** Keys that MUST be present for the app to function */
const REQUIRED_KEYS: (keyof AppConfig)[] = ["companyToken", "companyName", "url"];

function validateConfig(data: unknown): AppConfig {
  if (!data || typeof data !== "object") {
    throw new Error("Config is not a valid object");
  }
  const cfg = data as Record<string, unknown>;
  const missing = REQUIRED_KEYS.filter(
    (k) => cfg[k] === undefined || cfg[k] === null || cfg[k] === ""
  );
  if (missing.length > 0) {
    throw new Error(`Config missing required keys: ${missing.join(", ")}`);
  }
  return cfg as unknown as AppConfig;
}

// ── Context value ───────────────────────────────────────────
interface AppConfigContextValue {
  config: AppConfig | null;
  loading: boolean;
  error: Error | null;
  getConfig: <K extends keyof AppConfig>(key: K) => AppConfig[K] | undefined;
  getAll: () => AppConfig | null;
}

const AppConfigContext = createContext<AppConfigContextValue | undefined>(
  undefined
);

// ── Provider ────────────────────────────────────────────────
export const AppConfigProvider: React.FC<{
  url?: string;
  children: React.ReactNode;
}> = ({ url = "/config.json", children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1️⃣  Check for server-injected config first (no network round-trip)
    const injected = (window as any).APP_CONFIG;
    if (injected) {
      try {
        const validated = validateConfig(injected);
        if (mounted) setConfig(validated);
      } catch (err) {
        if (mounted) setError(err as Error);
      }
      if (mounted) setLoading(false);
      return;
    }

    // 2️⃣  Fetch config.json (once)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const validated = validateConfig(data);
        if (mounted) setConfig(validated);
      })
      .catch((err) => {
        if (mounted) setError(err as Error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [url]);

  const value: AppConfigContextValue = {
    config,
    loading,
    error,
    getConfig: (key) => (config ? config[key] : undefined),
    getAll: () => config,
  };

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
};

// ── Hook ────────────────────────────────────────────────────
export const useAppConfig = () => {
  const ctx = useContext(AppConfigContext);
  if (!ctx)
    throw new Error("useAppConfig must be used within AppConfigProvider");
  return ctx;
};
