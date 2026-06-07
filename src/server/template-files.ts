import { createServerFn } from '@tanstack/react-start'
import { promises as fs } from 'fs'
import path from 'path'

export const getTemplateFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { filename: string }) => d)
  .handler(async ({ data }) => {
    const { filename } = data
    // Validate filename to prevent directory traversal attacks
    if (!filename.match(/^[a-zA-Z0-9-]+$/)) {
      return { error: 'Invalid filename', content: null }
    }

    try {
      const filePath = path.join(process.cwd(), 'components', 'templates', `${filename}.tsx`)
      const content = await fs.readFile(filePath, 'utf8')
      return { content, error: null }
    } catch {
      return { error: 'Failed to read file', content: null }
    }
  })
