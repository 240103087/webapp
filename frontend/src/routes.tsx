import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { NotFound } from "./pages/NotFound";
import { Placeholder } from "./pages/Placeholder";
import { Dashboard } from "./pages/Dashboard";
import { TagEditor } from "./pages/TagEditor";
import { TagDetail } from "./pages/TagDetail";
import { LoginPage, SignUpPage } from "./pages/AuthPages";
import { GuestOnly, RequireAuth } from "./auth/RequireAuth";
import { UserMenu } from "./auth/UserMenu";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<Layout userMenu={<UserMenu />} />}>
          <Route index element={<Dashboard />} />
          <Route path="tags/new" element={<TagEditor />} />
          <Route path="tags/:id" element={<TagDetail />} />
          <Route path="tags/:id/edit" element={<TagEditor />} />
          <Route path="moves" element={<Placeholder title="Moves" />} />
          <Route path="moves/:id" element={<Placeholder title="Move" />} />
          <Route path="print" element={<Placeholder title="Print labels" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
      <Route path="login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="signup" element={<GuestOnly><SignUpPage /></GuestOnly>} />
      <Route path="t/:code" element={<Placeholder title="Tag" />} />
    </Routes>
  );
}
