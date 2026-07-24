"use client"

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { useLocale, useTranslations } from "next-intl"
import {
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { InfoTooltip } from "@/components/info-tooltip"
import {
  localizeDashboardText,
  localizeDashboardTextPart,
  resolveDashboardLocale,
} from "@/lib/operational-copy"
import { normalizeSearchText } from "@/lib/search"
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
  onRowClick?: (row: T) => void
  rowLabel?: (row: T) => string
  rowKey?: (row: T) => string
  /** Optional controlled query for server-backed datasets. */
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
  searchPending?: boolean
}

interface OptionsPosition {
  left?: number
  right?: number
  top?: number
  bottom?: number
  width?: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
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

function textFromNode(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return ""
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(textFromNode).filter(Boolean).join(" ")
  }

  if (isValidElement(node)) {
    return textFromNode((node.props as { children?: ReactNode }).children)
  }

  return ""
}

function escapeCsv(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim()
  return /[",\n\r]/.test(normalized)
    ? `"${normalized.replace(/"/g, '""')}"`
    : normalized
}

function localizeRenderedNode(
  node: ReactNode,
  locale: ReturnType<typeof resolveDashboardLocale>
): ReactNode {
  if (node === null || node === undefined || typeof node === "boolean") {
    return node
  }

  if (typeof node === "string") {
    return localizeDashboardTextPart(node, locale)
  }

  if (typeof node === "number") {
    return node
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <span key={index}>{localizeRenderedNode(child, locale)}</span>
    ))
  }

  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode }>
    if (!("children" in element.props)) return node
    return cloneElement(element, {
      children: localizeRenderedNode(element.props.children, locale),
    })
  }

  return node
}

