import React, { createContext, useContext, useEffect, useState } from "react";

export type AppConfig = Record<string, any>;

interface AppConfigContextValue {
  config: AppConfig | null;
  loading: boolean;
  error: Error | null;
  getConfig: (key: string) => any;
  getAll: () => AppConfig | null;
}

const AppConfigContext = createContext<AppConfigContextValue | undefined>(
  undefined
);

export const AppConfigProvider: React.FC<{
  url?: string;
  children: React.ReactNode;
}> = ({ url = "/config.json", children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (mounted) setConfig(data);
      })
      .catch((err) => {
        if (mounted) setError(err);
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
    getConfig: (key: string) => (config ? config[key] : undefined),
    getAll: () => config,
  };

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = () => {
  const ctx = useContext(AppConfigContext);
  if (!ctx)
    throw new Error("useAppConfig must be used within AppConfigProvider");
  return ctx;
};
