import { ButtonLink } from "../ui/Button";
import { useTitle } from "../ui/useTitle";

export function NotFound() {
  useTitle("Page not found");
  return (
    <div className="container narrow">
      <div className="empty card">
        <p className="mono muted">404</p>
        <h1>This page does not exist</h1>
        <p>The link may be old, or there is a typo in the address.</p>
        <ButtonLink to="/" variant="primary">Go to my tags</ButtonLink>
      </div>
    </div>
  );
}
