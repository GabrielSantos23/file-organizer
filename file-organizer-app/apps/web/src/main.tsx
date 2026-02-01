import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import "./lib/i18n";
import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <Loader />,
  context: {},
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

window.onerror = function (message, source, lineno, colno, error) {
  const div = document.createElement("div");
  div.style.cssText =
    "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); color: red; padding: 20px; z-index: 9999; overflow: auto; white-space: pre-wrap; font-family: monospace;";
  div.textContent = `CRITICAL ERROR:\n${message}\n\nSource: ${source}:${lineno}:${colno}\n\nStack:\n${error?.stack}`;
  document.body.appendChild(div);
};

window.onunhandledrejection = function (event) {
  const div = document.createElement("div");
  div.style.cssText =
    "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); color: yellow; padding: 20px; z-index: 9999; overflow: auto; white-space: pre-wrap; font-family: monospace;";
  div.textContent = `UNHANDLED PROMISE:\n${event.reason}\n\nStack:\n${event.reason?.stack}`;
  document.body.appendChild(div);
};

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<RouterProvider router={router} />);
}
