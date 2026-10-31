import { mapZoomLevels } from '@/apps/territory-map/mapConfig'

export type MapPoint = {
  x: number
  y: number
}

export type MapView = {
  offset: MapPoint
  zoom: number
}

export type MapViewBox = {
  height: number
  width: number
  x: number
  y: number
}

// Lage der eingepassten viewBox im Kartenausschnitt, in CSS-Pixeln relativ zu dessen Ecke.
export type MapFrame = {
  height: number
  left: number
  scale: number
  top: number
  viewBox: MapViewBox
  width: number
}

export type StageTransform = {
  scale: number
  x: number
  y: number
}

export const minMapZoom = mapZoomLevels[0]
export const maxMapZoom = mapZoomLevels[mapZoomLevels.length - 1]
export const defaultMapView: MapView = { offset: { x: 0, y: 0 }, zoom: minMapZoom }

// Die Bühne ragt je Seite um diesen Anteil über den Ausschnitt hinaus, damit Gesten Rand zeigen.
export const mapStageOverscan = 0.5
const maxStageScale = 2
const minVisibleOverscan = 0.1

export function parseMapViewBox(viewBox: string): MapViewBox {
  const [x, y, width, height] = viewBox.split(/\s+/).map(Number)

  return { height, width, x, y }
}

export function getOverscannedViewBox({ height, width, x, y }: MapViewBox) {
  return [
    x - width * mapStageOverscan,
    y - height * mapStageOverscan,
    width * (1 + 2 * mapStageOverscan),
    height * (1 + 2 * mapStageOverscan),
  ].join(' ')
}

export function getMapFrame(width: number, height: number, viewBox: MapViewBox): MapFrame {
  const scale = Math.min(width / viewBox.width, height / viewBox.height)

  return {
    height,
    left: (width - viewBox.width * scale) / 2,
    scale,
    top: (height - viewBox.height * scale) / 2,
    viewBox,
    width,
  }
}

export function clampMapZoom(zoom: number) {
  return Math.min(maxMapZoom, Math.max(minMapZoom, zoom))
}

export function toMapPoint(frame: MapFrame, x: number, y: number): MapPoint {
  return {
    x: (x - frame.left) / frame.scale + frame.viewBox.x,
    y: (y - frame.top) / frame.scale + frame.viewBox.y,
  }
}

// Zoomt so, dass der SVG-Punkt `anchor` der Ausgangsansicht unter `target` landet.
export function zoomMapView(
  view: MapView,
  anchor: MapPoint,
  nextZoom: number,
  target: MapPoint = anchor,
): MapView {
  const zoom = clampMapZoom(nextZoom)

  if (zoom <= minMapZoom) {
    return defaultMapView
  }

  return {
    offset: {
      x: target.x - ((anchor.x - view.offset.x) / view.zoom) * zoom,
      y: target.y - ((anchor.y - view.offset.y) / view.zoom) * zoom,
    },
    zoom,
  }
}

export function panMapView(view: MapView, frame: MapFrame, deltaX: number, deltaY: number): MapView {
  return {
    offset: {
      x: view.offset.x + deltaX / frame.scale,
      y: view.offset.y + deltaY / frame.scale,
    },
    zoom: view.zoom,
  }
}

// CSS-Transform der Bühne (Ursprung oben links), der die gezeichnete Ansicht auf die Live-Ansicht abbildet.
export function getStageTransform(
  committed: MapView,
  live: MapView,
  frame: MapFrame,
): StageTransform {
  const scale = live.zoom / committed.zoom
  const stageLeft = -frame.width * mapStageOverscan
  const stageTop = -frame.height * mapStageOverscan
  const { viewBox } = frame

  return {
    scale,
    x:
      (frame.left - stageLeft) * (1 - scale) +
      (live.offset.x - scale * committed.offset.x + (scale - 1) * viewBox.x) * frame.scale,
    y:
      (frame.top - stageTop) * (1 - scale) +
      (live.offset.y - scale * committed.offset.y + (scale - 1) * viewBox.y) * frame.scale,
  }
}

// Neu zeichnen, sobald die Bühne sichtbar unscharf würde oder ihr Überstand fast aufgebraucht ist.
export function shouldRedrawStage(transform: StageTransform, frame: MapFrame) {
  const stageSize = 1 + 2 * mapStageOverscan
  const left = -frame.width * mapStageOverscan + transform.x
  const top = -frame.height * mapStageOverscan + transform.y
  const right = left + frame.width * stageSize * transform.scale
  const bottom = top + frame.height * stageSize * transform.scale
  const marginX = frame.width * minVisibleOverscan
  const marginY = frame.height * minVisibleOverscan

  return (
    transform.scale > maxStageScale ||
    left > -marginX ||
    top > -marginY ||
    right < frame.width + marginX ||
    bottom < frame.height + marginY
  )
}

export function getNextZoomLevel(zoom: number, direction: 1 | -1) {
  const levels = direction > 0 ? mapZoomLevels : [...mapZoomLevels].reverse()

  return (
    levels.find((level) => (direction > 0 ? level > zoom * 1.001 : level < zoom / 1.001)) ??
    levels[levels.length - 1]
  )
}

// Mausrad: ca. drei Rasten je Verdopplung; Trackpad-Pinch (ctrlKey) reagiert feiner und schneller.
export function getWheelZoomFactor(
  deltaY: number,
  deltaMode: number,
  isPinch: boolean,
  pageHeight: number,
) {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * pageHeight : deltaY
  const factor = 2 ** (-pixels / (isPinch ? 100 : 300))

  return Math.min(2, Math.max(0.5, factor))
}
