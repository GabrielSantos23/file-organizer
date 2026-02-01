import { Moon, Sun, Monitor } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={cycleTheme}
      className="w-full justify-start gap-3 px-3 py-2 h-auto font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      {theme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : theme === "light" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Monitor className="h-4 w-4" />
      )}
      <span className="text-sm">
        {theme === "dark" ? "Tema Escuro" : theme === "light" ? "Tema Claro" : "Tema do Sistema"}
      </span>
    </Button>
  );
}
