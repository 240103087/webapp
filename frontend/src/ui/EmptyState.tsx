import type { ReactNode } from "react";
export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty card">
      {icon}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
