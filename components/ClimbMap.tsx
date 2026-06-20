'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { Gym } from '@/types/gym'
import GymPopup from './GymPopup'
import geoData from '@/data/beijing-districts.json'

const BEIJING_CENTER: [number, number] = [116.4, 39.9]
const INITIAL_CENTER: [number, number] = [116.31, 39.96]
const INITIAL_ZOOM = 1.7

const DISTRICT_COLORS: Record<string, string> = {
  东城区: '#CEC6BC',
  西城区: '#C8C2BC',
  朝阳区: '#C2C8D2',
  海淀区: '#C4CCC0',
  丰台区: '#CEC4BE',
  石景山区: '#C4BEC8',
  门头沟区: '#BECCC6',
  房山区: '#D0C8BA',
  通州区: '#C0C6D0',
  顺义区: '#CABEC0',
  昌平区: '#C0C8BE',
  大兴区: '#CCCABE',
  怀柔区: '#BCC6C8',
  平谷区: '#C8C6BC',
  密云区: '#BCC0C8',
  延庆区: '#BCBECF',
}

const TYPE_COLORS: Record<string, string> = {
  综合: '#7C3AED',
  抱石: '#16A34A',
  难度: '#EA580C',
}

interface Props {
  gyms: Gym[]
  selectedGym: Gym | null
  popupPos: { xPct: number; yPct: number } | null
  focusRequest: { gym: Gym; ts: number } | null
  onSelect: (gym: Gym | null, pos: { xPct: number; yPct: number } | null) => void
}

