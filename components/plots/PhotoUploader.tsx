'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Upload, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deletePhotoAction } from '@/app/(dashboard)/plots/actions'
import type { PlotPhoto } from '@/types/database'
import Image from 'next/image'

interface Props {
  plotId: string
  projectId: string
  photos: PlotPhoto[]
  canUpload: boolean
}

export function PhotoUploader({ plotId, projectId, photos, canUpload }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPhotos, setLocalPhotos] = useState<PlotPhoto[]>(photos)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const newPhotos: PlotPhoto[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${plotId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadErr } = await supabase.storage.from('plot-photos').upload(path, file)
      if (uploadErr) { setError(uploadErr.message); break }

      const { data: { publicUrl } } = supabase.storage.from('plot-photos').getPublicUrl(path)

      const { data: photo, error: dbErr } = await supabase
        .from('plot_photos')
        .insert({ plot_id: plotId, url: publicUrl })
        .select()
        .single()

      if (dbErr) { setError(dbErr.message); break }
      if (photo) newPhotos.push(photo as PlotPhoto)
    }

    setLocalPhotos((prev) => [...prev, ...newPhotos])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(photo: PlotPhoto) {
    const result = await deletePhotoAction(photo.id, plotId, projectId)
    if (result.error) { setError(result.error); return }
    setLocalPhotos((prev) => prev.filter((p) => p.id !== photo.id))
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {localPhotos.length === 0 && !canUpload && (
        <div className="text-sm text-gray-400 flex items-center gap-2 py-4">
          <ImageIcon className="w-4 h-4" /> No photos added
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {localPhotos.map((photo) => (
          <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100">
            <Image
              src={photo.url}
              alt={photo.caption ?? 'Plot photo'}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
            {canUpload && (
              <button
                onClick={() => handleDelete(photo)}
                className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canUpload && (
        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Upload Photos'}
          </Button>
        </div>
      )}
    </div>
  )
}
