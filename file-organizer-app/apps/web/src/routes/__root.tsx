import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "../index.css";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "File Organizer",
      },
      {
        name: "description",
        content: "Organize seus arquivos com inteligência artificial",
      },
    ],
  }),
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
        storageKey="file-organizer-theme"
      >
        <main className="h-svh overflow-hidden bg-background">
          <Outlet />
        </main>
        <Toaster richColors position="bottom-right" />
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && (
        <TanStackRouterDevtools position="bottom-left" />
      )}
    </>
  );
}
