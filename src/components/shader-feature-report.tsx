import { readShaderReport } from "@/lib/shader-report";
import type { Project } from "@/lib/types";

export function ShaderFeatureReport({ project }: { project: Project }) {
  if (project.artifactType !== "shader_pack") return null;
  let report;
  // Recheck source, including browser-restored projects; don't trust cached report fields.
  try { report = readShaderReport(project.files); } catch { return null; }
  const incomplete = report.features.filter(feature => feature.status !== "implemented").length;
  return <details className="shader-feature-report" open>
    <summary>Shader feature plan{incomplete ? ` · ${incomplete} approximated or omitted` : ""}</summary>
    <p className="shader-report-notice">Source links checked. Feature statuses are the model&apos;s report; compilation and appearance are not verified.</p>
    <p>{report.goal}</p>
    <details><summary>Reference interpretation and rendering plan</summary><p>{report.referenceSummary}</p><ol>{report.pipeline.map((step, index) => <li key={index}>{step}</li>)}</ol></details>
    <ul>{report.features.map(feature => <li key={feature.name}>
      <div><strong>{feature.name}</strong><span className={`shader-feature-status status-${feature.status}`}>{feature.status === "implemented" ? "Implemented · untested" : feature.status === "approximation" ? "Approximation" : "Omitted"}</span></div>
      <p>{feature.technique}</p>
      {feature.limitations && <p className="shader-report-notice">{feature.limitations}</p>}
      {feature.files.length > 0 && <details><summary>Source files</summary><ul>{feature.files.map(path => <li key={path}>{path}</li>)}</ul></details>}
    </li>)}</ul>
  </details>;
}
