declare module '*?raw' {
  const content: string
  export default content
}

declare module '*?url' {
  const url: string
  export default url
}

declare module '*.css?url' {
  const url: string
  export default url
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.svg' {
  import type { ReactElement, SVGProps } from 'react'

  const Component: (props: SVGProps<SVGSVGElement>) => ReactElement
  export default Component
}

declare module 'react-easy-crop' {
  const Cropper: any
  export default Cropper
}

declare module 'prism-react-renderer'
declare module '@blocknote/core'
declare module '@blocknote/react'
declare module 'react-tweet' {
  export type EnrichedTweet = any
  export type TweetProps = any
  export type TwitterComponents = any
  export function enrichTweet(tweet: any): any
  export function useTweet(id: string, apiUrl?: string, fetchOptions?: RequestInit): any
}
declare module 'react-tweet/api' {
  export type Tweet = any
  export function getTweet(id: string): Promise<any>
}
declare module 'timescape/react' {
  export type Options = any
  export function useTimescape(options: any): any
}
declare module 'chrono-node'
declare module 'zod-to-json-schema'
declare module '@playwright/test'

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  [key: string]: string | boolean | undefined
}
