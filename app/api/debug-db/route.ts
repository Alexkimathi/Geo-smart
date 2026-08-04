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
    url_value: process.env.NEXT_PUBLIC_SUPABASE_URL,
    service_key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20),
    clients: { count: clients.count, status: clients.status, statusText: clients.statusText, error: clients.error },
    survey_jobs: { count: survey.count, status: survey.status, statusText: survey.statusText, error: survey.error },
    construction_jobs: { count: construction.count, status: construction.status, statusText: construction.statusText, error: construction.error },
  })
}
