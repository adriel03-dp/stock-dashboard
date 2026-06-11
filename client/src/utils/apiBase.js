const trimTrailingSlashes = (value) => value.replace(/\/+$/, "");

export function getApiBaseUrl() {
  const configuredBase = import.meta.env.VITE_API_BASE;
  if (configuredBase) {
    return trimTrailingSlashes(configuredBase);
  }

  if (import.meta.env.DEV) {
    return "/api";
  }

  return `${trimTrailingSlashes(window.location.origin)}/api`;
}
