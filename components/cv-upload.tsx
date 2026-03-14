'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Upload, FileText, X, CheckCircle } from 'lucide-react'
import { storage } from '@/lib/storage'
import type { CVData } from '@/lib/types'
// Removed top-level pdfjsLib import to prevent SSR issues
import * as mammoth from 'mammoth'

interface CVUploadProps {
  onCVSelected?: (cv: CVData) => void
}

export function CVUploadComponent({ onCVSelected }: CVUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [savedCV, setSavedCV] = useState<CVData | null>(null)

  useEffect(() => {
    const cv = storage.getCV()
    setSavedCV(cv || null)
  }, [])

  const extractTextFromTxt = async (file: File): Promise<string> => {
    const text = await file.text()
    return text
  }

  const extractTextFromPDF = async (file: File): Promise<string> => {
    if (typeof window === 'undefined') {
      throw new Error('PDF extraction only supported in browser')
    }
    // Dynamically import pdfjsLib on client
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
    const data = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise
    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      text += pageText + '\n'
    }
    return text
  }

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()

    const result = await mammoth.extractRawText({
      arrayBuffer,
    })
    return result.value
  }

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = e.target.files?.[0]

    if (!selectedFile) return

    setError(null)
    setSuccess(false)

    const validTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    if (
      !validTypes.includes(selectedFile.type) &&
      !selectedFile.name.endsWith('.txt')
    ) {
      setError('Please upload TXT, PDF, or DOCX')
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      let content = ''

      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        content = await extractTextFromTxt(file)
      }

      else if (file.type === 'application/pdf') {
        content = await extractTextFromPDF(file)
      }

      else if (
        file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        content = await extractTextFromDOCX(file)
      }

      // ✅ FULL LOG
      console.log("Extracted CV Text:", content)

      console.log("Total Characters:", content.length)

      if (!content.trim()) {
        setError('File appears to be empty')
        setIsLoading(false)
        return
      }

      const cv: CVData = {
        fileName: file.name,
        content: content.substring(0, 5000),
        uploadedAt: Date.now(),
      }

      storage.saveCV(cv)

      setSavedCV(cv)
      setFile(null)
      setSuccess(true)

      onCVSelected?.(cv)

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('File processing error:', err)
      setError('Failed to process file. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveCV = () => {
    setSavedCV(null)

    const profile = storage.getProfile()

    if (profile) {
      profile.currentCV = undefined
      storage.saveProfile(profile)
    }
  }

  return (
    <div className="space-y-4">

      {savedCV ? (
        <Card className="p-4 border-emerald-200 bg-emerald-50">
          <div className="flex items-start justify-between">

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />

              <div>
                <p className="font-semibold text-slate-900">
                  CV Loaded Successfully
                </p>

                <p className="text-sm text-slate-600">
                  {savedCV.fileName}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  {savedCV.content.length} characters
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveCV}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>

          </div>
        </Card>
      ) : (

        <Card className="p-6 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer">

          <label className="flex flex-col items-center gap-3 cursor-pointer">

            <div className="p-3 bg-blue-100 rounded-lg">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>

            <div className="text-center">
              <p className="font-semibold text-slate-900">
                Upload your CV
              </p>

              <p className="text-sm text-slate-600">
                TXT, PDF, DOCX
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Max 5MB
              </p>
            </div>

            <input
              type="file"
              onChange={handleFileChange}
              accept=".txt,.pdf,.docx"
              className="hidden"
              disabled={isLoading}
            />

          </label>

        </Card>
      )}

      {file && (
        <Card className="p-4 border-blue-200 bg-blue-50">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />

              <div>
                <p className="font-semibold text-slate-900">
                  {file.name}
                </p>

                <p className="text-sm text-slate-600">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFile(null)}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>

          </div>

        </Card>
      )}

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </Card>
      )}

      {success && (
        <Card className="p-4 border-emerald-200 bg-emerald-50">
          <p className="text-sm text-emerald-700">
            CV uploaded successfully!
          </p>
        </Card>
      )}

      {file && !savedCV && (
        <Button
          onClick={handleUpload}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? 'Processing...' : 'Upload CV'}
        </Button>
      )}

    </div>
  )
}