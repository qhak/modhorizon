/** Maps Next.js routes to their equivalents in the standalone index.html. */
export function staticHref(href: string, workspaceUrl: string): string {
  if (href === "/") return "#";
  if (href.startsWith("/media/")) return `public${href}`;
  if (href.startsWith("/api/examples/")) return new URL(href, workspaceUrl).href;
  if (href === "/create" || href.startsWith("/create?"))
    return workspaceUrl + href.slice("/create".length);
  return href;
}
