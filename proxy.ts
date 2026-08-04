import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

async function proxyHandler(request: NextRequest) {
  return await updateSession(request)
}

export const proxy = proxyHandler
export default proxyHandler

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
