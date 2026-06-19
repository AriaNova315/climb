'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { Gym } from '@/types/gym'
import GymMarker from './GymMarker'
import GymPopup from './GymPopup'
import MapLegend from './MapLegend'

interface Props {
  gyms: Gym[]
  calibrating?: boolean
  onCalibrate?: (xPct: number, yPct: number) => void
}

export default function ClimbMap({ gyms, calibrating = false, onCalibrate }: Props) {
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null)
  const [mapSize, setMapSize] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const transformRef = useRef<ReactZoomPanPinchRef>(null)

  // 计算地图正方形边长 = min(容器宽, 容器高)
  useEffect(() => {
    if (!wrapperRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setMapSize(Math.floor(Math.min(width, height)))
    })
    observer.observe(wrapperRef.current)
    return () => observer.disconnect()
  }, [])

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!calibrating || !onCalibrate) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const xPct = ((e.clientX - rect.left) / rect.width) * 100
      const yPct = ((e.clientY - rect.top) / rect.height) * 100
      onCalibrate(parseFloat(xPct.toFixed(2)), parseFloat(yPct.toFixed(2)))
    },
    [calibrating, onCalibrate]
  )

  const placedGyms = gyms.filter(
    (g) => g.coordinates.xPct !== null && g.coordinates.yPct !== null
  )

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full flex items-center justify-center bg-gray-50 relative"
    >
      {mapSize > 0 && (
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={0.3}
          maxScale={6}
          centerOnInit
          disabled={calibrating}
          doubleClick={{ mode: 'zoomIn' }}
          wheel={{ step: 0.08 }}
          panning={{ velocityDisabled: true }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <TransformComponent
                wrapperStyle={{ width: mapSize, height: mapSize }}
                contentStyle={{ width: mapSize, height: mapSize }}
              >
                {/* 地图容器：与图片等大的正方形 */}
                <div
                  ref={containerRef}
                  className="relative"
                  style={{
                    width: mapSize,
                    height: mapSize,
                    cursor: calibrating ? 'crosshair' : 'grab',
                  }}
                  onClick={handleMapClick}
                >
                  <Image
                    src="/map.png"
                    alt="北京攀岩馆地图"
                    fill
                    className="object-cover select-none"
                    priority
                    draggable={false}
                  />

                  {/* 标定参考叠图 */}
                  {calibrating && (
                    <Image
                      src="/map-labeled.jpg"
                      alt="参考地图"
                      fill
                      className="object-cover pointer-events-none"
                      style={{ opacity: 0.55, mixBlendMode: 'multiply' }}
                      draggable={false}
                    />
                  )}

                  {/* 点击背景关闭弹窗 */}
                  {selectedGym && (
                    <div
                      className="absolute inset-0 z-10"
                      onClick={(e) => { e.stopPropagation(); setSelectedGym(null) }}
                    />
                  )}

                  {/* 岩馆标记点 */}
                  {placedGyms.map((gym) => (
                    <GymMarker
                      key={gym.id}
                      gym={gym}
                      isSelected={selectedGym?.id === gym.id}
                      onClick={setSelectedGym}
                      calibrating={calibrating}
                    />
                  ))}

                  {/* 弹窗 */}
                  {selectedGym && (
                    <GymPopup gym={selectedGym} onClose={() => setSelectedGym(null)} />
                  )}
                </div>
              </TransformComponent>

              {/* 缩放控制按钮 */}
              {!calibrating && (
                <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
                  <button
                    onClick={() => zoomIn()}
                    className="w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors text-xl leading-none"
                  >
                    +
                  </button>
                  <button
                    onClick={() => zoomOut()}
                    className="w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors text-xl leading-none"
                  >
                    −
                  </button>
                  <button
                    onClick={() => resetTransform()}
                    title="恢复完整显示"
                    className="w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </TransformWrapper>
      )}

      {/* 图例：不随地图缩放移动 */}
      <MapLegend />
    </div>
  )
}
