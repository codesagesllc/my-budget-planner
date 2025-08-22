'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

interface BillUploaderProps {
  userId: string
  onSuccess?: () => void
}

export default function BillUploader({ userId, onSuccess }: BillUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setUploadStatus('processing')
    setStatusMessage('Reading spreadsheet...')

    try {
      // Read the file
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      
      // Get the first worksheet
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      
      // Convert to text
      const text = XLSX.utils.sheet_to_txt(worksheet)
      
      setStatusMessage('Analyzing with AI...')
      
      // Send to API for AI processing
      const response = await fetch('/api/bills/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: text,
          userId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to process file')
      }

      const result = await response.json()
      
      setUploadStatus('success')
      setStatusMessage(`Successfully imported ${result.billsCount} bills!`)
      onSuccess?.()
      
      // Reset after 3 seconds
      setTimeout(() => {
        setUploadStatus('idle')
        setStatusMessage('')
      }, 3000)
    } catch (error) {
      console.error('Error processing file:', error)
      setUploadStatus('error')
      setStatusMessage('Failed to process file. Please try again.')
      
      setTimeout(() => {
        setUploadStatus('idle')
        setStatusMessage('')
      }, 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0])
    }
  }, [userId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  })

  const downloadTemplate = () => {
    // Create template
    const ws_data = [
      ['Bill Name', 'Amount', 'Due Date', 'Billing Cycle', 'Category'],
      ['Netflix', '15.99', '15', 'monthly', 'Entertainment'],
      ['Electricity', '120', '1', 'monthly', 'Utilities'],
      ['Car Insurance', '150', '20', 'monthly', 'Insurance'],
      ['Gym Membership', '50', '1', 'monthly', 'Health'],
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bills')
    
    // Download
    XLSX.writeFile(wb, 'bills_template.xlsx')
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <div
          {...getRootProps()}
          className={`flex-1 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          
          {uploadStatus === 'idle' && (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">
                {isDragActive ? 'Drop your spreadsheet here' : 'Drag & drop your bills spreadsheet'}
              </p>
              <p className="text-sm text-gray-500">or click to select a file</p>
              <p className="text-xs text-gray-400 mt-2">Supports .xlsx, .xls, .csv files</p>
            </>
          )}
          
          {uploadStatus === 'processing' && (
            <>
              <FileSpreadsheet className="mx-auto h-12 w-12 text-blue-500 mb-4 animate-pulse" />
              <p className="text-gray-600">{statusMessage}</p>
            </>
          )}
          
          {uploadStatus === 'success' && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <p className="text-green-600">{statusMessage}</p>
            </>
          )}
          
          {uploadStatus === 'error' && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-600">{statusMessage}</p>
            </>
          )}
        </div>
      </div>
      
      <div className="text-center">
        <button
          onClick={downloadTemplate}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Download Excel Template
        </button>
      </div>
    </div>
  )
}