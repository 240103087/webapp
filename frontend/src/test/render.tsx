import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../ui/Toast";
import { AuthProvider } from "../auth/AuthContext";
import { AppRoutes } from "../routes";
import { api } from "../api";

export async function loginAs(email = "aigerim@example.com") {
  await api.resetDemo!();
  await api.logIn({ email, password: "password123" });
}

export function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}
