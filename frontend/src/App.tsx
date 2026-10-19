import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./ui/Toast";
import { AppRoutes } from "./routes";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/ui.css";
import "./styles/layout.css";

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
}
