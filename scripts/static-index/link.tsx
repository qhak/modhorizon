import type { ComponentProps } from "react";
import { staticHref } from "./hrefs";

// Replaced at bundle time with the workspace URL the page should link to.
declare const WORKSPACE_URL: string;

/** Stands in for next/link in the standalone page, where there is no Next router. */
export default function Link({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  return <a href={staticHref(href, WORKSPACE_URL)} {...props} />;
}
