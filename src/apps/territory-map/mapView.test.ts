import { describe, expect, it } from 'vitest'

import {
  defaultMapView,
  getMapFrame,
  getNextZoomLevel,
  getOverscannedViewBox,
  getStageTransform,
  getWheelZoomFactor,
  mapStageOverscan,
  panMapView,
  parseMapViewBox,
  shouldRedrawStage,
  toMapPoint,
  zoomMapView,
} from '@/apps/territory-map/mapView'
import type { MapFrame, MapPoint, MapView } from '@/apps/territory-map/mapView'

const frame = getMapFrame(800, 400, parseMapViewBox('0 68 960 384'))

// Bildschirmposition eines Kartenpunkts bei gezeichneter Ansicht plus Bühnen-Transform.
function toScreen(point: MapPoint, drawn: MapView, live: MapView, mapFrame: MapFrame) {
  const stage = getStageTransform(drawn, live, mapFrame)
  const stageLeft = -mapFrame.width * mapStageOverscan
  const stageTop = -mapFrame.height * mapStageOverscan
  const drawnX = mapFrame.left + (drawn.offset.x + point.x * drawn.zoom - mapFrame.viewBox.x) * mapFrame.scale
  const drawnY = mapFrame.top + (drawn.offset.y + point.y * drawn.zoom - mapFrame.viewBox.y) * mapFrame.scale

  return {
    x: stageLeft + stage.x + (drawnX - stageLeft) * stage.scale,
    y: stageTop + stage.y + (drawnY - stageTop) * stage.scale,
  }
}

describe('Sushi-Map-Ansicht', () => {
  it('bildet die gezeichnete Ansicht per Bühnen-Transform exakt auf die Live-Ansicht ab', () => {
    const drawn: MapView = { offset: { x: -300, y: -120 }, zoom: 2 }
    const live: MapView = { offset: { x: -1010, y: -420 }, zoom: 3.3 }

    for (const point of [{ x: 480, y: 260 }, { x: 12, y: 400 }]) {
      const expected = toScreen(point, live, live, frame)
      const actual = toScreen(point, drawn, live, frame)

      expect(actual.x).toBeCloseTo(expected.x, 6)
      expect(actual.y).toBeCloseTo(expected.y, 6)
    }
  })

  it('hält beim Zoomen den Punkt unter Mauszeiger oder Fingern fest', () => {
    const anchor = toMapPoint(frame, 600, 150)
    const start: MapView = { offset: { x: -40, y: -30 }, zoom: 1.5 }
    const view = zoomMapView(start, anchor, 6)
    const mapX = (anchor.x - start.offset.x) / start.zoom
    const mapY = (anchor.y - start.offset.y) / start.zoom

    expect(view.offset.x + mapX * view.zoom).toBeCloseTo(anchor.x, 6)
    expect(view.offset.y + mapY * view.zoom).toBeCloseTo(anchor.y, 6)
    expect(zoomMapView(view, anchor, 0.4)).toEqual(defaultMapView)
    expect(zoomMapView(view, anchor, 5000).zoom).toBe(1024)
  })

  it('verschiebt in CSS-Pixeln unabhängig vom Zoom', () => {
    const panned = panMapView({ offset: { x: 0, y: 0 }, zoom: 8 }, frame, 50, -25)

    expect(panned.offset.x * frame.scale).toBeCloseTo(50, 6)
    expect(panned.offset.y * frame.scale).toBeCloseTo(-25, 6)
  })

  it('zeichnet erst neu, wenn die Bühne unscharf wird oder ihr Überstand fast aufgebraucht ist', () => {
    const drawn: MapView = { offset: { x: -500, y: -200 }, zoom: 4 }
    const redraw = (live: MapView) =>
      shouldRedrawStage(getStageTransform(drawn, live, frame), frame)

    expect(redraw(drawn)).toBe(false)
    expect(redraw(panMapView(drawn, frame, 250, 0))).toBe(false)
    expect(redraw(panMapView(drawn, frame, 380, 0))).toBe(true)
    expect(redraw(zoomMapView(drawn, toMapPoint(frame, 400, 200), 7.9))).toBe(false)
    expect(redraw(zoomMapView(drawn, toMapPoint(frame, 400, 200), 8.1))).toBe(true)
    expect(redraw(zoomMapView(drawn, toMapPoint(frame, 400, 200), 2.2))).toBe(true)
  })

  it('erweitert die viewBox um den Bühnenüberstand und springt per Knopf zur nächsten Zweierpotenz', () => {
    expect(getOverscannedViewBox(parseMapViewBox('0 0 331 447'))).toBe('-165.5 -223.5 662 894')
    expect(getNextZoomLevel(1, 1)).toBe(2)
    expect(getNextZoomLevel(5.3, 1)).toBe(8)
    expect(getNextZoomLevel(5.3, -1)).toBe(4)
    expect(getNextZoomLevel(4, -1)).toBe(2)
    expect(getNextZoomLevel(1024, 1)).toBe(1024)
  })

  it('zoomt per Mausrad gröber als per Trackpad-Pinch und begrenzt Ausreißer', () => {
    expect(getWheelZoomFactor(-300, 0, false, 900)).toBeCloseTo(2, 6)
    expect(getWheelZoomFactor(-100, 0, true, 900)).toBeCloseTo(2, 6)
    expect(getWheelZoomFactor(3, 1, false, 900)).toBeCloseTo(2 ** (-48 / 300), 6)
    expect(getWheelZoomFactor(5000, 0, false, 900)).toBe(0.5)
  })
})
