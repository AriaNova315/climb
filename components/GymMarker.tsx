'use client'

import { Gym } from '@/types/gym'

const TYPE_COLORS: Record<string, string> = {
  综合: '#7C3AED',
  抱石: '#16A34A',
  难度: '#EA580C',
}

interface Props {
  gym: Gym
  isSelected: boolean
  onClick: (gym: Gym) => void
  calibrating: boolean
}

export default function GymMarker({ gym, isSelected, onClick, calibrating }: Props) {
  if (gym.coordinates.xPct === null || gym.coordinates.yPct === null) return null

  const color = TYPE_COLORS[gym.type] ?? '#6B7280'
  const isComingSoon = gym.status === 'coming_soon'
  const dotColor = isComingSoon ? '#9CA3AF' : color
  const labelColor = isComingSoon ? '#6B7280' : color

  return (
    <button
      onClick={() => !calibrating && onClick(gym)}
      style={{
        position: 'absolute',
        left: `${gym.coordinates.xPct}%`,
        top: `${gym.coordinates.yPct}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 20 : 10,
      }}
      className="flex items-center gap-[3px] cursor-pointer group"
      title={gym.mapLabel}
    >
      {/* 圆点 */}
      <span
        style={{
          width: isSelected ? 9 : 7,
          height: isSelected ? 9 : 7,
          minWidth: isSelected ? 9 : 7,
          backgroundColor: dotColor,
          border: `1.5px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.85)'}`,
          boxShadow: isSelected
            ? `0 0 0 2px ${dotColor}, 0 2px 6px rgba(0,0,0,0.25)`
            : '0 1px 3px rgba(0,0,0,0.25)',
          borderRadius: '50%',
          display: 'block',
          flexShrink: 0,
          transition: 'all 0.15s',
        }}
      />

      {/* 名称标签 */}
      <span
        style={{
          color: labelColor,
          backgroundColor: isSelected
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(255,255,255,0.82)',
          fontSize: 9.5,
          fontWeight: isSelected ? 700 : 600,
          lineHeight: 1.2,
          padding: '1px 4px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
          letterSpacing: 0.1,
          boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
          transition: 'all 0.15s',
          display: 'block',
        }}
      >
        {gym.mapLabel}
      </span>
    </button>
  )
}
