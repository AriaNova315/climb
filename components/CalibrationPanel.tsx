'use client'

import { useState } from 'react'
import { Gym } from '@/types/gym'

interface Props {
  gyms: Gym[]
  onCoordSet: (id: string, xPct: number, yPct: number) => void
  lastClick: { xPct: number; yPct: number } | null
}

export default function CalibrationPanel({ gyms, onCoordSet, lastClick }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const unplaced = gyms.filter(
    (g) => g.coordinates.xPct === null || g.coordinates.yPct === null
  )
  const placed = gyms.filter(
    (g) => g.coordinates.xPct !== null && g.coordinates.yPct !== null
  )
  const current = unplaced[currentIndex] ?? null

  const handleConfirm = () => {
    if (!current || !lastClick) return
    onCoordSet(current.id, lastClick.xPct, lastClick.yPct)
    if (currentIndex >= unplaced.length - 1) setCurrentIndex(0)
  }

  const handleSkip = () => {
    setCurrentIndex((i) => Math.min(i + 1, unplaced.length - 1))
  }

  return (
    <div className="w-72 bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-gray-900">标定模式</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          在地图上点击岩馆位置，然后点「确认」
        </p>
      </div>

      <div className="text-sm text-gray-500">
        进度：<span className="font-medium text-gray-900">{placed.length}</span> / {gyms.length} 已标定
      </div>

      {current ? (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-0.5">当前待标定</p>
          <p className="font-semibold text-gray-900">{current.mapLabel}</p>
          <p className="text-xs text-gray-500">{current.district} · {current.type}馆</p>
        </div>
      ) : (
        <div className="bg-green-50 rounded-xl p-3 text-center text-green-700 font-medium text-sm">
          全部标定完成 🎉
        </div>
      )}

      {lastClick && (
        <div className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg p-2">
          点击坐标：x={lastClick.xPct}%，y={lastClick.yPct}%
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={!current || !lastClick}
          className="flex-1 bg-violet-600 text-white text-sm rounded-lg py-2 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-700 transition-colors"
        >
          确认
        </button>
        <button
          onClick={handleSkip}
          disabled={!current}
          className="flex-1 bg-gray-100 text-gray-700 text-sm rounded-lg py-2 font-medium disabled:opacity-40 hover:bg-gray-200 transition-colors"
        >
          跳过
        </button>
      </div>

      {placed.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">已标定（点击可重置）</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {placed.map((g) => (
              <button
                key={g.id}
                onClick={() => onCoordSet(g.id, -1, -1)}
                className="w-full text-left text-xs px-2 py-1 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-600 transition-colors"
              >
                {g.mapLabel} ({g.coordinates.xPct?.toFixed(1)}, {g.coordinates.yPct?.toFixed(1)})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
