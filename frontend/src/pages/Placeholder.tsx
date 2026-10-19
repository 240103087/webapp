import { useTitle } from "../ui/useTitle";
export function Placeholder({ title }: { title: string }) {
  useTitle(title);
  return (
    <div className="container">
      <h1>{title}</h1>
    </div>
  );
}
