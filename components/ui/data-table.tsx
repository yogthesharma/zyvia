"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CaretDownIcon, CaretUpDownIcon, CaretUpIcon } from "@phosphor-icons/react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type Row,
  type SortingState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type ColumnMeta = {
  className?: string
}

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  emptyMessage?: string
  className?: string
  /** Soft tinted surface (default) or fully plain list. */
  variant?: "surface" | "plain"
  /** Optional group label above the body rows. */
  groupLabel?: string
  getRowHref?: (row: Row<TData>) => string | undefined
  onRowClick?: (row: Row<TData>) => void
  initialSorting?: SortingState
}

function metaClassName(meta: unknown) {
  if (meta && typeof meta === "object" && "className" in meta) {
    return (meta as ColumnMeta).className
  }
  return undefined
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>
  title: string
  className?: string
}) {
  if (!column.getCanSort()) {
    return <span className={cn("text-xs font-medium", className)}>{title}</span>
  }

  const sorted = column.getIsSorted()

  return (
    <button
      type="button"
      className={cn(
        "-ml-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      {sorted === "asc" ? (
        <CaretUpIcon className="size-3 opacity-80" />
      ) : sorted === "desc" ? (
        <CaretDownIcon className="size-3 opacity-80" />
      ) : (
        <CaretUpDownIcon className="size-3 opacity-50" />
      )}
    </button>
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = "No results.",
  className,
  variant = "surface",
  groupLabel,
  getRowHref,
  onRowClick,
  initialSorting = [],
}: DataTableProps<TData, TValue>) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div
      data-slot={variant === "surface" ? "surface" : undefined}
      className={cn(
        "w-full min-w-0",
        variant === "surface" && "overflow-hidden rounded-lg",
        className
      )}
    >
      {groupLabel ? (
        <div className="bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          {groupLabel}
        </div>
      ) : null}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="bg-muted/30 hover:bg-muted/30"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "h-9 px-3 text-xs text-muted-foreground",
                    metaClassName(header.column.columnDef.meta)
                  )}
                  style={{
                    width:
                      header.getSize() === 150 ? undefined : header.getSize(),
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => {
              const href = getRowHref?.(row)
              const clickable = Boolean(href || onRowClick)
              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(clickable && "cursor-pointer")}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={(event) => {
                    if (!clickable) return
                    if (event.defaultPrevented) return
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    ) {
                      return
                    }
                    // Ignore clicks that originated on nested interactive controls.
                    const target = event.target as HTMLElement | null
                    if (
                      target?.closest(
                        "a,button,input,textarea,select,[role='button'],[role='link']"
                      )
                    ) {
                      return
                    }
                    if (onRowClick) {
                      onRowClick(row)
                      return
                    }
                    if (href) router.push(href)
                  }}
                  onKeyDown={(event) => {
                    if (!clickable) return
                    if (event.key !== "Enter" && event.key !== " ") return
                    event.preventDefault()
                    if (onRowClick) {
                      onRowClick(row)
                      return
                    }
                    if (href) router.push(href)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "px-3 py-3.5",
                        metaClassName(cell.column.columnDef.meta)
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="h-24 px-3 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export type { ColumnDef, SortingState }
