import type { CropPreset, Slide, TextPlacement } from '@/types'
import { brandConfig } from '@/config/brand'

export function objectPositionForCrop(crop: CropPreset) {
  switch (crop) {
    case 'top':
      return 'center top'
    case 'bottom':
      return 'center bottom'
    case 'left':
      return 'left center'
    case 'right':
      return 'right center'
    default:
      return 'center center'
  }
}

export function placementClasses(placement: TextPlacement) {
  const map: Record<TextPlacement, string> = {
    'top-left': 'items-start justify-start text-left',
    'top-center': 'items-center justify-start text-center',
    'top-right': 'items-end justify-start text-right',
    'center-left': 'items-start justify-center text-left',
    center: 'items-center justify-center text-center',
    'center-right': 'items-end justify-center text-right',
    'bottom-left': 'items-start justify-end text-left',
    'bottom-center': 'items-center justify-end text-center',
    'bottom-right': 'items-end justify-end text-right',
  }

  return map[placement]
}

export function alignmentClass(alignment: Slide['alignment']) {
  return alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : 'text-left'
}

export function overlayStyle(overlay: number) {
  const alpha = Math.min(0.72, overlay / 100)
  return `linear-gradient(180deg, rgba(8,10,9,${alpha * 0.35}) 0%, rgba(8,10,9,${alpha}) 100%)`
}

export function slideAspectRatio() {
  return `${brandConfig.canvasWidth} / ${brandConfig.canvasHeight}`
}
