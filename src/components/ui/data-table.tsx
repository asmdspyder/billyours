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
  headerClassName?: string;
  headerTextClassName?: string;
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
  headerClassName = "bg-gradient-to-b from-[#f1f5fb] to-[#e7edf6]",
  headerTextClassName = "text-slate-700",
}: DataTableProps) {
  return (
    <div className="no-scrollbar w-full overflow-x-auto">
      <table className={`w-full border-separate border-spacing-0 ${minWidth} text-sm`}>
        <thead className={headerClassName}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={`border-y border-t-2 border-t-blue-500 border-b-slate-200 px-4 py-4 text-sm font-bold normal-case tracking-[0.02em] first:rounded-tl-xl last:rounded-tr-xl [&+th]:border-l [&+th]:border-l-slate-200/80 ${headerTextClassName} ${
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
