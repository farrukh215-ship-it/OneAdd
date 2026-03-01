import { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
};

type PanelHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

type TableStateProps = {
  loading?: boolean;
  empty?: boolean;
  emptyText: string;
};

export function Panel({ children }: PanelProps) {
  return <section className="card">{children}</section>;
}

export function PanelHeader({ title, subtitle, actions }: PanelHeaderProps) {
  return (
    <div className="tableHeaderRow">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p className="panelSubtitle">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function TableState({ loading, empty, emptyText }: TableStateProps) {
  if (loading) {
    return <p className="tableEmpty">Loading tables...</p>;
  }
  if (empty) {
    return <p className="tableEmpty">{emptyText}</p>;
  }
  return null;
}

