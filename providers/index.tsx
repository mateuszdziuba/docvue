'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from './theme-provider'

const AllProviders = ({ children }: { children: ReactNode }) => {
  return <ThemeProvider defaultTheme="system">{children}</ThemeProvider>
}

export default AllProviders
