import { createFileRoute } from "@tanstack/react-router";
import { DefinitionWorkspace, workspaceOptions } from "@/components/plm/definition-workspace";
export const Route = createFileRoute("/_authenticated/packages")({
  head: () => ({ meta: [{ title: "Production Packages · Cortanex PLM" }, { name: "description", content: "Exact production definition manifests and scoped readiness." }, { property: "og:title", content: "Production Packages · Cortanex PLM" }, { property: "og:description", content: "Revision-pinned packages with authentic consumer acceptance." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceOptions),
  component: () => <DefinitionWorkspace kind="PACKAGE" />,
});