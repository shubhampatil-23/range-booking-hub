export interface AppConfig {
  companyBeUrl: string;
  companyToken: string;
}

let cached: AppConfig | null = null;
let pending: Promise<AppConfig> | null = null;

export async function getAppConfig(): Promise<AppConfig> {
  if (cached) return cached;
  if (pending) return pending;

  pending = fetch("/assets/config/config.json")
    .then((res) => {
      if (!res.ok) throw new Error(`Config load failed: ${res.status}`);
      return res.json() as Promise<AppConfig>;
    })
    .then((cfg) => {
      cached = cfg;
      pending = null;
      return cfg;
    })
    .catch((err) => {
      pending = null;
      throw err;
    });

  return pending;
}
