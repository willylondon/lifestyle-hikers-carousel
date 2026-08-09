import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/photo-uploader', () => ({
  PhotoUploader: ({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) => (
    <button onClick={() => onFilesSelected(Array.from({ length: 5 }, (_, index) => new File(['demo'], `photo-${index + 1}.webp`, { type: 'image/webp' })))}>
      add-photos
    </button>
  ),
}))

vi.mock('@/lib/image-utils', () => ({
  fileToDataUrl: vi.fn(async () => 'data:image/webp;base64,AAAA'),
  imageDimensions: vi.fn(async () => ({ width: 1080, height: 1350 })),
  makeProjectImage: vi.fn(async () => 'data:image/jpeg;base64,AAAA'),
  makeAnalysisImage: vi.fn(async () => 'data:image/jpeg;base64,AAAA'),
  makeThumbnail: vi.fn(async () => 'data:image/jpeg;base64,BBBB'),
}))

import { NewProjectDialog } from '@/components/new-project-dialog'

describe('NewProjectDialog create flow', () => {
  it('waits for async onCreate before closing the dialog', async () => {
    let resolveCreate!: (value?: void | PromiseLike<void>) => void
    const onCreate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCreate = resolve
        })
    )
    const onOpenChange = vi.fn()

    render(<NewProjectDialog open onOpenChange={onOpenChange} onCreate={onCreate} />)

    fireEvent.change(screen.getByLabelText('Project title'), { target: { value: 'Acceptance Test' } })
    fireEvent.change(screen.getByLabelText('Hike / location'), { target: { value: 'Hellshire' } })
    fireEvent.change(screen.getByLabelText('Excursion notes / context'), { target: { value: 'Grounded trail notes for testing' } })
    fireEvent.click(screen.getByText('add-photos'))

    await waitFor(() => expect(screen.getByText('5 / 20 photos selected')).toBeTruthy())
    await waitFor(() => expect(screen.getByText('Create project')).toBeTruthy())

    fireEvent.click(screen.getByText('Create project'))

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(screen.getByText('Creating…')).toBeTruthy()

    resolveCreate()

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
