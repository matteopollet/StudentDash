'use client'

import React, { useState, useLayoutEffect, useEffect, useRef } from 'react'

export function Ripple({ color = 'currentColor', duration = 600 }: { color?: string, duration?: number }) {
  const [ripples, setRipples] = useState<{ x: number; y: number; size: number; id: number }[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const parent = containerRef.current?.parentElement
    if (!parent) return

    if (window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative'
    }
    // Ensures parent has hidden overflow so the ripple doesn't overflow outside
    parent.style.overflow = 'hidden'

    const handleMouseDown = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * 2
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2
      setRipples((prev) => [...prev, { x, y, size, id: Date.now() }])
    }

    parent.addEventListener('mousedown', handleMouseDown)
    return () => parent.removeEventListener('mousedown', handleMouseDown)
  }, [])

  useLayoutEffect(() => {
    if (ripples.length > 0) {
      const timeout = setTimeout(() => {
        setRipples((prev) => prev.slice(1))
      }, duration)
      return () => clearTimeout(timeout)
    }
  }, [ripples, duration])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        borderRadius: 'inherit',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          style={{
            position: 'absolute',
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            backgroundColor: color,
            borderRadius: '50%',
            opacity: 0.12,
            transform: 'scale(0)',
            animation: `ripple-animation ${duration}ms linear`,
            pointerEvents: 'none',
          }}
        />
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ripple-animation {
          to {
            transform: scale(1);
            opacity: 0;
          }
        }
      `}} />
    </div>
  )
}
