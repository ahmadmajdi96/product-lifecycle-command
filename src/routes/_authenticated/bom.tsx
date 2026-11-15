import { createFileRoute } from "@tanstack/react-router";
import { DefinitionWorkspace, workspaceOptions } from "@/components/plm/definition-workspace";
export const Route = createFileRoute("/_authenticated/bom")({
 head: () => ({ meta: [{ title: "BOM Workbench · Cortanex PLM" }, { name: "description", content: "Scoped, revision-controlled bom workbench for product engineering." }, { property: "og:title", content: "BOM Workbench · Cortanex PLM" }, { property: "og:description", content: "Controlled product definitions with exact revision history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
 loader: ({ context }) => context.queryClient.ensureQueryData(workspaceOptions),
 component: () => <DefinitionWorkspace kind="BOM" />,
});
