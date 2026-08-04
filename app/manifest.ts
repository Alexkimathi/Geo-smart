import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Geo-smart Engineering',
    short_name: 'Geo-smart',
    description: 'Geo-smart Engineering and Real Estate Contractors — Job Management System',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#111827',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
