import { useState, useEffect, useRef } from 'react'

interface AudioVisualizerProps {
  level: number       // 0–1 from RMS
  isActive: boolean
  size?: 'sm' | 'md'
}

const N = 24  // number of bars

export default function AudioVisualizer({ level, isActive, size = 'md' }: AudioVisualizerProps) {
  const [bars, setBars] = useState(() => Array.from({ length: N }, () => 0.15))
  const phaseRef = useRef(0)
  const rafRef   = useRef<number>()

  useEffect(() => {
    if (!isActive) {
      cancelAnimationFrame(rafRef.current!)
      // Decay slowly to zero
      setBars(prev => prev.map(b => Math.max(0, b - 0.04)))
      return
    }

    const tick = () => {
      phaseRef.current += 0.06
      const p = phaseRef.current

      setBars(prev => prev.map((old, i) => {
        // Each bar has its own frequency and phase offset — gives a natural waveform look
        const freq   = 0.6 + (i / N) * 0.8
        const wave   = Math.sin(p * freq + i * 0.45) * 0.4 + Math.cos(p * freq * 0.7 + i * 0.3) * 0.2
        const target = level > 0.005
          ? Math.max(0.06, 0.08 + level * (0.5 + wave * 0.5))
          : 0.04 + Math.sin(p * 0.4 + i * 0.6) * 0.015 + 0.015  // idle breath

        // Asymmetric easing: attack fast, decay slower
        const rate = target > old ? 0.35 : 0.18
        return old + (target - old) * rate
      }))

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current!)
  }, [isActive, level])

  const h        = size === 'sm' ? 28 : 40
  const barW     = size === 'sm' ? 2 : 3
  const gap      = size === 'sm' ? 1 : 2
  const totalW   = N * (barW + gap) - gap

  return (
    <div style={{ width: totalW, height: h, display: 'flex', alignItems: 'center', gap }}>
      {bars.map((b, i) => {
        // Bars near the center are tallest — gives a natural waveform envelope
        const centerWeight = 1 - Math.abs((i / (N - 1)) - 0.5) * 0.6
        const height = Math.max(2, b * h * centerWeight)

        // Color shifts from indigo → violet at higher levels
        const hue  = 245 + level * 20
        const sat  = isActive ? 70 + level * 20 : 30
        const lit  = isActive ? 55 + level * 15 : 25

        return (
          <div
            key={i}
            className="wave-bar flex-shrink-0"
            style={{
              width: barW,
              height,
              borderRadius: barW,
              background: isActive
                ? `hsl(${hue}, ${sat}%, ${lit}%)`
                : '#1c2030',
            }}
          />
        )
      })}
    </div>
  )
}
