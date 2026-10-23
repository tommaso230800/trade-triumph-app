import * as React from "react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTableElement | null>(null);
    React.useLayoutEffect(() => {
      const table = innerRef.current;
      if (!table) return;
      const labels = Array.from(table.querySelectorAll("thead tr:first-child th")).map(th => th.textContent?.trim() ?? "");
      table.querySelectorAll("tbody tr").forEach(row => {
        Array.from(row.children).forEach((cell, i) => {
          if (cell instanceof HTMLTableCellElement) cell.dataset.label = cell.colSpan > 1 ? "" : labels[i] ?? "";
        });
      });
    }, [props.children]);
    return <div className="crm-table-wrapper relative w-full min-w-0 overflow-auto">
      <table ref={node => { innerRef.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>;
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        "[&_tr]:border-b [&_tr]:border-border bg-secondary/90 text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t border-border bg-secondary/70 text-foreground font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-border transition-all duration-200 text-card-foreground data-[state=selected]:bg-primary/10 data-[state=selected]:shadow-[inset_3px_0_0_0_hsl(var(--primary))] hover:bg-primary/5 hover:shadow-[inset_3px_0_0_0_hsl(var(--primary)/0.6)]",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider text-foreground/80 [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle text-card-foreground [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
