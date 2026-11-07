import type { ReactNode } from "react";

export interface DataTableColumn {
  label: string;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface DataTableRow {
  key: string;
  cells: ReactNode[];
}

interface DataTableProps {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  minWidth?: string;
}

const alignmentClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function DataTable({
  columns,
  rows,
  minWidth = "min-w-full",
}: DataTableProps) {
  return (
    <div className="no-scrollbar w-full overflow-x-auto">
      <table className={`w-full ${minWidth} text-sm`}>
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-600 ${
                  alignmentClasses[column.align || "left"]
                } ${column.className || ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.key} className="transition-colors hover:bg-slate-50/70">
              {row.cells.map((cell, index) => (
                <td
                  key={`${row.key}-${index}`}
                  className={`px-4 py-3 align-middle text-slate-700 ${
                    alignmentClasses[columns[index]?.align || "left"]
                  } ${columns[index]?.className || ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
