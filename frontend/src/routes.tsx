import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { NotFound } from "./pages/NotFound";
import { Placeholder } from "./pages/Placeholder";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Placeholder title="My tags" />} />
        <Route path="tags/new" element={<Placeholder title="New tag" />} />
        <Route path="tags/:id" element={<Placeholder title="Tag" />} />
        <Route path="tags/:id/edit" element={<Placeholder title="Edit tag" />} />
        <Route path="moves" element={<Placeholder title="Moves" />} />
        <Route path="moves/:id" element={<Placeholder title="Move" />} />
        <Route path="print" element={<Placeholder title="Print labels" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="login" element={<Placeholder title="Log in" />} />
      <Route path="signup" element={<Placeholder title="Sign up" />} />
      <Route path="t/:code" element={<Placeholder title="Tag" />} />
    </Routes>
  );
}
