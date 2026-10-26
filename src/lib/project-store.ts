import type { Project } from "./types";

const TTL = 30 * 60 * 1000;
const globalStore = globalThis as typeof globalThis & {
  modhorizonProjects?: Map<
    string,
    { project: Project; artifact: Uint8Array; expires: number; ownerAccountId?:string }
  >;
};
const projects = (globalStore.modhorizonProjects ??= new Map());

export function saveArtifact(project: Project, artifact: Uint8Array) {
  for (const [id, entry] of projects)
    if (entry.expires < Date.now()) projects.delete(id);
  while (projects.size >= 20) projects.delete(projects.keys().next().value!);
  projects.set(project.id, { project, artifact, expires: Date.now() + TTL });
}

export function getArtifact(id: string) {
  const entry = projects.get(id);
  if (entry && entry.expires > Date.now()) return entry;
  projects.delete(id);
  return undefined;
}
export function bindArtifactOwner(id:string, accountId:string) {
  const entry=projects.get(id);if(entry)entry.ownerAccountId=accountId;
}
export function removeAccountArtifacts(accountId:string) {
  for(const [id,entry] of projects)if(entry.ownerAccountId===accountId)projects.delete(id);
}
export function removeArtifact(id:string) { projects.delete(id); }
