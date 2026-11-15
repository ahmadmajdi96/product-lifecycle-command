import { createFileRoute, notFound } from "@tanstack/react-router";
import { DefinitionWorkspace, workspaceOptions } from "@/components/plm/definition-workspace";
export const Route = createFileRoute("/_authenticated/changes/$kind")({
 loader: ({ context, params }) => { if (!["ecr", "eco", "ecn"].includes(params.kind)) throw notFound(); return context.queryClient.ensureQueryData(workspaceOptions); },
 head: ({ params }) => ({ meta: [{ title: `${params.kind.toUpperCase()} · Cortanex PLM` }, { name: "description", content: "Revision-specific engineering change and controlled cutover." }, { property: "og:title", content: `${params.kind.toUpperCase()} · Cortanex PLM` }, { property: "og:description", content: "Exact affected revisions, impact coverage and independent review." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
 component: ChangePage,
});
function ChangePage() { const { kind } = Route.useParams(); const k = kind.toUpperCase() as "ECR" | "ECO" | "ECN"; return <DefinitionWorkspace key={k} kind="CHANGE" changeKind={k} />; }