export default function ClimbMap({ gyms, selectedGym, popupPos, focusRequest, onSelect }: Props) {
  const [zoom, setZoom] = useState(INITIAL_ZOOM)
  const [center, setCenter] = useState<[number, number]>(INITIAL_CENTER)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [roadsData, setRoadsData] = useState<any>(null)
  const [hoveredGymId, setHoveredGymId] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/beijing-roads.json')
      .then(r => r.json())
      .then(setRoadsData)
      .catch(console.error)
  }, [])

  // 列表点击时，将地图中心移到对应岩馆
  useEffect(() => {
    if (!focusRequest) return
    const { lng, lat } = focusRequest.gym.coordinates
    setCenter([lng, lat])
  }, [focusRequest])

  const handleMarkerClick = useCallback((gym: Gym, e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    onSelect(gym, {
      xPct: ((e.clientX - rect.left) / rect.width) * 100,
      yPct: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }, [onSelect])

  const handleMapClick = useCallback(() => {
    onSelect(null, null)
  }, [onSelect])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMoveEnd = useCallback(({ coordinates, zoom: z }: any) => {
    setCenter(coordinates as [number, number])
    setZoom(z)
  }, [])

  return (
    <div ref={wrapperRef} className="w-full h-full relative" style={{ background: '#F0EDE8' }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: BEIJING_CENTER, scale: 25000 }}
        style={{ width: '100%', height: '100%' }}
        onClick={handleMapClick}
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          onMoveEnd={handleMoveEnd}
          minZoom={0.3}
          maxZoom={20}
        >
          {/* 层级 1：区块底色 */}
          <Geographies geography={geoData}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {({ geographies }: any) =>
              geographies.map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={DISTRICT_COLORS[geo.properties.name] ?? '#C8C4BC'}
                  stroke="#F0EDE8"
                  strokeWidth={0.8}
                  style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                />
              ))
            }
          </Geographies>

          {/* 层级 2：路网 */}
          {roadsData && (
            <Geographies geography={roadsData}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {({ geographies }: any) =>
                geographies.map((geo: any) => {
                  const isMotorway = geo.properties.highway === 'motorway'
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="none"
                      stroke={isMotorway ? 'rgba(192,168,122,0.4)' : 'rgba(184,152,106,0.4)'}
                      strokeWidth={isMotorway ? 0.9 : 0.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                    />
                  )
                })
              }
            </Geographies>
          )}

          {/* 层级 3：区名标注 */}
          <Geographies geography={geoData}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {({ geographies, projection }: any) =>
              geographies.map((geo: any) => {
                const centroid = geo.properties.centroid || geo.properties.center
                if (!centroid) return null
                const [x, y] = projection(centroid)
                if (!isFinite(x) || !isFinite(y)) return null
                const label = (geo.properties.name as string).replace('区', '')
                return (
                  <text
                    key={geo.rsmKey + '-label'}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: 6.5 / Math.sqrt(zoom),
                      fontWeight: 500,
                      fill: '#6B6360',
                      stroke: 'rgba(240,237,232,0.85)',
                      strokeWidth: 2.5 / Math.sqrt(zoom),
                      paintOrder: 'stroke',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      letterSpacing: '0.3px',
                    } as React.CSSProperties}
                  >
                    {label}
                  </text>
                )
              })
            }
          </Geographies>

          {/* 层级 4：岩馆标记点（始终显示短名） */}
          {gyms.map((gym) => {
            const { lat, lng } = gym.coordinates
            const color = TYPE_COLORS[gym.type] ?? '#6B7280'
            const isSelected = selectedGym?.id === gym.id
            const isComingSoon = gym.status === 'coming_soon'
            const dotColor = isComingSoon ? '#9CA3AF' : color
            const labelColor = isComingSoon ? '#6B7280' : color

            return (
              <Marker
                key={gym.id}
                coordinates={[lng, lat]}
                onClick={(e: React.MouseEvent) => handleMarkerClick(gym, e)}
                onMouseEnter={() => setHoveredGymId(gym.id)}
                onMouseLeave={() => setHoveredGymId(null)}
              >
                <circle
                  r={(isSelected ? 2.5 : 1.8) / Math.sqrt(zoom)}
                  fill={dotColor}
                  stroke="#FFFFFF"
                  strokeWidth={0.6 / Math.sqrt(zoom)}
                  style={{ cursor: 'pointer' }}
                />
                <text
                  x={3.5 / Math.sqrt(zoom)}
                  y={0}
                  dominantBaseline="middle"
                  fill={labelColor}
                  style={{
                    fontSize: (isSelected ? 7.5 : 6.5) / Math.sqrt(zoom),
                    fontWeight: isSelected ? 700 : 600,
                    cursor: 'pointer',
                    userSelect: 'none',
                    paintOrder: 'stroke',
                    stroke: 'rgba(255,255,255,0.92)',
                    strokeWidth: 2.2 / Math.sqrt(zoom),
                  } as React.CSSProperties}
                >
                  {gym.name}
                </text>
              </Marker>
            )
          })}

          {/* 层级 5：悬停全称提示（渲染在最后保证层级最高，选中时不显示） */}
          {(() => {
            if (!hoveredGymId || hoveredGymId === selectedGym?.id) return null
            const gym = gyms.find(g => g.id === hoveredGymId)
            if (!gym) return null
            const color = TYPE_COLORS[gym.type] ?? '#6B7280'
            const labelColor = gym.status === 'coming_soon' ? '#6B7280' : color
            return (
              <Marker coordinates={[gym.coordinates.lng, gym.coordinates.lat]}>
                <text
                  x={0}
                  y={-(5 / Math.sqrt(zoom))}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fill={labelColor}
                  style={{
                    fontSize: 8 / Math.sqrt(zoom),
                    fontWeight: 700,
                    userSelect: 'none',
                    paintOrder: 'stroke',
                    stroke: 'rgba(255,255,255,0.97)',
                    strokeWidth: 3 / Math.sqrt(zoom),
                    pointerEvents: 'none',
                  } as React.CSSProperties}
                >
                  {gym.mapLabel}
                </text>
              </Marker>
            )
          })()}
        </ZoomableGroup>
      </ComposableMap>

      {/* 弹窗 */}
      {selectedGym && popupPos && (
        <GymPopup
          gym={selectedGym}
          pos={popupPos}
          onClose={() => onSelect(null, null)}
        />
      )}

      {/* 缩放控制 */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
        <button
          onClick={() => setZoom(z => Math.min(z * 1.5, 20))}
          className="w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors text-xl leading-none"
        >
          +
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z / 1.5, 0.3))}
          className="w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors text-xl leading-none"
        >
          −
        </button>
        <button
          onClick={() => { setZoom(INITIAL_ZOOM); setCenter(INITIAL_CENTER) }}
          title="恢复完整显示"
          className="w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
