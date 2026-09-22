import { useState, useEffect } from 'react'

interface AudioVisualizerProps {
  level: number
  isActive: boolean
}

export default function AudioVisualizer({ level, isActive }: AudioVisualizerProps) {
  const bars = 20
  // tick forces re-render for the idle breathing animation
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!isActive) return
    const id = setInterval(() => setTick(t => t + 1), 80)
    return () => clearInterval(id)
  }, [isActive])

  const now = Date.now()

  return (
    <div className="flex items-center gap-0.5 h-10">
      {Array.from({ length: bars }).map((_, i) => {
        let h: number
        if (isActive && level > 0.01) {
          // Active + sound: bars driven by level with per-bar wave variation
          const wave = Math.sin(i * 0.8 + tick * 0.15) * 0.3 + Math.sin(i * 1.6) * 0.3 + 0.4
          h = Math.max(10, Math.min(100, 10 + level * wave * 110))
        } else if (isActive) {
          // Active but quiet: slow idle breathing animation
          h = 15 + Math.sin(now / 600 + i * 0.5) * 6 + 4
        } else {
          h = 15
        }

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${
              isActive && level > 0.01 * (i / bars + 0.3)
                ? 'bg-primary-500'
                : isActive
                ? 'bg-primary-800'
                : 'bg-slate-700'
            }`}
            style={{ height: `${h}%` }}
          />
        )
      })}
    </div>
  )
}
