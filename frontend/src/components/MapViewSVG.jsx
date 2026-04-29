import { useRef, useEffect, useCallback, useLayoutEffect, useMemo, memo } from 'react'

const PALETTE = ['#f97316','#06b6d4','#a855f7','#84cc16','#ec4899','#14b8a6','#e879f9','#facc15','#3b82f6','#22c55e']

const MAP_SIZE = 600
const MAP_MIN = -200
const MAP_MAX = 200
const MAP_RANGE = MAP_MAX - MAP_MIN

const MapViewSVG = memo(function MapViewSVG({
  mapData,
  normalVillages,
  taggedVillages,
  hoveredTag,
  zoom,
  setZoom,
  viewCenter,
  setViewCenter,
  regionOverlay = null,
  raidList = null,
  inactiveOverlays = [],
}) {
  const svgRef = useRef(null)
  const contentGroupRef = useRef(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(zoom)
  const vcRef = useRef(viewCenter)
  const syncTimer = useRef(null)

  const coordToPixel = useCallback((coord, isY = false) => {
    const normalized = (coord - MAP_MIN) / MAP_RANGE
    const pixel = normalized * MAP_SIZE
    return isY ? MAP_SIZE - pixel : pixel
  }, [])

  // Direct DOM transform update — bypasses React entirely
  const updateTransform = useCallback(() => {
    if (!contentGroupRef.current) return
    const z = zoomRef.current
    const vc = vcRef.current
    const cx = MAP_SIZE / 2 + 20
    const cy = MAP_SIZE / 2 + 20
    contentGroupRef.current.setAttribute(
      'transform',
      `translate(${cx},${cy}) scale(${z}) translate(${-coordToPixel(vc.x)},${-coordToPixel(vc.y, true)})`
    )
  }, [coordToPixel])

  // Sync parent state 200ms after interaction stops (for zoom label + buttons)
  const scheduleParentSync = useCallback(() => {
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      setZoom(zoomRef.current)
      setViewCenter({ ...vcRef.current })
    }, 200)
  }, [setZoom, setViewCenter])

  // Sync from parent props → refs + DOM (button clicks, reset, quick zoom)
  useLayoutEffect(() => {
    zoomRef.current = zoom
    vcRef.current = viewCenter
    updateTransform()
  }, [zoom, viewCenter, updateTransform])

  // Wheel zoom — no React state update, direct DOM only
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    zoomRef.current = Math.min(Math.max(zoomRef.current * factor, 1), 10)
    updateTransform()
    scheduleParentSync()
  }, [updateTransform, scheduleParentSync])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handleMouseDown = useCallback((e) => {
    if (zoomRef.current > 1) {
      isDraggingRef.current = true
      dragStartRef.current = { x: e.clientX, y: e.clientY }
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current || zoomRef.current <= 1) return
    const z = zoomRef.current
    const dx = (e.clientX - dragStartRef.current.x) / z
    const dy = (e.clientY - dragStartRef.current.y) / z
    const mapDx = (dx / MAP_SIZE) * MAP_RANGE
    const mapDy = -(dy / MAP_SIZE) * MAP_RANGE
    vcRef.current = {
      x: Math.max(MAP_MIN, Math.min(MAP_MAX, vcRef.current.x - mapDx)),
      y: Math.max(MAP_MIN, Math.min(MAP_MAX, vcRef.current.y - mapDy))
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    updateTransform()
    scheduleParentSync()
  }, [updateTransform, scheduleParentSync])

  const handleMouseUp = useCallback(() => { isDraggingRef.current = false }, [])
  const handleMouseLeave = useCallback(() => { isDraggingRef.current = false }, [])

  // --- Memoized rendering — none of these depend on zoom/viewCenter ---

  const staticElements = useMemo(() => (
    <>
      <rect width={MAP_SIZE} height={MAP_SIZE} fill="url(#grid-svg)" x="0" y="0" transform="translate(-20,-20)" />
      <line x1={0} y1={coordToPixel(0, true)} x2={MAP_SIZE} y2={coordToPixel(0, true)} stroke="#334155" strokeWidth={0.5} />
      <line x1={coordToPixel(0)} y1={0} x2={coordToPixel(0)} y2={MAP_SIZE} stroke="#334155" strokeWidth={0.5} />
      {[-100, 100].map(v => (
        <g key={`qline-${v}`}>
          <line x1={coordToPixel(v)} y1={0} x2={coordToPixel(v)} y2={MAP_SIZE} stroke="#1e293b" strokeWidth={0.3} strokeDasharray="5,5" />
          <line x1={0} y1={coordToPixel(v, true)} x2={MAP_SIZE} y2={coordToPixel(v, true)} stroke="#1e293b" strokeWidth={0.3} strokeDasharray="5,5" />
        </g>
      ))}
    </>
  ), [coordToPixel])

  const normalCircles = useMemo(() => {
    const hasOverlays = taggedVillages.length > 0 || raidList?.show || inactiveOverlays.length > 0
    return normalVillages.map(village => {
      const x = coordToPixel(village.x)
      const y = coordToPixel(village.y, true)
      const regionColor = regionOverlay?.show && regionOverlay.regionColors && village.region
        ? regionOverlay.regionColors[village.region]
        : null
      const isHighlighted = regionColor && regionOverlay?.highlightedRegion === village.region
      const fill = regionColor ?? (village.is_capital ? '#fbbf24' : '#3b82f6')
      const opacity = regionColor ? (isHighlighted ? 1.0 : (hasOverlays ? 0.4 : 0.8)) : 0.7
      return (
        <circle key={`n-${village.x}-${village.y}`} cx={x} cy={y} r={2}
          fill={fill} opacity={opacity}
          stroke={isHighlighted ? '#fff' : 'none'} strokeWidth={isHighlighted ? 0.4 : 0}
          style={{ cursor: 'pointer' }}>
          <title>{village.name} ({village.x}|{village.y}){'\n'}{village.owner}{village.alliance ? ` [${village.alliance}]` : ''}{'\n'}Pop: {village.population}</title>
        </circle>
      )
    })
  }, [normalVillages, regionOverlay, taggedVillages.length, raidList?.show, inactiveOverlays.length, coordToPixel])

  const taggedCircles = useMemo(() => (
    taggedVillages
      .filter(v => !(hoveredTag && v.tagType === hoveredTag.type && v.tagLabel === hoveredTag.label))
      .map(village => {
        const x = coordToPixel(village.x)
        const y = coordToPixel(village.y, true)
        const dimmed = hoveredTag !== null
        const isPlayer = village.tagType === 'player'
        return (
          <g key={`t-${village.x}-${village.y}`}>
            <circle cx={x} cy={y} r={3} fill={village.tagColor} opacity={dimmed ? 0.2 : 0.95}
              stroke={village.is_capital ? '#fbbf24' : 'none'} strokeWidth={village.is_capital ? 0.4 : 0}
              style={{ cursor: 'pointer' }}>
              <title>{isPlayer ? '●' : '■'} [{village.tagLabel}] {village.name} ({village.x}|{village.y}){'\n'}{village.owner}{village.alliance ? ` [${village.alliance}]` : ''}{'\n'}Pop: {village.population}{village.is_capital ? '\n👑 STOLICA' : ''}</title>
            </circle>
            {isPlayer && !dimmed && (
              <circle cx={x} cy={y} r={5} fill="none" stroke={village.tagColor} className="player-village" />
            )}
          </g>
        )
      })
  ), [taggedVillages, hoveredTag, coordToPixel])

  const hoveredCircles = useMemo(() => {
    if (!hoveredTag) return null
    return taggedVillages
      .filter(v => v.tagType === hoveredTag.type && v.tagLabel === hoveredTag.label)
      .map(village => {
        const x = coordToPixel(village.x)
        const y = coordToPixel(village.y, true)
        return (
          <g key={`h-${village.x}-${village.y}`}>
            <circle cx={x} cy={y} r={4} fill="#ef4444" opacity="1" stroke="#ffffff" strokeWidth={0.4} style={{ cursor: 'pointer' }}>
              <title>[{village.tagLabel}] {village.name} ({village.x}|{village.y}){'\n'}{village.owner}{village.alliance ? ` [${village.alliance}]` : ''}{'\n'}Pop: {village.population}{village.is_capital ? '\n👑 STOLICA' : ''}</title>
            </circle>
            <circle cx={x} cy={y} r={7} fill="none" stroke="#ef4444" className="hover-ring" />
          </g>
        )
      })
  }, [hoveredTag, taggedVillages, coordToPixel])

  const raidCircles = useMemo(() => {
    if (!raidList?.show || !raidList.targets?.length) return null
    return raidList.targets.map((target, idx) => {
      const tx = coordToPixel(target.x)
      const ty = coordToPixel(target.y, true)
      return (
        <g key={`raid-${idx}`}>
          <circle cx={tx} cy={ty} r={5} fill="#ef4444" opacity="0.9" stroke="#ffffff" strokeWidth={0.4}>
            <title>🗡️ Cel grabieży: {target.name || ''} ({target.x}|{target.y}){target.owner ? `\n${target.owner}` : ''}{target.alliance ? ` [${target.alliance}]` : ''}</title>
          </circle>
          <text x={tx} y={ty - 7} fill="#ef4444" fontSize="7" textAnchor="middle" fontWeight="bold">{idx + 1}</text>
        </g>
      )
    })
  }, [raidList, coordToPixel])

  const homeMarker = useMemo(() => {
    if (!raidList?.show || raidList.homeX == null || raidList.homeY == null) return null
    const hx = coordToPixel(raidList.homeX)
    const hy = coordToPixel(raidList.homeY, true)
    const s = 8
    return (
      <polygon
        points={`${hx},${hy-s*1.4} ${hx+s*0.5},${hy-s*0.4} ${hx+s*1.3},${hy-s*0.4} ${hx+s*0.7},${hy+s*0.3} ${hx+s*0.9},${hy+s*1.2} ${hx},${hy+s*0.7} ${hx-s*0.9},${hy+s*1.2} ${hx-s*0.7},${hy+s*0.3} ${hx-s*1.3},${hy-s*0.4} ${hx-s*0.5},${hy-s*0.4}`}
        fill="#facc15" stroke="#ffffff" strokeWidth={0.4} opacity="1">
        <title>🏠 Osada startowa: ({raidList.homeX}|{raidList.homeY})</title>
      </polygon>
    )
  }, [raidList, coordToPixel])

  const inactiveCircles = useMemo(() => (
    inactiveOverlays.map(overlay => (
      <g key={`ioverlay-${overlay.id}`}>
        {overlay.center_x != null && overlay.center_y != null && overlay.radius != null && (
          <circle
            cx={coordToPixel(overlay.center_x)} cy={coordToPixel(overlay.center_y, true)}
            r={overlay.radius * MAP_SIZE / MAP_RANGE}
            fill="none" stroke={overlay.color} strokeWidth={1.5} strokeDasharray="8,4" opacity={0.7}
          />
        )}
        {overlay.villages.map((v, idx) => (
          <circle key={idx} cx={coordToPixel(v.x)} cy={coordToPixel(v.y, true)} r={4}
            fill={overlay.color} opacity={0.85} stroke="#fff" strokeWidth={0.4}>
            <title>📋 {overlay.name}: {v.label} ({v.x}|{v.y})</title>
          </circle>
        ))}
      </g>
    ))
  ), [inactiveOverlays, coordToPixel])

  if (!mapData) return null

  return (
    <div style={{
      background: '#0f172a',
      padding: '2rem',
      borderRadius: '0.5rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
      cursor: isDraggingRef.current ? 'grabbing' : (zoomRef.current > 1 ? 'grab' : 'default'),
      touchAction: 'none'
    }}>
      <style>{`
        @keyframes playerPulse {
          0%, 100% { stroke-width: 1; opacity: 0.7; }
          50% { stroke-width: 2; opacity: 0.2; }
        }
        .player-village { animation: playerPulse 1.5s ease-in-out infinite; }
        @keyframes hoverRingPulse {
          0%, 100% { stroke-opacity: 1; stroke-width: 2; }
          50% { stroke-opacity: 0.2; stroke-width: 4; }
        }
        .hover-ring { animation: hoverRingPulse 0.6s ease-in-out infinite; }
      `}</style>

      <svg
        ref={svgRef}
        width={MAP_SIZE + 40}
        height={MAP_SIZE + 40}
        style={{ border: '2px solid #334155' }}
        viewBox={`0 0 ${MAP_SIZE + 40} ${MAP_SIZE + 40}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <pattern id="grid-svg" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
          </pattern>
        </defs>

        {/* Single group — transform managed directly via ref, no React prop */}
        <g ref={contentGroupRef}>
          {staticElements}
          {normalCircles}
          {taggedCircles}
          {hoveredCircles}
          {raidCircles}
          {homeMarker}
          {inactiveCircles}
        </g>
      </svg>

      <div style={{
        position: 'absolute', top: '10px', right: '10px',
        background: 'rgba(59, 130, 246, 0.9)', color: 'white',
        padding: '0.5rem 1rem', borderRadius: '0.25rem',
        fontSize: '0.875rem', fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}>
        ✨ SVG Rendering
      </div>
    </div>
  )
})

export default MapViewSVG