export function DataTable<T>({
  columns,
  data,
  searchKey,
  searchValue,
  pageSize = 20,
  className,
  onRowClick,
  rowLabel,
  rowKey,
  searchQuery,
  onSearchQueryChange,
  searchPending = false,
}: DataTableProps<T>) {
  const t = useTranslations("dataTable")
  const locale = resolveDashboardLocale(useLocale())
  const optionsId = useId()
  const optionsTitleId = `${optionsId}-title`
  const optionsButtonRef = useRef<HTMLButtonElement>(null)
  const optionsMenuRef = useRef<HTMLDivElement>(null)
  const optionsFirstControlRef = useRef<HTMLButtonElement>(null)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<{
    key: string
    dir: "asc" | "desc"
  } | null>(null)
  const [page, setPage] = useState(1)
  const [pageSizeValue, setPageSizeValue] = useState(pageSize)
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    () => new Set()
  )
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [optionsPosition, setOptionsPosition] = useState<OptionsPosition>({})
  const portalRoot = typeof document === "undefined" ? null : document.body
  const activeQuery = searchQuery ?? query
  const normalizedQuery = normalizeSearchText(activeQuery)
  const visibleColumns = columns.filter(
    (column) => !hiddenColumns.has(column.key)
  )
  const pageSizeOptions = Array.from(new Set([pageSize, 6, 10, 20, 50, 100]))
    .filter((value) => value > 0)
    .sort((a, b) => a - b)

  const filtered =
    searchKey || searchValue
      ? data.filter((row) => {
          const value = searchValue
            ? searchValue(row)
            : String(row[searchKey as keyof T] ?? "")
          return normalizeSearchText(value).includes(normalizedQuery)
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

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSizeValue))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSizeValue
  const pageRows = sorted.slice(pageStart, pageStart + pageSizeValue)
  const hasStickyActions = columns.some((column) => column.sticky === "right")
  const columnLabel = (header: string) =>
    localizeDashboardTextPart(localizeDashboardText(header, locale), locale)
  const renderCell = (column: Column<T>, row: T) =>
    localizeRenderedNode(column.render(row), locale)

  const updateOptionsPosition = useCallback(() => {
    const button = optionsButtonRef.current
    if (!button || typeof window === "undefined") return

    const box = button.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (viewportWidth < 640) {
      setOptionsPosition({ left: 12, right: 12, bottom: 12 })
      return
    }

    const width = Math.min(320, Math.max(256, box.width))
    const left = clamp(box.right - width, 12, viewportWidth - width - 12)
    const estimatedHeight = Math.min(520, 196 + columns.length * 32)
    const spaceBelow = viewportHeight - box.bottom - 12
    const spaceAbove = box.top - 12
    const opensAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow
    const preferredTop = opensAbove
      ? box.top - estimatedHeight - 8
      : box.bottom + 8
    const top = clamp(
      preferredTop,
      12,
      Math.max(12, viewportHeight - estimatedHeight - 12)
    )

    setOptionsPosition({ left, top, width })
  }, [columns.length])

  const openOptions = useCallback(() => {
    updateOptionsPosition()
    setOptionsOpen(true)
  }, [updateOptionsPosition])

  const closeOptions = useCallback(() => {
    setOptionsOpen(false)
    optionsButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!optionsOpen) return undefined

    const focusFrame = window.requestAnimationFrame(() => {
      optionsFirstControlRef.current?.focus()
    })

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        optionsMenuRef.current?.contains(target) ||
        optionsButtonRef.current?.contains(target)
      ) {
        return
      }
      setOptionsOpen(false)
    }
    const handleReposition = () => updateOptionsPosition()

    document.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("resize", handleReposition)
    window.addEventListener("scroll", handleReposition, true)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("resize", handleReposition)
      window.removeEventListener("scroll", handleReposition, true)
    }
  }, [optionsOpen, updateOptionsPosition])

  function toggleSort(key: string) {
    setPage(1)
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" }
      return prev.dir === "asc" ? { key, dir: "desc" } : null
    })
  }

  function toggleColumn(key: string) {
    setHiddenColumns((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
        return next
      }
      if (columns.length - next.size <= 1) {
        return current
      }
      next.add(key)
      return next
    })
  }

  function resetTable() {
    setQuery("")
    onSearchQueryChange?.("")
    setSort(null)
    setPage(1)
    setPageSizeValue(pageSize)
    setHiddenColumns(new Set())
  }

  function exportCsv() {
    const header = visibleColumns.map((column) =>
      escapeCsv(columnLabel(column.header))
    )
    const rows = sorted.map((row) =>
      visibleColumns.map((column) =>
        escapeCsv(textFromNode(renderCell(column, row)))
      )
    )
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "dashboard-table.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const optionsStyle: CSSProperties = {
    left: optionsPosition.left,
    right: optionsPosition.right,
    top: optionsPosition.top,
    bottom: optionsPosition.bottom,
    width: optionsPosition.width,
  }

  const optionsMenu =
    portalRoot && optionsOpen
      ? createPortal(
          <div
            id={optionsId}
            ref={optionsMenuRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby={optionsTitleId}
            style={optionsStyle}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                closeOptions()
              }
            }}
            className="fixed z-[85] max-h-[min(520px,calc(100vh-24px))] overflow-auto rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-2xl shadow-black/20 sm:max-w-[min(320px,calc(100vw-24px))]"
          >
            <div className="flex items-center justify-between gap-2">
              <p
                id={optionsTitleId}
                className="text-xs font-black tracking-[0.12em] text-muted-foreground uppercase"
              >
                {t("tableTools")}
              </p>
              <button
                ref={optionsFirstControlRef}
                type="button"
                onClick={resetTable}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:bg-muted"
              >
                <RotateCcw className="h-3 w-3" />
                {t("reset")}
              </button>
            </div>

            <label className="mt-3 block text-xs font-bold text-muted-foreground">
              {t("rowsPerPage")}
              <select
                value={pageSizeValue}
                onChange={(event) => {
                  setPageSizeValue(Number(event.target.value))
                  setPage(1)
                }}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm font-semibold text-foreground outline-none focus-visible:border-primary"
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-3 rounded-lg border border-border/70 bg-background/60 p-2">
              <p className="mb-2 text-xs font-bold text-muted-foreground">
                {t("columns")}
              </p>
              <div className="grid max-h-44 gap-1 overflow-auto pr-1">
                {columns.map((column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenColumns.has(column.key)}
                      onChange={() => toggleColumn(column.key)}
                      suppressHydrationWarning
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    <span className="min-w-0 truncate">
                      {columnLabel(column.header)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={exportCsv}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-black text-foreground hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              {t("exportCsv")}
            </button>
          </div>,
          portalRoot
        )
      : null

  return (
    <div
      className={cn("premium-surface min-w-0 rounded-xl", className)}
      data-testid="data-table"
      aria-busy={searchPending}
    >
      {(searchKey || searchValue) && (
        <div className="flex flex-col gap-3 border-b border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={activeQuery}
              onChange={(event) => {
                setQuery(event.target.value)
                onSearchQueryChange?.(event.target.value)
                setPage(1)
              }}
              placeholder={t("search")}
              aria-label={t("search")}
              suppressHydrationWarning
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
            {hasStickyActions && (
              <InfoTooltip
                label={t("stickyHintLabel")}
                text={t("stickyHint")}
              />
            )}
            <span className="rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs font-semibold whitespace-nowrap text-muted-foreground">
              {t("count", { count: sorted.length })}
            </span>
            <button
              type="button"
              data-testid="data-table-export"
              onClick={exportCsv}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-black text-foreground transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:outline-none"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              {t("exportCsv")}
            </button>
            <button
              ref={optionsButtonRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={optionsOpen}
              aria-controls={optionsOpen ? optionsId : undefined}
              onClick={() => (optionsOpen ? closeOptions() : openOptions())}
              className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-black text-foreground transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:outline-none"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              {t("options")}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition",
                  optionsOpen && "rotate-180"
                )}
              />
            </button>
          </div>
        </div>
      )}
      {optionsMenu}
      <div className="space-y-3 p-3 md:hidden">
        {pageRows.length > 0 ? (
          pageRows.map((row, rowIndex) => (
            <article
              key={rowKey?.(row) ?? rowIndex}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick ? rowLabel?.(row) : undefined}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(event) => {
                if (!onRowClick || (event.key !== "Enter" && event.key !== " "))
                  return
                event.preventDefault()
                onRowClick(row)
              }}
              className={cn(
                "rounded-xl border border-border/70 bg-background/72 p-3 shadow-sm",
                onRowClick &&
                  "cursor-pointer transition hover:border-primary/35 hover:bg-primary/[0.045] focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:outline-none"
              )}
            >
              <dl className="space-y-3">
                {visibleColumns.map((col) => (
                  <div key={col.key} className="min-w-0">
                    <dt className="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                      {columnLabel(col.header)}
                    </dt>
                    <dd className="mt-1 min-w-0 text-sm font-medium text-foreground [&_*]:max-w-full [&_*]:min-w-0 [&_*]:break-words">
                      {renderCell(col, row)}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        )}
      </div>

      <div className="hidden min-w-0 overflow-x-auto overscroll-x-contain md:block">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  aria-sort={
                    col.sortable
                      ? sort?.key === col.key
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                  className={cn(
                    "px-4 py-3 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase",
                    col.sticky === "right" &&
                      "sticky right-0 z-20 bg-muted/95 shadow-[-14px_0_18px_-18px_rgba(15,23,42,0.75)] backdrop-blur",
                    col.headerClassName
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md text-left tracking-[0.12em] uppercase transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                      onClick={() => toggleSort(col.key)}
                    >
                      {columnLabel(col.header)}
                      {sort?.key === col.key &&
                        (sort.dir === "asc" ? (
                          <ChevronUp className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-3 w-3" aria-hidden="true" />
                        ))}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      {columnLabel(col.header)}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {pageRows.length > 0 ? (
              pageRows.map((row, index) => (
                <tr
                  key={rowKey?.(row) ?? index}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={onRowClick ? rowLabel?.(row) : undefined}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(event) => {
                    if (
                      !onRowClick ||
                      (event.key !== "Enter" && event.key !== " ")
                    )
                      return
                    event.preventDefault()
                    onRowClick(row)
                  }}
                  className={cn(
                    "transition-colors hover:bg-primary/[0.045]",
                    onRowClick &&
                      "cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:outline-none focus-visible:ring-inset"
                  )}
                >
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-foreground",
                        col.sticky === "right" &&
                          "sticky right-0 z-10 bg-card/95 shadow-[-14px_0_18px_-18px_rgba(15,23,42,0.75)] backdrop-blur",
                        col.cellClassName
                      )}
                    >
                      {renderCell(col, row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > pageSizeValue && (
        <div className="flex flex-col gap-3 border-t border-border p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {pageStart + 1}-{Math.min(pageStart + pageSizeValue, sorted.length)}{" "}
            / {sorted.length}
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
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
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
