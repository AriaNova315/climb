export default function MapLegend() {
  const items = [
    { color: '#7C3AED', label: '综合馆（抱石+难度）' },
    { color: '#16A34A', label: '抱石馆' },
    { color: '#EA580C', label: '难度馆' },
    { color: '#9CA3AF', label: '即将开业' },
  ]

  return (
    <div className="fixed top-16 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-xl shadow-md px-4 py-3 pointer-events-none">
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">图例 Key</p>
      <div className="space-y-1.5">
        {items.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              style={{ backgroundColor: color }}
              className="w-3 h-3 rounded-full flex-shrink-0"
            />
            <span className="text-xs text-gray-700">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
