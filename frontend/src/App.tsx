import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ToastProvider } from "./ui/Toast";
import { AuthProvider } from "./auth/AuthContext";
import { AppRoutes } from "./routes";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/ui.css";
import "./styles/layout.css";
import "./styles/dashboard.css";
import "./styles/editor.css";
import "./styles/public.css";
import "./styles/moves.css";
import "./styles/print.css";

export function Root() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  );
}

const router = createBrowserRouter([{ path: "*", element: <Root /> }]);

export function App() {
  return <RouterProvider router={router} />;
}
