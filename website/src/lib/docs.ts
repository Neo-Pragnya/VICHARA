export interface WebsiteDocument {
  id: string;
  data: {
    website: "public" | "draft";
    title?: string;
    description?: string;
    status?: string;
  };
}

export function isWebsitePublished(
  document: Pick<WebsiteDocument, "data">,
): boolean {
  return document.data.website === "public";
}

export function routeSlug(id: string): string {
  return id.replace(/(^|\/)index$/, "");
}

export function documentHref(id: string, baseUrl = "/"): string {
  const route = routeSlug(id)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}docs/${route ? `${route}/` : ""}`;
}

export function displayTitle(id: string, title?: string): string {
  if (title) return title;
  const name = id.split("/").at(-1) ?? id;
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function themeForDocument(id: string): string {
  return id.split("/")[0] ?? "knowledge";
}

export function sourcePath(id: string): string {
  return id.endsWith("/index")
    ? `${id.slice(0, -"/index".length)}/README.md`
    : `${id}.md`;
}
