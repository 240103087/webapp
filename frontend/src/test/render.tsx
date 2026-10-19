import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { Root } from "../App";
import { api } from "../api";

export async function loginAs(email = "aigerim@example.com") {
  await api.resetDemo!();
  await api.logIn({ email, password: "password123" });
}

export function renderApp(path: string) {
  const router = createMemoryRouter([{ path: "*", element: <Root /> }], { initialEntries: [path] });
  const utils = render(<RouterProvider router={router} />);
  return { ...utils, router };
}
