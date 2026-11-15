import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Boxes, Network, Route as RouteIcon, FileWarning, FileCheck2, Megaphone, FolderLock, PlugZap, ScrollText, Cpu, Users } from "lucide-react";
import { usePlm, CURRENT_USER_ID } from "@/lib/plm-store";
import { RecordButton } from "./record-profiles";
import { useHub } from "@/lib/access";
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
    { title: "ECR · Requests", url: "/changes/ecr", kind: "ecr", icon: FileWarning },
    { title: "ECO · Orders", url: "/changes/eco", kind: "eco", icon: FileCheck2 },
    { title: "ECN · Notices", url: "/changes/ecn", kind: "ecn", icon: Megaphone },
  ] },
  { label: "Document Vault", items: [
    { title: "Controlled Docs", url: "/documents", icon: FolderLock },
    { title: "Audit Trail", url: "/audit", icon: ScrollText },
  ] },
  { label: "System Integrations", items: [{ title: "Integration Hub", url: "/integrations", icon: PlugZap }] },
  { label: "Command Access", items: [{ title: "Users & Profiles", url: "/users", icon: Users }] },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const profile = usePlm((s) => s.profiles.find((p) => p.id === CURRENT_USER_ID));
  const hub = useHub();
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-1.5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="mes-brand grid h-9 w-9 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]"><Cpu className="h-5 w-5" /></div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold">Cortanex PLM</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Product Lifecycle · v1.0</div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-0">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => {
                  const active = it.url === "/" ? path === "/" : path.startsWith(it.url);
                  return (
                    <SidebarMenuItem key={it.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={it.title} className="h-10 rounded-lg data-[active=true]:border data-[active=true]:border-primary/30 data-[active=true]:bg-primary/10 data-[active=true]:text-primary [&>a]:gap-3">
                        {"kind" in it ? <Link to="/changes/$kind" params={{ kind: it.kind }}><it.icon className="h-4 w-4" /><span>{it.title}</span></Link> : <Link to={it.url}><it.icon className="h-4 w-4" /><span>{it.title}</span></Link>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-3">
        {!collapsed && <div className="rounded-xl border border-border/60 bg-card/60 p-3"><div className="flex items-center gap-2 text-xs"><span className={`status-dot ${hub.configured && hub.reachable ? "text-success" : "text-warning"}`} /><Link to="/integrations" className="font-medium">{hub.configured && hub.reachable ? "Access Hub online" : "Access Hub not connected"}</Link></div><div className="mt-1 break-words text-[10px] text-muted-foreground">{profile ? <RecordButton record={{ kind: "profiles", id: profile.id }}>{profile.fullName || profile.email}</RecordButton> : "Signed out"}</div></div>}
      </SidebarFooter>
    </Sidebar>
  );
}
