'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import gymsData from '@/data/gyms.json'
import { Gym, GymsData } from '@/types/gym'
import MapLegend from '@/components/MapLegend'
import GymList from '@/components/GymList'

const ClimbMap = dynamic(() => import('@/components/ClimbMap'), { ssr: false })

const gyms: Gym[] = (gymsData as GymsData).gyms

export default function HomePage() {
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null)
  const [popupPos, setPopupPos] = useState<{ xPct: number; yPct: number } | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ gym: Gym; ts: number } | null>(null)

  const handleSelectFromMap = useCallback((gym: Gym | null, pos: { xPct: number; yPct: number } | null) => {
    setSelectedGym(gym)
    setPopupPos(pos)
  }, [])

  const handleSelectFromList = useCallback((gym: Gym) => {
    setSelectedGym(gym)
    setPopupPos({ xPct: 50, yPct: 40 })
    setFocusRequest({ gym, ts: Date.now() })
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">北京攀岩馆地图</h1>
          <p className="text-xs text-gray-400">共 {gyms.length} 家场馆</p>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 relative overflow-hidden">
          <ClimbMap
            gyms={gyms}
            selectedGym={selectedGym}
            popupPos={popupPos}
            focusRequest={focusRequest}
            onSelect={handleSelectFromMap}
          />
        </div>
        <GymList
          gyms={gyms}
          selectedGym={selectedGym}
          onSelect={handleSelectFromList}
        />
      </div>

      <MapLegend />
    </div>
  )
}
