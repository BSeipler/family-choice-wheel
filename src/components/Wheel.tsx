import { useEffect, useRef } from 'react'

export type WheelSlice = {
  personId: string
  name: string
  color: string
  title: string | null
}

type Props = {
  slices: WheelSlice[]
  rotation: number
  spinning: boolean
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current)
      current = word
      if (lines.length === maxLines) break
    } else {
      current = next
    }
  }
  if (lines.length < maxLines && current) lines.push(current)
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const last = lines[maxLines - 1]
    lines[maxLines - 1] = `${last.replace(/\.?$/, '')}…`
  }
  return lines
}

export function Wheel({ slices, rotation, spinning }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    const size = Math.min(parent?.clientWidth ?? 520, 560)
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cx = size / 2
    const cy = size / 2
    const radius = size / 2 - 18

    ctx.clearRect(0, 0, size, size)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((rotation * Math.PI) / 180)

    const n = Math.max(slices.length, 1)
    const sliceAngle = (Math.PI * 2) / n

    if (slices.length === 0) {
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.fillStyle = '#2a211c'
      ctx.fill()
      ctx.restore()
      ctx.fillStyle = '#f6efe4'
      ctx.font = '600 20px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Add your family to start', cx, cy)
      return
    }

    slices.forEach((slice, i) => {
      const start = -Math.PI / 2 + i * sliceAngle
      const end = start + sliceAngle
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, start, end)
      ctx.closePath()
      ctx.fillStyle = slice.color
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.save()
      ctx.rotate(start + sliceAngle / 2)
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.font = `800 ${Math.max(14, Math.min(22, 140 / n))}px Nunito, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const textX = radius * 0.62
      ctx.fillStyle = '#fff'
      ctx.shadowColor = 'rgba(0,0,0,0.45)'
      ctx.shadowBlur = 6
      ctx.fillText(slice.name, textX, -12)
      ctx.font = `700 ${Math.max(11, Math.min(16, 110 / n))}px Nunito, sans-serif`
      const title = slice.title ?? 'Pick a movie'
      const lines = wrapText(ctx, title, radius * 0.5, 2)
      lines.forEach((line, lineIndex) => {
        ctx.fillText(line, textX, 10 + lineIndex * 18)
      })
      ctx.restore()
    })

    ctx.beginPath()
    ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2)
    ctx.fillStyle = '#1a120e'
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = '#e2b04a'
    ctx.stroke()

    ctx.restore()
  }, [slices, rotation])

  return (
    <div className="wheel-stage">
      <div className="wheel-pointer" aria-hidden="true" />
      <canvas ref={canvasRef} className={`wheel-canvas${spinning ? ' is-spinning' : ''}`} />
    </div>
  )
}

export function targetRotation(current: number, winnerIndex: number, sliceCount: number): number {
  const sliceAngle = 360 / Math.max(sliceCount, 1)
  const landing = -((winnerIndex + 0.5) * sliceAngle)
  let target = 6 * 360 + landing
  while (target < current + 5 * 360) target += 360
  return target
}
