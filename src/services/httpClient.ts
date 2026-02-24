import axios, { type AxiosRequestConfig } from "axios";

/**
 * Safely join a base URL and a path, avoiding double slashes.
 */
export function urlJoin(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

const httpClient = axios.create({
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

/** Convenience wrappers that accept a runtime baseUrl */
export const http = {
  get<T = unknown>(baseUrl: string, path: string, config?: AxiosRequestConfig) {
    return httpClient.get<T>(urlJoin(baseUrl, path), config).then((r) => r.data);
  },

  post<T = unknown>(baseUrl: string, path: string, body?: unknown, config?: AxiosRequestConfig) {
    return httpClient.post<T>(urlJoin(baseUrl, path), body, config).then((r) => r.data);
  },
};

export default httpClient;
