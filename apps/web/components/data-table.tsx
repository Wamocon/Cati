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
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchKey?: keyof T
  searchValue?: (row: T) => string
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

export function DataTable<T>({
  columns,
  data,
  searchKey,
  searchValue,
  className,
}: DataTableProps<T>) {
  const t = useTranslations("dataTable")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<{
    key: string
    dir: "asc" | "desc"
  } | null>(null)

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
          column?.sortValue?.(a) ?? readRowValue(a, sort.key),
          column?.sortValue?.(b) ?? readRowValue(b, sort.key)
        )
        return sort.dir === "asc" ? result : -result
      })
    : filtered

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" }
      return prev.dir === "asc" ? { key, dir: "desc" } : null
    })
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card",
        className
      )}
      data-testid="data-table"
    >
      {(searchKey || searchValue) && (
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <span className="text-xs text-muted-foreground">
            {t("count", { count: sorted.length })}
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    col.sortable &&
                      "cursor-pointer select-none hover:text-foreground"
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
          <tbody className="divide-y divide-border">
            {sorted.length > 0 ? (
              sorted.map((row, index) => (
                <tr
                  key={index}
                  className="transition-colors hover:bg-muted/30"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-foreground">
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
    </div>
  )
}
