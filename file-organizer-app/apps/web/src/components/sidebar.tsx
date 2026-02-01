import { Link } from "@tanstack/react-router";
import {
  Home,
  FolderOpen,
  Settings,
  HelpCircle,
  Sparkles,
  BarChart3,
} from "lucide-react";

import { ModeToggle } from "./mode-toggle";

const navItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/", icon: FolderOpen, label: "Arquivos", active: true },
  { to: "/dashboard", icon: BarChart3, label: "Dashboard" },
];

const bottomItems = [
  { to: "/", icon: HelpCircle, label: "Ajuda" },
  { to: "/", icon: Settings, label: "Configurações" },
];

export function Sidebar() {
  return (
    <aside className="w-56 border-r border-border bg-sidebar flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Link
          to="/"
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-base">File Organizer</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              item.active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
        <div className="pt-2">
          <ModeToggle />
        </div>
      </div>
    </aside>
  );
}
