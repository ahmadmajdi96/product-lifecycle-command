import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Boxes, Network, Route as RouteIcon, FileWarning, FileCheck2, Megaphone, FolderLock, PlugZap, ScrollText, Cpu } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const groups = [
  { label: "Control Center", items: [{ title: "Command Overview", url: "/", icon: Activity }] },
  { label: "Product Definition", items: [
    { title: "Item Master", url: "/items", icon: Boxes },
    { title: "BOM Workbench", url: "/bom", icon: Network },
    { title: "Routings", url: "/routings", icon: RouteIcon },
  ] },
  { label: "Engineering Change", items: [
    { title: "ECR · Requests", url: "/changes/ecr", icon: FileWarning },
    { title: "ECO · Orders", url: "/changes/eco", icon: FileCheck2 },
    { title: "ECN · Notices", url: "/changes/ecn", icon: Megaphone },
  ] },
  { label: "Document Vault", items: [
    { title: "Controlled Docs", url: "/documents", icon: FolderLock },
    { title: "Audit Trail", url: "/audit", icon: ScrollText },
  ] },
  { label: "System Integrations", items: [{ title: "Integration Hub", url: "/integrations", icon: PlugZap }] },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground"><Cpu className="h-4 w-4" /></div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide">CORTANEX PLM</div>
              <div className="font-mono text-[10px] text-muted-foreground">MOS · TIER-1 ENG</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-widest">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => {
                  const active = it.url === "/" ? path === "/" : path.startsWith(it.url);
                  return (
                    <SidebarMenuItem key={it.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={it.title} className="data-[active=true]:border-l-2 data-[active=true]:border-primary data-[active=true]:text-primary">
                        <Link to={it.url}><it.icon className="h-4 w-4" /><span>{it.title}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && <div className="font-mono text-[10px] text-muted-foreground">AUTH · Command Access Hub<br />SESSION · A. Salameh</div>}
      </SidebarFooter>
    </Sidebar>
  );
}
