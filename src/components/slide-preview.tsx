/* eslint-disable @next/next/no-img-element */

import { brandConfig, editorialStyle } from '@/config/brand'
import { editorialSide, objectPositionForCrop, overlayStyle, placementClasses, slideAspectRatio } from '@/lib/rendering/layout'
import type { PhotoAsset, Project, Slide } from '@/types'

export function SlidePreview({ project, slide, photo }: { project: Project; slide: Slide; photo?: PhotoAsset }) {
  if (!photo) {
    return <div className="flex aspect-[4/5] items-center justify-center rounded-[2rem] border border-dashed border-white/15 bg-black/40 text-sm text-stone-500">Missing image</div>
  }

  const side = editorialSide(slide.placement)
  const textAlign = side === 'right' ? 'text-right items-end' : 'text-left items-start'
  const ruleAlign = side === 'right' ? 'ml-auto' : ''

  return (
    <div className="relative mx-auto w-full max-w-[540px] overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_30px_90px_rgba(0,0,0,0.45)]" style={{ aspectRatio: slideAspectRatio() }}>
      <img
        src={photo.dataUrl || photo.url}
        alt={slide.altText}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: objectPositionForCrop(slide.crop) }}
      />
      <div className="absolute inset-0" style={{ background: overlayStyle(slide.overlay, slide.placement) }} />

      <div className="absolute left-8 top-7 z-10 md:left-10 md:top-8">
        <p className="text-[0.66rem] font-semibold uppercase text-white/95" style={{ letterSpacing: '0.28em' }}>
          {brandConfig.brandName}
        </p>
      </div>

      <div className={`absolute inset-0 flex px-8 pb-12 pt-20 md:px-10 md:pb-14 md:pt-24 ${placementClasses(slide.placement)}`}>
        <div className={`flex w-[56%] max-w-[310px] flex-col ${textAlign}`}>
          <h2
            className="text-[clamp(2rem,4vw,3.35rem)] font-bold tracking-[-0.035em] text-white"
            style={{ lineHeight: editorialStyle.headlineLineHeight, textShadow: slide.shadow ? '0 8px 28px rgba(0,0,0,0.42)' : 'none' }}
          >
            {slide.headline}
          </h2>

          <div className={`mt-6 h-px w-20 bg-white/90 ${ruleAlign}`} />

          {slide.body ? (
            <p className="mt-5 max-w-[31ch] text-[clamp(0.92rem,1.45vw,1.22rem)] font-normal leading-[1.38] text-white/95">
              {slide.body}
            </p>
          ) : null}

          {slide.cta ? (
            <div className="mt-5 space-y-1 text-[clamp(0.88rem,1.25vw,1.05rem)]">
              <p className="font-bold text-white">{slide.cta}</p>
              <p className="font-bold" style={{ color: editorialStyle.accentColor }}>{brandConfig.handle}</p>
            </div>
          ) : null}
        </div>
      </div>

      {slide.type !== 'cta' && project.location ? (
        <div className="absolute bottom-6 right-8 text-[0.58rem] font-medium uppercase tracking-[0.2em] text-white/55 md:right-10">
          {project.location}
        </div>
      ) : null}
    </div>
  )
}
