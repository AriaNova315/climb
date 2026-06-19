'use client'

import { useState, useCallback } from 'react'
import ClimbMap from '@/components/ClimbMap'
import CalibrationPanel from '@/components/CalibrationPanel'
import gymsData from '@/data/gyms.json'
import { Gym, GymsData } from '@/types/gym'

const initial = (gymsData as GymsData).gyms

export default function HomePage() {
  const [gyms, setGyms] = useState<Gym[]>(initial)
  const [calibrating, setCalibrating] = useState(false)
  const [lastClick, setLastClick] = useState<{ xPct: number; yPct: number } | null>(null)

  const handleCalibrate = useCallback((xPct: number, yPct: number) => {
    setLastClick({ xPct, yPct })
  }, [])

  const handleCoordSet = useCallback((id: string, xPct: number, yPct: number) => {
    setGyms((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, coordinates: { xPct: xPct < 0 ? null : xPct, yPct: yPct < 0 ? null : yPct } }
          : g
      )
    )
    setLastClick(null)
  }, [])

  const exportCoords = () => {
    const coords = gyms
      .filter((g) => g.coordinates.xPct !== null)
      .map((g) => `"${g.id}": { "xPct": ${g.coordinates.xPct}, "yPct": ${g.coordinates.yPct} }`)
      .join(',\n')
    navigator.clipboard.writeText(`{\n${coords}\n}`)
    alert('坐标已复制到剪贴板，粘贴到 gyms.json 后保存即可永久生效。')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">北京攀岩馆地图</h1>
          <p className="text-xs text-gray-400">共 {gyms.length} 家场馆</p>
        </div>
        <button
          onClick={() => {
            setCalibrating((v) => !v)
            setLastClick(null)
          }}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            calibrating
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {calibrating ? '退出标定模式' : '标定坐标'}
        </button>
      </header>

      {/* 主体：占满剩余高度 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 地图区域 */}
        <div className="relative overflow-hidden bg-gray-50 flex-1">
          <ClimbMap
            gyms={gyms}
            calibrating={calibrating}
            onCalibrate={handleCalibrate}
          />
        </div>

        {/* 标定面板 */}
        {calibrating && (
          <div className="flex flex-col gap-3 p-4 w-72 flex-shrink-0 overflow-y-auto bg-gray-100">
            <CalibrationPanel
              gyms={gyms}
              onCoordSet={handleCoordSet}
              lastClick={lastClick}
            />
            <button
              onClick={exportCoords}
              className="w-full bg-green-600 text-white text-sm rounded-xl py-2 font-medium hover:bg-green-700 transition-colors"
            >
              导出坐标到剪贴板
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
