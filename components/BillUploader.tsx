'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download, FileText } from 'lucide-react'

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
    setStatusMessage('Reading file...')

    try {
      let fileContent = ''
      
      // Read file content based on type
      if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.type === 'text/plain' || file.name.endsWith('.txt')) {
        // Read CSV or text as text
        fileContent = await file.text()
        console.log('Read text/CSV file, length:', fileContent.length)
      } else {
        // For Excel files, read as text (we'll let the backend handle parsing)
        // This is a simplified approach that should work
        fileContent = await file.text()
        console.log('Read Excel file as text, length:', fileContent.length)
        
        // If the file is binary, we need to read it differently
        if (fileContent.length === 0 || fileContent.includes('�')) {
          // Read as base64 for binary files
          const reader = new FileReader()
          fileContent = await new Promise((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string
              resolve(result)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
          console.log('Read as base64 data URL')
        }
      }
      
      setStatusMessage('AI is extracting bills...')
      
      // Send to API for AI processing
      const response = await fetch('/api/bills/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: fileContent,
          userId,
          fileType: file.type || 'application/octet-stream',
          fileName: file.name,
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process file')
      }

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
      setStatusMessage(error instanceof Error ? error.message : 'Failed to process file')
      
      setTimeout(() => {
        setUploadStatus('idle')
        setStatusMessage('')
      }, 5000)
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
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  })

  const downloadTemplate = () => {
    // Create a CSV template
    const csvContent = [
      ['Bill Name', 'Amount', 'Due Date', 'Billing Cycle', 'Category'],
      ['Netflix', '15.99', '15', 'monthly', 'Entertainment'],
      ['Spotify', '9.99', '1', 'monthly', 'Entertainment'],
      ['Electric Bill', '120', '5', 'monthly', 'Utilities'],
      ['Water Bill', '45', '10', 'monthly', 'Utilities'],
      ['Internet', '70', '20', 'monthly', 'Utilities'],
      ['Car Insurance', '150', '25', 'monthly', 'Insurance'],
      ['Gym Membership', '50', '1', 'monthly', 'Health'],
      ['Phone Bill', '85', '15', 'monthly', 'Utilities'],
    ].map(row => row.join(',')).join('\n')
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bills_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const downloadPlainTextExample = () => {
    // Create a plain text example
    const textContent = `Bills to add:
--------
Netflix - 15.99 monthly 15th of each month
Spotify - 9.99 monthly 1st
Electric Bill - 120 monthly 5th 
Water - 45 monthly 10th
Internet - 70 monthly 20th
Car Insurance - 150 monthly 25th
Gym - 50 monthly 1st
Phone - 85 monthly 15th
Annual Amazon Prime - 139 yearly January
One-time car repair - 450 one-time October 15th`
    
    const blob = new Blob([textContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bills_example.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        
        {uploadStatus === 'idle' && (
          <>
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">
              {isDragActive ? 'Drop your file here' : 'Drag & drop your bills file'}
            </p>
            <p className="text-sm text-gray-500">or click to select a file</p>
            <p className="text-xs text-gray-400 mt-2">
              Supports: Spreadsheets (.csv, .xlsx), Plain text (.txt), Receipts, Invoices
            </p>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <FileText className="inline h-4 w-4 mr-1" />
              AI will automatically extract bills from any format - even plain text lists!
            </div>
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
      
      <div className="text-center space-y-2">
        <div>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 underline mr-4"
          >
            <Download className="h-4 w-4 mr-1" />
            Download CSV Template
          </button>
          <button
            onClick={downloadPlainTextExample}
            className="inline-flex items-center text-sm text-green-600 hover:text-green-800 underline"
          >
            <FileText className="h-4 w-4 mr-1" />
            Download Plain Text Example
          </button>
        </div>
        <p className="text-xs text-gray-500">
          You can upload spreadsheets, plain text lists, or even paste receipt text into a .txt file
        </p>
      </div>
    </div>
  )
}