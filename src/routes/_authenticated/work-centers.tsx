import { createFileRoute } from "@tanstack/react-router";
import { DefinitionWorkspace, workspaceOptions } from "@/components/plm/definition-workspace";
export const Route = createFileRoute("/_authenticated/work-centers")({
  head: () => ({ meta: [{ title: "Logical Work Centers · Cortanex PLM" }, { name: "description", content: "Logical manufacturing capabilities and EMS mapping references." }, { property: "og:title", content: "Logical Work Centers · Cortanex PLM" }, { property: "og:description", content: "PLMS capability references without duplicate physical asset masters." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceOptions),
  component: () => <DefinitionWorkspace kind="WORK_CENTER" />,
});