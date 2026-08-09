import type { CropPreset, Slide, TextPlacement } from '@/types'
import { brandConfig } from '@/config/brand'

export function objectPositionForCrop(crop: CropPreset) {
  switch (crop) {
    case 'top': return 'center top'
    case 'bottom': return 'center bottom'
    case 'left': return 'left center'
    case 'right': return 'right center'
    default: return 'center center'
  }
}

export function placementClasses(placement: TextPlacement) {
  const map: Record<TextPlacement, string> = {
    'top-left': 'items-start justify-start text-left',
    'top-center': 'items-start justify-start text-left',
    'top-right': 'items-end justify-start text-right',
    'center-left': 'items-start justify-center text-left',
    center: 'items-start justify-center text-left',
    'center-right': 'items-end justify-center text-right',
    'bottom-left': 'items-start justify-end text-left',
    'bottom-center': 'items-start justify-end text-left',
    'bottom-right': 'items-end justify-end text-right',
  }
  return map[placement]
}

export function alignmentClass(alignment: Slide['alignment']) {
  return alignment === 'right' ? 'text-right' : 'text-left'
}

export function editorialSide(placement: TextPlacement) {
  return placement.endsWith('right') ? 'right' : 'left'
}

export function editorialVertical(placement: TextPlacement) {
  if (placement.startsWith('top')) return 'top'
  if (placement.startsWith('bottom')) return 'bottom'
  return 'center'
}

export function overlayStyle(overlay: number, placement: TextPlacement = 'center-left') {
  const alpha = Math.min(0.76, Math.max(0.34, overlay / 100))
  const side = editorialSide(placement)
  const horizontal = side === 'right'
    ? `linear-gradient(270deg, rgba(5,7,6,${alpha}) 0%, rgba(5,7,6,${alpha * 0.72}) 30%, rgba(5,7,6,${alpha * 0.18}) 58%, rgba(5,7,6,0) 76%)`
    : `linear-gradient(90deg, rgba(5,7,6,${alpha}) 0%, rgba(5,7,6,${alpha * 0.72}) 30%, rgba(5,7,6,${alpha * 0.18}) 58%, rgba(5,7,6,0) 76%)`
  const vignette = 'linear-gradient(180deg, rgba(5,7,6,0.18) 0%, rgba(5,7,6,0) 42%, rgba(5,7,6,0.16) 100%)'
  return `${horizontal}, ${vignette}`
}

export function slideAspectRatio() {
  return `${brandConfig.canvasWidth} / ${brandConfig.canvasHeight}`
}
