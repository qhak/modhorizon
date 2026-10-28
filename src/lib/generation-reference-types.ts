import type { ArtifactType } from "./types";

/** Curated server-owned guidance; examples are not assumed to be runnable. */
export type ReferenceCard = {
  id: string;
  artifactType: ArtifactType;
  targets?: string[];
  minVersion?: string;
  maxVersion?: string;
  pattern: RegExp;
  title: string;
  guidance: string;
  example?: string;
  sources: string[];
  evidence: "guidance" | "verified-example";
};
