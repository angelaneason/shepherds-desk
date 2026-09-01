'use client'

import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Camera, Upload, Image as ImageIcon, Loader2, Check, RefreshCw } from 'lucide-react'

interface PhotoCaptureProps {
  isOpen: boolean
  onClose: () => void
  onTextCaptured: (text: string) => void
}

export function PhotoCapture({ isOpen, onClose, onTextCaptured }: PhotoCaptureProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit.')
        return
      }
      setSelectedImage(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError(null)
      setExtractedText('')
      setConfidence(null)
    }
  }

  const handleProcessImage = async () => {
    if (!selectedImage) return

    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', selectedImage)

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process image')
      }

      const data = await response.json()
      setExtractedText(data.text)
      setConfidence(data.confidence)
    } catch (err) {
      console.error(err)
      setError('We had trouble reading that. Try a clearer photo with good lighting.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = () => {
    onTextCaptured(extractedText)
    resetState()
    onClose()
  }

  const resetState = () => {
    setSelectedImage(null)
    setPreviewUrl(null)
    setExtractedText('')
    setConfidence(null)
    setError(null)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#082C50]">Snap a photo of your notes</DialogTitle>
          <DialogDescription>
            We'll convert your handwriting into digital text
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {!previewUrl ? (
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full bg-[#D0A348] hover:bg-[#D0A348]/90 text-white gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                className="hidden"
                onChange={handleFileChange}
              />

              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2 border-[#082C50] text-[#082C50] hover:bg-[#082C50]/10"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5" />
                Upload Image
              </Button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {!extractedText && !isLoading && (
                <>
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-[30vh] object-contain"
                    />
                  </div>
                  
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-[#D0A348] hover:bg-[#D0A348]/90 text-white"
                      onClick={handleProcessImage}
                    >
                      Convert to Text
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetState}
                    >
                      Retake
                    </Button>
                  </div>
                </>
              )}

              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-[#D0A348]" />
                  <p className="text-sm font-medium text-[#082C50] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Reading your notes...
                  </p>
                </div>
              )}

              {extractedText && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Here's what we found! Feel free to edit before saving.
                    </span>
                    {confidence && (
                      <Badge
                        className={
                          confidence === 'high' ? 'bg-green-500' :
                          confidence === 'medium' ? 'bg-yellow-500' : 'bg-orange-500'
                        }
                      >
                        {confidence} confidence
                      </Badge>
                    )}
                  </div>

                  <Textarea
                    value={extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    className="min-h-[200px] text-base resize-y"
                  />

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-[#082C50] hover:bg-[#082C50]/90 text-white gap-2"
                      onClick={handleSave}
                    >
                      <Check className="w-4 h-4" /> Save to Ideas
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleProcessImage}
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Try Again
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
