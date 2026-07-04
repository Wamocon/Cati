"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, ChevronUp, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  sortable?: boolean
  sortValue?: (row: T) => string | number | Date | null | undefined
  sticky?: "right"
  headerClassName?: string
  cellClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchKey?: keyof T
  searchValue?: (row: T) => string
  pageSize?: number
  className?: string
}

function compareValues(
  a: string | number | Date | null | undefined,
  b: string | number | Date | null | undefined
) {
  if (a instanceof Date || b instanceof Date) {
    const av = a instanceof Date ? a.getTime() : new Date(a ?? 0).getTime()
    const bv = b instanceof Date ? b.getTime() : new Date(b ?? 0).getTime()
    return av - bv
  }

  if (typeof a === "number" || typeof b === "number") {
    return Number(a ?? 0) - Number(b ?? 0)
  }

  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

function readRowValue<T>(row: T, key: string) {
  if (row && typeof row === "object" && key in row) {
    return (row as Record<string, unknown>)[key] as
      | string
      | number
      | Date
      | null
      | undefined
  }
  return undefined
}

// Fallback sort key: when a sortable column has no sortValue and its `key` does
// not match a row property, use the rendered cell if it is a primitive. This
// keeps sortable headers functional even when the display key differs from the
// underlying field (e.g. key "flat" rendering row.flatNumber).
function primitiveFromNode(node: React.ReactNode): string | number | undefined {
  if (typeof node === "string" || typeof node === "number") return node
  return undefined
}

function resolveSortValue<T>(row: T, column: Column<T> | undefined, key: string) {
  if (column?.sortValue) return column.sortValue(row)
  const direct = readRowValue(row, key)
  if (direct !== undefined) return direct
  if (column) return primitiveFromNode(column.render(row))
  return undefined
}

export function DataTable<T>({
  columns,
  data,
  searchKey,
  searchValue,
  pageSize = 20,
  className,
}: DataTableProps<T>) {
  const t = useTranslations("dataTable")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<{
    key: string
    dir: "asc" | "desc"
  } | null>(null)
  const [page, setPage] = useState(1)

  const filtered =
    searchKey || searchValue
      ? data.filter((row) => {
          const value = searchValue
            ? searchValue(row)
            : String(row[searchKey as keyof T] ?? "")
          return value.toLowerCase().includes(query.toLowerCase())
        })
      : data

  const sorted = sort
    ? [...filtered].sort((a, b) => {
        const column = columns.find((col) => col.key === sort.key)
        const result = compareValues(
          resolveSortValue(a, column, sort.key),
          resolveSortValue(b, column, sort.key)
        )
        return sort.dir === "asc" ? result : -result
      })
    : filtered

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const pageRows = sorted.slice(pageStart, pageStart + pageSize)

  function toggleSort(key: string) {
    setPage(1)
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" }
      return prev.dir === "asc" ? { key, dir: "desc" } : null
    })
  }

  return (
    <div
      className={cn(
        "premium-surface min-w-0 overflow-hidden rounded-xl",
        className
      )}
      data-testid="data-table"
    >
      {(searchKey || searchValue) && (
        <div className="flex flex-col gap-3 border-b border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder={t("search")}
            aria-label={t("search")}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          </div>
          <span className="whitespace-nowrap rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
            {t("count", { count: sorted.length })}
          </span>
        </div>
      )}
      <div className="min-w-0 overflow-x-auto overscroll-x-contain">
        <table className="min-w-max w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground",
                    col.sticky === "right" &&
                      "sticky right-0 z-20 bg-muted/95 shadow-[-14px_0_18px_-18px_rgba(15,23,42,0.75)] backdrop-blur",
                    col.sortable &&
                      "cursor-pointer select-none hover:text-foreground",
                    col.headerClassName
                  )}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable &&
                      sort?.key === col.key &&
                      (sort.dir === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {pageRows.length > 0 ? (
              pageRows.map((row, index) => (
                <tr
                  key={index}
                  className="transition-colors hover:bg-primary/[0.045]"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-foreground",
                        col.sticky === "right" &&
                          "sticky right-0 z-10 bg-card/95 shadow-[-14px_0_18px_-18px_rgba(15,23,42,0.75)] backdrop-blur",
                        col.cellClassName
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > pageSize && (
        <div className="flex flex-col gap-3 border-t border-border p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {pageStart + 1}-{Math.min(pageStart + pageSize, sorted.length)} / {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-border px-3 py-1 font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("previous")}
            </button>
            <span>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-border px-3 py-1 font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("next")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
