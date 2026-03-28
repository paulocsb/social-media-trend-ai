import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, type Campaign } from './api'

const STORAGE_KEY = 'activeCampaignId'

type CampaignContextValue = {
  campaigns: Campaign[]
  activeCampaign: Campaign | null
  activeCampaignId: string | null
  setActiveCampaignId: (id: string) => void
  isLoading: boolean
}

const CampaignContext = createContext<CampaignContextValue | null>(null)

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [activeCampaignId, setActiveCampaignIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  )

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.listCampaigns(),
  })

  const campaigns = data?.campaigns ?? []

  // When campaigns load, pick a valid active one
  useEffect(() => {
    if (!campaigns.length) return
    const valid = activeCampaignId && campaigns.some((c) => c.id === activeCampaignId)
    if (!valid) {
      const first = campaigns[0].id
      setActiveCampaignIdState(first)
      localStorage.setItem(STORAGE_KEY, first)
    }
  }, [campaigns, activeCampaignId])

  function setActiveCampaignId(id: string) {
    setActiveCampaignIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId) ?? null

  return (
    <CampaignContext.Provider value={{ campaigns, activeCampaign, activeCampaignId, setActiveCampaignId, isLoading }}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaign() {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaign must be used inside CampaignProvider')
  return ctx
}
