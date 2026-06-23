"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getDashboardSummary,
  getLeadSourceDistribution,
  getDealStageDistribution,
  getMonthlyRevenue,
  activities,
  properties,
  leads,
  deals,
  tickets,
  eidsRecords,
  financialHistory,
  users,
} from "@/lib/demo-data"

export function useDemoData(delay = 600) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLastUpdated(new Date())
      setLoading(false)
    }, delay)

    return () => window.clearTimeout(timer)
  }, [delay])

  const refresh = useCallback(() => {
    setRefreshing(true)
    window.setTimeout(() => {
      setLastUpdated(new Date())
      setRefreshing(false)
    }, delay)
  }, [delay])

  return {
    loading,
    refreshing,
    lastUpdated,
    refresh,
    summary: getDashboardSummary(),
    leadSources: getLeadSourceDistribution(),
    dealStages: getDealStageDistribution(),
    monthlyRevenue: getMonthlyRevenue(),
    activities,
    properties,
    leads,
    deals,
    tickets,
    eidsRecords,
    financialHistory,
    users,
  }
}
