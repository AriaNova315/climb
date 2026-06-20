'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Gym, GymType } from '@/types/gym'

const TYPE_COLORS: Record<string, string> = {
  综合: '#7C3AED',
  抱石: '#16A34A',
  难度: '#EA580C',
}

const TYPES: GymType[] = ['综合', '抱石', '难度']

const DISTRICT_ORDER = [
  '东城', '西城', '朝阳', '海淀', '丰台', '石景山',
  '门头沟', '房山', '通州', '顺义', '昌平', '大兴', '怀柔', '平谷', '密云', '延庆',
]

interface Props {
  gyms: Gym[]
  selectedGym: Gym | null
  onSelect: (gym: Gym) => void
}

export default function GymList({ gyms, selectedGym, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<GymType>>(new Set())
  const listRef = useRef<HTMLDivElement>(null)

  const toggleType = (type: GymType) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = query.trim()
    return gyms.filter(gym => {
      const matchesQuery = !q ||
        gym.name.includes(q) ||
        gym.mapLabel.includes(q) ||
        gym.district.includes(q)
      const matchesType = activeTypes.size === 0 || activeTypes.has(gym.type)
      return matchesQuery && matchesType
    })
  }, [gyms, query, activeTypes])

  const grouped = useMemo(() => {
    const map = new Map<string, Gym[]>()
    filtered.forEach(gym => {
      if (!map.has(gym.district)) map.set(gym.district, [])
      map.get(gym.district)!.push(gym)
    })
    return DISTRICT_ORDER
      .filter(d => map.has(d))
      .map(d => ({ district: d, gyms: map.get(d)! }))
  }, [filtered])

  // 地图点击选中时，滚动列表到对应项
  useEffect(() => {
    if (!selectedGym) return
    const el = listRef.current?.querySelector(`[data-gymid="${selectedGym.id}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedGym])

  return (
    <div className="flex flex-shrink-0 h-full relative">
      {/* 收起时的展开浮动按钮 */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute right-0 top-4 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-l-lg shadow-sm px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          title="展开列表"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          列表
        </button>
      )}

      {/* 面板主体 */}
      <div
        className={`flex flex-col bg-white border-l border-gray-100 overflow-hidden transition-all duration-200 ${collapsed ? 'w-0' : 'w-72'}`}
      >
        {/* 搜索框 — 含收起按钮 */}
        <div className="p-3 border-b border-gray-100 flex-shrink-0 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索岩馆名称或区域"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-gray-400 bg-gray-50"
          />
          <button
            onClick={() => setCollapsed(true)}
            title="收起列表"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 类型筛选 */}
        <div className="px-3 py-2 border-b border-gray-100 flex gap-1.5 flex-shrink-0">
          {TYPES.map(type => {
            const active = activeTypes.has(type)
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                style={active
                  ? { backgroundColor: TYPE_COLORS[type], borderColor: TYPE_COLORS[type], color: '#fff' }
                  : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }
                }
              >
                {type}馆
              </button>
            )
          })}
        </div>

        {/* 结果数量 */}
        <div className="px-3 py-1.5 text-xs text-gray-400 flex-shrink-0 border-b border-gray-100">
          共 {filtered.length} 家
        </div>

        {/* 岩馆列表 */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {grouped.map(({ district, gyms: districtGyms }) => (
            <div key={district}>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-50 sticky top-0 z-10">
                {district}
              </div>
              {districtGyms.map(gym => {
                const isSelected = selectedGym?.id === gym.id
                const color = gym.status === 'coming_soon' ? '#9CA3AF' : (TYPE_COLORS[gym.type] ?? '#6B7280')
                return (
                  <button
                    key={gym.id}
                    data-gymid={gym.id}
                    onClick={() => onSelect(gym)}
                    className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left transition-colors ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  >
                    <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className={`text-sm truncate flex-1 ${isSelected ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {gym.mapLabel}
                    </span>
                    {gym.status === 'coming_soon' && (
                      <span className="text-xs text-gray-400 flex-shrink-0">即将</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-10 text-sm text-gray-400 text-center">
              没有匹配的岩馆
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
