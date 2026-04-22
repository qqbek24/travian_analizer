import { useEffect, useRef, useState, useCallback, memo } from 'react'

const MapViewCanvas = memo(function MapViewCanvas({ mapData, filterPlayer, filterAlliance, zoom, setZoom, viewCenter, setViewCenter }) {
  const canvasRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, village: null })
  
  const mapSize = 600
  const MAP_MIN = -200
  const MAP_MAX = 200
  const MAP_RANGE = MAP_MAX - MAP_MIN

  const coordToPixel = (coord, isY = false) => {
    const normalized = (coord - MAP_MIN) / MAP_RANGE
    const pixel = normalized * mapSize
    return isY ? mapSize - pixel : pixel
  }

  const drawMap = useCallback(() => {
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

    // Filter villages
    const filterPlayerLower = filterPlayer?.toLowerCase() || ''
    const filterAllianceLower = filterAlliance?.toLowerCase() || ''

    // Draw normal villages
    mapData.villages.forEach(village => {
      if (filterAllianceLower && !village.alliance.toLowerCase().includes(filterAllianceLower)) {
        return
      }

      const isHighlighted = filterPlayerLower && village.owner.toLowerCase().includes(filterPlayerLower)
      if (isHighlighted) return // Draw highlighted later

      const x = coordToPixel(village.x)
      const y = coordToPixel(village.y, true)
      const color = village.is_capital ? '#fbbf24' : '#3b82f6'
      const baseSize = Math.min(8, Math.max(3, village.population / 100))
      const size = baseSize / zoom

      ctx.fillStyle = color
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw highlighted villages
    mapData.villages.forEach(village => {
      if (filterAllianceLower && !village.alliance.toLowerCase().includes(filterAllianceLower)) {
        return
      }

      const isHighlighted = filterPlayerLower && village.owner.toLowerCase().includes(filterPlayerLower)
      if (!isHighlighted) return

      const x = coordToPixel(village.x)
      const y = coordToPixel(village.y, true)
      const fillColor = village.is_capital ? '#fbbf24' : '#3b82f6'
      const baseSize = Math.min(8, Math.max(3, village.population / 100))
      const size = baseSize / zoom

      // Main circle
      ctx.fillStyle = fillColor
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()

      // Pulsing border (animated via requestAnimationFrame)
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = 3 / zoom
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc(x, y, size * 1.5, 0, Math.PI * 2)
      ctx.stroke()
    })

    ctx.restore()
  }, [mapData, filterPlayer, filterAlliance, zoom, viewCenter])

  // Redraw on changes
  useEffect(() => {
    drawMap()
  }, [drawMap])

  // Animation loop for pulsing effect
  useEffect(() => {
    let animationId
    const animate = () => {
      drawMap()
      animationId = requestAnimationFrame(animate)
    }
    
    if (filterPlayer) {
      animationId = requestAnimationFrame(animate)
    }
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [filterPlayer, drawMap])

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
      const filterPlayerLower = filterPlayer?.toLowerCase() || ''
      const filterAllianceLower = filterAlliance?.toLowerCase() || ''
      
      const threshold = 10 / zoom // Pixel threshold for hover detection
      
      for (const village of mapData.villages) {
        if (filterAllianceLower && !village.alliance.toLowerCase().includes(filterAllianceLower)) {
          continue
        }
        
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
  }, [isDragging, zoom, dragStart, setViewCenter, mapData, filterPlayer, filterAlliance, coordToPixel])

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
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeaveCanvas}
        style={{ 
          border: '2px solid #334155',
          borderRadius: '4px'
        }}
      />
      
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
