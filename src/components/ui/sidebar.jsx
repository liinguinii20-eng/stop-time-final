import * as React from "react"
import { cn } from "@/lib/utils"

const SidebarContext = React.createContext({ collapsed: false, toggle: () => {} })

export function SidebarProvider({ children, defaultCollapsed = false }) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed)
  const toggle = React.useCallback(() => setCollapsed((c) => !c), [])
  const value = React.useMemo(() => ({ collapsed, toggle }), [collapsed, toggle])
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  return React.useContext(SidebarContext)
}

export function Sidebar({ className, collapsible, ...props }) {
  const { collapsed } = useSidebar()
  return (
    <aside
      data-collapsible={collapsed ? "icon" : undefined}
      className={cn(
        "group flex h-screen w-60 shrink-0 flex-col bg-white text-slate-900 transition-all",
        "data-[collapsible=icon]:w-16",
        className
      )}
      {...props}
    />
  )
}

export function SidebarHeader({ className, ...props }) {
  return <div className={cn("px-4", className)} {...props} />
}

export function SidebarContent({ className, ...props }) {
  return <div className={cn("flex-1 overflow-y-auto px-2 py-2", className)} {...props} />
}

export function SidebarFooter({ className, ...props }) {
  return <div className={cn("mt-auto px-2 py-2", className)} {...props} />
}

export function SidebarSeparator({ className, ...props }) {
  return <div className={cn("h-px w-full bg-slate-200", className)} {...props} />
}

export function SidebarGroup({ className, ...props }) {
  return <div className={cn("mb-2", className)} {...props} />
}

export function SidebarGroupLabel({ className, ...props }) {
  return <div className={cn("px-2 text-xs uppercase tracking-wider", className)} {...props} />
}

export function SidebarGroupContent({ className, ...props }) {
  return <div className={cn("space-y-1", className)} {...props} />
}

export function SidebarMenu({ className, ...props }) {
  return <ul className={cn("flex flex-col", className)} {...props} />
}

export function SidebarMenuItem({ className, ...props }) {
  return <li className={cn("list-none", className)} {...props} />
}

export function SidebarInset({ className, ...props }) {
  return <div className={cn("flex-1", className)} {...props} />
}

export function SidebarTrigger({ className, ...props }) {
  const { toggle } = useSidebar()
  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium",
        "text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500",
        className
      )}
      {...props}
    />
  )
}

export function SidebarMenuButton({ className, isActive, asChild, tooltip, ...props }) {
  const Comp = asChild ? "span" : "button"
  return (
    <Comp
      data-active={isActive}
      title={tooltip}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600",
        "hover:bg-slate-100 hover:text-slate-900",
        "data-[active=true]:bg-red-50 data-[active=true]:text-red-700",
        className
      )}
      {...props}
    />
  )
}