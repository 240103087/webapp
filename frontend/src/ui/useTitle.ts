import { useEffect } from "react";
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · MoveEasy` : "MoveEasy Memory Tags";
  }, [title]);
}
