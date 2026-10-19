import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./ui/Toast";
import { AuthProvider } from "./auth/AuthContext";
import { AppRoutes } from "./routes";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/ui.css";
import "./styles/layout.css";
import "./styles/dashboard.css";

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
