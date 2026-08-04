import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET() {
  const db = createServiceClient()

  const [clients, survey, construction] = await Promise.all([
    db.from('clients').select('*', { count: 'exact', head: true }),
    db.from('survey_jobs').select('*', { count: 'exact', head: true }),
    db.from('construction_jobs').select('*', { count: 'exact', head: true }),
  ])

  return NextResponse.json({
    url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    clients: { count: clients.count, error: clients.error?.message ?? null },
    survey_jobs: { count: survey.count, error: survey.error?.message ?? null },
    construction_jobs: { count: construction.count, error: construction.error?.message ?? null },
  })
}
