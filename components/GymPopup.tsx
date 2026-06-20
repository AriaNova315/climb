'use client'

import { Gym, RouteSetDifficulty } from '@/types/gym'

const TYPE_COLORS: Record<string, string> = {
  综合: '#7C3AED',
  抱石: '#16A34A',
  难度: '#EA580C',
}

const TYPE_LABELS: Record<string, string> = {
  综合: '综合馆',
  抱石: '抱石馆',
  难度: '难度馆',
}

const ROUTE_DIFFICULTY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  软:   { bg: '#DBEAFE', text: '#1D4ED8', label: '定线偏软' },
  正常: { bg: '#D1FAE5', text: '#065F46', label: '定线正常' },
  硬:   { bg: '#FEE2E2', text: '#991B1B', label: '定线偏硬' },
}

interface Props {
  gym: Gym
  pos: { xPct: number; yPct: number }
  onClose: () => void
}

function Row({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-600">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <span className="leading-snug">{children}</span>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-dashed border-gray-200 my-3" />
}

export default function GymPopup({ gym, onClose, pos }: Props) {
  const color = TYPE_COLORS[gym.type] ?? '#6B7280'
  const isComingSoon = gym.status === 'coming_soon'
  const { xPct, yPct } = pos

  // 四向翻转
  const flipX = xPct > 55
  const flipY = yPct > 75 ? 'up' : yPct < 20 ? 'down' : 'center'

  const horizontalStyle = flipX
    ? { right: `${100 - xPct + 2}%`, left: 'auto' as const }
    : { left: `${xPct + 2}%` }

  const verticalStyle =
    flipY === 'up'
      ? { bottom: `${100 - yPct + 2}%`, top: 'auto' as const }
      : flipY === 'down'
      ? { top: `${yPct + 2}%` }
      : { top: `${yPct}%`, transform: 'translateY(-50%)' }

  const hasPrice    = gym.price.ticket || gym.price.coaching
  const hasGrades   = gym.grades.boulder || gym.grades.lead
  const hasRoute    = !!gym.routeSetDifficulty
  const hasAudience = gym.audience.length > 0
  const hasClimbSection = hasGrades || hasRoute

  return (
    <div
      className="absolute z-30 w-64 bg-white rounded-2xl shadow-xl overflow-hidden"
      style={{ ...horizontalStyle, ...verticalStyle }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 顶部色条 */}
      <div style={{ backgroundColor: color }} className="h-1.5 w-full" />

      <div className="p-4">

        {/* ── 标题区 ── */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: color }}
              >
                {TYPE_LABELS[gym.type]}
              </span>
              {isComingSoon && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  即将开业
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
              {gym.mapLabel}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 mt-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── 基础信息 ── */}
        <div className="space-y-2">
          {gym.address
            ? <Row icon="📍">{gym.district} · {gym.address}</Row>
            : <Row icon="📍">{gym.district}</Row>
          }
          {gym.businessHours && <Row icon="⏰">{gym.businessHours}</Row>}

          {/* 价格：两列并排 */}
          {hasPrice && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="flex-shrink-0">💰</span>
              <div className="flex gap-3">
                {gym.price.ticket && (
                  <span>门票 <strong className="text-gray-900">{gym.price.ticket}</strong></span>
                )}
                {gym.price.coaching && (
                  <span>私教 <strong className="text-gray-900">{gym.price.coaching}</strong></span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 攀岩信息 ── */}
        {hasClimbSection && (
          <>
            <Divider />
            <div className="space-y-2">
              {/* 难度范围 */}
              {hasGrades && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="flex-shrink-0 mt-0.5">🧗</span>
                  <div className="flex flex-col gap-0.5">
                    {gym.grades.boulder && (
                      <span>抱石 <strong className="text-gray-900">{gym.grades.boulder}</strong></span>
                    )}
                    {gym.grades.lead && (
                      <span>难度 <strong className="text-gray-900">{gym.grades.lead}</strong></span>
                    )}
                  </div>
                </div>
              )}

              {/* 定线难度 */}
              {hasRoute && (() => {
                const style = ROUTE_DIFFICULTY_STYLE[gym.routeSetDifficulty as RouteSetDifficulty]
                return style ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="flex-shrink-0">🎯</span>
                    <span
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {style.label}
                    </span>
                  </div>
                ) : null
              })()}
            </div>
          </>
        )}

        {/* ── 适合人群 ── */}
        {hasAudience && (
          <>
            <Divider />
            <div className="flex flex-wrap gap-1.5">
              {gym.audience.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}

        {/* ── 底部按钮 ── */}
        <button
          disabled
          className="mt-4 w-full text-xs text-gray-400 bg-gray-50 rounded-xl py-2 cursor-not-allowed border border-dashed border-gray-200"
        >
          查看详情（即将上线）
        </button>

      </div>
    </div>
  )
}
