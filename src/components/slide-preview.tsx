/* eslint-disable @next/next/no-img-element */

import { brandConfig } from '@/config/brand'
import { alignmentClass, objectPositionForCrop, overlayStyle, placementClasses, slideAspectRatio } from '@/lib/rendering/layout'
import type { PhotoAsset, Project, Slide } from '@/types'

export function SlidePreview({ project, slide, photo }: { project: Project; slide: Slide; photo?: PhotoAsset }) {
  if (!photo) {
    return <div className="flex aspect-[4/5] items-center justify-center rounded-[2rem] border border-dashed border-white/15 bg-black/40 text-sm text-stone-500">Missing image</div>
  }

  return (
    <div className="relative mx-auto w-full max-w-[540px] overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_30px_90px_rgba(0,0,0,0.45)]" style={{ aspectRatio: slideAspectRatio() }}>
      <img
        src={photo.dataUrl || photo.url}
        alt={slide.altText}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: objectPositionForCrop(slide.crop) }}
      />
      <div className="absolute inset-0" style={{ background: overlayStyle(slide.overlay) }} />
      <div className={`absolute inset-0 flex p-8 md:p-10 ${placementClasses(slide.placement)}`}>
        <div className={`max-w-[78%] space-y-4 ${alignmentClass(slide.alignment)}`}>
          <div>
            <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-stone-300/90">{project.location}</p>
            <h2
              className="text-[clamp(1.65rem,2.8vw,3.15rem)] font-semibold leading-[1.04] text-stone-50"
              style={{ textShadow: slide.shadow ? '0 10px 30px rgba(0,0,0,0.45)' : 'none' }}
            >
              {slide.headline}
            </h2>
          </div>
          {slide.body ? (
            <p className="max-w-[38ch] text-[clamp(0.95rem,1.3vw,1.3rem)] leading-relaxed text-stone-200/90">{slide.body}</p>
          ) : null}
          {slide.cta ? <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-200">{slide.cta}</p> : null}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-8 pb-7 text-[0.72rem] uppercase tracking-[0.3em] text-stone-300/80">
        <span>{brandConfig.brandName}</span>
        <span>{brandConfig.handle}</span>
      </div>
    </div>
  )
}
