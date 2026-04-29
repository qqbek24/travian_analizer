import { useEffect, useRef, useState, useCallback, memo } from 'react'

const PALETTE = ['#f97316','#06b6d4','#a855f7','#84cc16','#ec4899','#14b8a6','#e879f9','#facc15','#3b82f6','#22c55e']

const MAP_CANVAS_SIZE = 600
const MAP_MIN = -200
const MAP_MAX = 200
const MAP_RANGE = MAP_MAX - MAP_MIN

function coordToPixel(coord, isY = false) {
  const normalized = (coord - MAP_MIN) / MAP_RANGE
  const pixel = normalized * MAP_CANVAS_SIZE
  return isY ? MAP_CANVAS_SIZE - pixel : pixel
}

const MapViewCanvas = memo(function MapViewCanvas({ mapData, filterPlayers = [], filterAlliances = [], hoveredTag = null, zoom, setZoom, viewCenter, setViewCenter, regionOverlay = null, raidList = null, inactiveOverlays = [] }) {
  const canvasRef = useRef(null)
  const hoverCanvasRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, village: null })

  const mapSize = MAP_CANVAS_SIZE
  const hasHoveredTag = hoveredTag != null

  const drawBase = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !mapData) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    
    // Set canvas size with device pixel ratio for sharp rendering
    canvas.width = (mapSize + 40) * dpr
    canvas.height = (mapSize + 40) * dpr
    canvas.style.width = `${mapSize + 40}px`
    canvas.style.height = `${mapSize + 40}px`
    
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply transformations
    ctx.save()
    ctx.translate(mapSize/2 + 20, mapSize/2 + 20)
    ctx.scale(zoom, zoom)
    ctx.translate(-coordToPixel(viewCenter.x), -coordToPixel(viewCenter.y, true))

    // Draw grid
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 0.5 / zoom
    for (let i = 0; i <= mapSize; i += 20) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, mapSize)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(mapSize, i)
      ctx.stroke()
    }

    // Draw axes
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 2 / zoom
    ctx.beginPath()
    ctx.moveTo(0, coordToPixel(0, true))
    ctx.lineTo(mapSize, coordToPixel(0, true))
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(coordToPixel(0), 0)
    ctx.lineTo(coordToPixel(0), mapSize)
    ctx.stroke()
    
    // Draw coordinate labels every 50 units
    ctx.fillStyle = '#94a3b8'
    ctx.font = `${12 / zoom}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.globalAlpha = 0.8
    
    // X-axis labels (horizontal)
    for (let coord = -200; coord <= 200; coord += 50) {
      if (coord === 0) continue // Skip center
      const x = coordToPixel(coord)
      const y = coordToPixel(0, true)
      ctx.fillText(coord.toString(), x, y + 15 / zoom)
    }
    
    // Y-axis labels (vertical)  
    ctx.textAlign = 'right'
    for (let coord = -200; coord <= 200; coord += 50) {
      if (coord === 0) continue // Skip center
      const x = coordToPixel(0)
      const y = coordToPixel(coord, true)
      ctx.fillText(coord.toString(), x - 10 / zoom, y)
    }
    
    // Reset text align
    ctx.textAlign = 'left'
    ctx.globalAlpha = 1

    // Classify villages with multi-tag support
    const playerTagsLower = filterPlayers.map(t => t.toLowerCase())
    const allianceTagsLower = filterAlliances.map(t => t.toLowerCase())
    const hasFilters = playerTagsLower.length > 0 || allianceTagsLower.length > 0

    const normalVillages = []
    const taggedVillages = []

    mapData.villages.forEach(village => {
      const ownerL = village.owner.toLowerCase()
      const allianceL = village.alliance.toLowerCase()

      const playerIdx = playerTagsLower.findIndex(t => ownerL.includes(t))
      if (playerIdx !== -1) {
        taggedVillages.push({ ...village, tagColor: PALETTE[(filterAlliances.length + playerIdx) % PALETTE.length], tagType: 'player', tagLabel: filterPlayers[playerIdx] })
        return
      }

      const allianceIdx = allianceTagsLower.findIndex(t => allianceL.includes(t))
      if (allianceIdx !== -1) {
        taggedVillages.push({ ...village, tagColor: PALETTE[allianceIdx % PALETTE.length], tagType: 'alliance', tagLabel: filterAlliances[allianceIdx] })
        return
      }

      if (!hasFilters || regionOverlay?.show) normalVillages.push(village)
    })

    // Draw normal villages (region color or blue/gold)
    const hasOverlays = taggedVillages.length > 0 || raidList?.show || inactiveOverlays.length > 0
    normalVillages.forEach(village => {
      const x = coordToPixel(village.x)
      const y = coordToPixel(village.y, true)
      const regionColor = regionOverlay?.show && regionOverlay.regionColors && village.region
        ? regionOverlay.regionColors[village.region]
        : null
      const isHighlighted = regionColor && regionOverlay?.highlightedRegion === village.region
      const color = regionColor ?? (village.is_capital ? '#fbbf24' : '#3b82f6')
      const size = regionColor ? 3 / zoom : Math.min(8, Math.max(3, village.population / 100)) / zoom
      const alpha = regionColor ? (isHighlighted ? 1.0 : (hasOverlays ? 0.4 : 0.8)) : 0.7

      ctx.fillStyle = color
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
      if (isHighlighted) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 0.4 / zoom
        ctx.globalAlpha = 1
        ctx.stroke()
      }
    })

    // Draw tagged villages (alliance = square marker, player = circle + ring)
    taggedVillages.forEach(village => {
      const x = coordToPixel(village.x)
      const y = coordToPixel(village.y, true)
      const baseSize = Math.min(8, Math.max(3, village.population / 100))
      const size = baseSize / zoom

      const isHovered = hoveredTag && village.tagType === hoveredTag.type && village.tagLabel === hoveredTag.label
      if (isHovered) return // drawn on hover canvas

      ctx.fillStyle = village.tagColor
      ctx.strokeStyle = village.is_capital ? '#fbbf24' : village.tagColor
      ctx.globalAlpha = hasHoveredTag ? 0.15 : 0.95

      if (village.tagType === 'alliance') {
        // Square for alliance
        ctx.fillRect(x - size, y - size, size * 2, size * 2)
        if (village.is_capital) {
          ctx.lineWidth = 2 / zoom
          ctx.strokeRect(x - size, y - size, size * 2, size * 2)
        }
      } else {
        // Circle + pulsing ring for player
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
        ctx.lineWidth = 2 / zoom
        ctx.globalAlpha = 0.5
        ctx.beginPath()
        ctx.arc(x, y, size * 1.7, 0, Math.PI * 2)
        ctx.stroke()
      }
    })

    // Raid list overlay
    if (raidList?.show) {
      if (raidList.targets?.length) {
        raidList.targets.forEach((target, idx) => {
          const tx = coordToPixel(target.x)
          const ty = coordToPixel(target.y, true)
          ctx.fillStyle = '#ef4444'
          ctx.globalAlpha = 0.9
          ctx.beginPath()
          ctx.arc(tx, ty, 5 / zoom, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1.5 / zoom
          ctx.stroke()
          ctx.fillStyle = '#ef4444'
          ctx.globalAlpha = 1
          ctx.font = `bold ${9 / zoom}px sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(String(idx + 1), tx, ty - 7 / zoom)
        })
      }
      if (raidList.homeX != null && raidList.homeY != null) {
        const hx = coordToPixel(raidList.homeX)
        const hy = coordToPixel(raidList.homeY, true)
        const s = 8 / zoom
        ctx.fillStyle = '#facc15'
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 0.4 / zoom
        ctx.globalAlpha = 1
        ctx.beginPath()
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI / 5) - Math.PI / 2
          const r = i % 2 === 0 ? s : s * 0.4
          if (i === 0) ctx.moveTo(hx + r * Math.cos(angle), hy + r * Math.sin(angle))
          else ctx.lineTo(hx + r * Math.cos(angle), hy + r * Math.sin(angle))
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    }

    // Inactive overlays
    if (inactiveOverlays.length) {
      inactiveOverlays.forEach(overlay => {
        if (overlay.center_x != null && overlay.center_y != null && overlay.radius != null) {
          ctx.strokeStyle = overlay.color
          ctx.lineWidth = 1.5 / zoom
          ctx.globalAlpha = 0.7
          ctx.setLineDash([8 / zoom, 4 / zoom])
          ctx.beginPath()
          ctx.arc(
            coordToPixel(overlay.center_x),
            coordToPixel(overlay.center_y, true),
            overlay.radius * mapSize / MAP_RANGE,
            0, Math.PI * 2
          )
          ctx.stroke()
          ctx.setLineDash([])
        }
        overlay.villages.forEach(v => {
          const vx = coordToPixel(v.x)
          const vy = coordToPixel(v.y, true)
          ctx.fillStyle = overlay.color
          ctx.globalAlpha = 0.85
          ctx.beginPath()
          ctx.arc(vx, vy, 4 / zoom, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 0.4 / zoom
          ctx.stroke()
        })
      })
    }

    ctx.restore()
  }, [mapData, filterPlayers, filterAlliances, hasHoveredTag, zoom, viewCenter, regionOverlay, raidList, inactiveOverlays])

  // Hover overlay — only redraws highlighted villages (fast)
  const drawHover = useCallback(() => {
    const hoverCanvas = hoverCanvasRef.current
    if (!hoverCanvas) return
    const dpr = window.devicePixelRatio || 1
    hoverCanvas.width = (mapSize + 40) * dpr
    hoverCanvas.height = (mapSize + 40) * dpr
    hoverCanvas.style.width = `${mapSize + 40}px`
    hoverCanvas.style.height = `${mapSize + 40}px`
    if (!hoveredTag || !mapData) return

    const ctx = hoverCanvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.save()
    ctx.translate(mapSize / 2 + 20, mapSize / 2 + 20)
    ctx.scale(zoom, zoom)
    ctx.translate(-coordToPixel(viewCenter.x), -coordToPixel(viewCenter.y, true))

    const playerTagsLower = filterPlayers.map(t => t.toLowerCase())
    const allianceTagsLower = filterAlliances.map(t => t.toLowerCase())

    for (const village of mapData.villages) {
      const ownerL = village.owner.toLowerCase()
      const allianceL = village.alliance.toLowerCase()
      let tagType, tagLabel
      const pi = playerTagsLower.findIndex(t => ownerL.includes(t))
      if (pi !== -1) { tagType = 'player'; tagLabel = filterPlayers[pi] }
      else {
        const ai = allianceTagsLower.findIndex(t => allianceL.includes(t))
        if (ai !== -1) { tagType = 'alliance'; tagLabel = filterAlliances[ai] }
      }
      if (!tagType || tagType !== hoveredTag.type || tagLabel !== hoveredTag.label) continue

      const x = coordToPixel(village.x)
      const y = coordToPixel(village.y, true)
      const size = Math.min(8, Math.max(3, village.population / 100)) / zoom * 1.4

      ctx.fillStyle = '#ef4444'
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5 / zoom
      ctx.globalAlpha = 0.9
      ctx.stroke()
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2 / zoom
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(x, y, size * 1.6, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.restore()
  }, [hoveredTag, mapData, filterPlayers, filterAlliances, zoom, viewCenter])

  // Redraw base when data/zoom/filters/overlays change
  useEffect(() => { drawBase() }, [drawBase])
  // Redraw hover overlay when hovered tag or zoom/pan change
  useEffect(() => { drawHover() }, [drawHover])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY
    const zoomFactor = delta > 0 ? 0.9 : 1.1
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 1), 10))
  }, [setZoom])

  const handleMouseDown = useCallback((e) => {
    if (zoom > 1) {
      setIsDragging(true)
      const rect = canvasRef.current.getBoundingClientRect()
      setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }, [zoom])

  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    if (isDragging && zoom > 1) {
      const dx = (mouseX - dragStart.x) / zoom
      const dy = (mouseY - dragStart.y) / zoom
      
      const mapDx = (dx / mapSize) * MAP_RANGE
      const mapDy = -(dy / mapSize) * MAP_RANGE
      
      setViewCenter(prev => ({
        x: Math.max(MAP_MIN, Math.min(MAP_MAX, prev.x - mapDx)),
        y: Math.max(MAP_MIN, Math.min(MAP_MAX, prev.y - mapDy))
      }))
      
      setDragStart({ x: mouseX, y: mouseY })
      setTooltip({ visible: false, x: 0, y: 0, village: null })
    } else if (mapData) {
      // Calculate canvas coordinates considering zoom and pan
      const centerX = mapSize / 2 + 20
      const centerY = mapSize / 2 + 20
      const worldX = (mouseX - centerX) / zoom + coordToPixel(viewCenter.x)
      const worldY = (mouseY - centerY) / zoom + coordToPixel(viewCenter.y, true)
      
      // Find village under cursor
      let hoveredVillage = null
      const playerTagsLower2 = filterPlayers.map(t => t.toLowerCase())
      const allianceTagsLower2 = filterAlliances.map(t => t.toLowerCase())
      const hasFilters2 = playerTagsLower2.length > 0 || allianceTagsLower2.length > 0

      const threshold = 10 / zoom
      
      for (const village of mapData.villages) {
        const ownerL = village.owner.toLowerCase()
        const allianceL = village.alliance.toLowerCase()
        const isTagged = playerTagsLower2.some(t => ownerL.includes(t)) || allianceTagsLower2.some(t => allianceL.includes(t))
        if (hasFilters2 && !isTagged) continue
        
        const vx = coordToPixel(village.x)
        const vy = coordToPixel(village.y, true)
        const dist = Math.sqrt((worldX - vx) ** 2 + (worldY - vy) ** 2)
        const baseSize = Math.min(8, Math.max(3, village.population / 100))
        
        if (dist <= baseSize + threshold) {
          hoveredVillage = village
          break
        }
      }
      
      if (hoveredVillage) {
        setTooltip({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          village: hoveredVillage
        })
      } else {
        setTooltip({ visible: false, x: 0, y: 0, village: null })
      }
    }
  }, [isDragging, zoom, dragStart, setViewCenter, mapData, filterPlayers, filterAlliances])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  const handleMouseLeaveCanvas = useCallback(() => {
    setIsDragging(false)
    setTooltip({ visible: false, x: 0, y: 0, village: null })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false })
      return () => canvas.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

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
      cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default'),
      touchAction: 'none'
    }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeaveCanvas}
          style={{ 
            border: '2px solid #334155',
            borderRadius: '4px',
            display: 'block'
          }}
        />
        <canvas
          ref={hoverCanvasRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            pointerEvents: 'none',
            borderRadius: '4px'
          }}
        />
      </div>
      
      {/* Tooltip */}
      {tooltip.visible && tooltip.village && (
        <div style={{
          position: 'fixed',
          left: `${tooltip.x + 15}px`,
          top: `${tooltip.y + 15}px`,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #334155',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          color: '#94a3b8',
          fontSize: '0.875rem',
          pointerEvents: 'none',
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          maxWidth: '250px'
        }}>
          <div style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '0.25rem' }}>
            {tooltip.village.name}
          </div>
          <div>Współrzędne: ({tooltip.village.x}|{tooltip.village.y})</div>
          <div>Właściciel: {tooltip.village.owner}</div>
          {tooltip.village.alliance && <div>Sojusz: [{tooltip.village.alliance}]</div>}
          <div>Populacja: {tooltip.village.population}</div>
          {tooltip.village.is_capital && (
            <div style={{ color: '#fbbf24', marginTop: '0.25rem', fontWeight: '600' }}>
              👑 STOLICA
            </div>
          )}
        </div>
      )}
      
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        background: 'rgba(15, 23, 42, 0.9)',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        border: '1px solid #334155',
        color: '#22c55e',
        fontSize: '0.875rem',
        fontWeight: '600'
      }}>
        🎨 Canvas 2D API
      </div>
    </div>
  )
})

export default MapViewCanvas
