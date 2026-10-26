import { billingEnv } from "@/lib/billing-service";
import { downloadStoredArtifact } from "@/lib/artifact-download";
export const runtime="nodejs";
export async function GET(_request:Request,context:{params:Promise<{id:string}>}) {
  return downloadStoredArtifact((await context.params).id,billingEnv);
}
