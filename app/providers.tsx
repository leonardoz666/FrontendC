'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { createQueryClient } from './lib/queryClient'
import { DataSyncBridge } from './components/DataSyncBridge'
import { BrandingProvider } from './contexts/BrandingContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <DataSyncBridge />
          <ToastProvider>
            {children}
          </ToastProvider>
        </BrandingProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
