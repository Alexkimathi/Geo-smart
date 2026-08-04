import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Phone, Mail, MapPin, User, Building2, Hash, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Client, SurveyJob, ConstructionJob } from '@/types/database'
import { ClientEditButton } from './ClientEditButton'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [
    { data: client },
    { data: surveyJobs },
    { data: constructionJobs },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single() as unknown as Promise<{ data: Client | null }>,
    supabase.from('survey_jobs').select('id, job_no, status, start_date').eq('client_id', id).order('created_at', { ascending: false }) as unknown as Promise<{ data: SurveyJob[] | null }>,
    supabase.from('construction_jobs').select('id, job_no, status, progress_pct, start_date').eq('client_id', id).order('created_at', { ascending: false }) as unknown as Promise<{ data: ConstructionJob[] | null }>,
  ])

  if (!client) notFound()

  const infoItems = [
    { icon: Phone, label: 'Phone', value: client.phone },
    { icon: Mail, label: 'Email', value: client.email },
    { icon: Building2, label: 'Company', value: client.company },
    { icon: User, label: 'Contact Person', value: client.contact_person },
    { icon: MapPin, label: 'Site Location', value: client.site_location },
    { icon: Hash, label: 'KRA PIN', value: client.pin },
  ].filter((i) => i.value)

  const totalJobs = (surveyJobs?.length ?? 0) + (constructionJobs?.length ?? 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" />Back to Clients
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
          {client.company && <p className="text-gray-500 mt-0.5">{client.company}</p>}
          <p className="text-xs text-gray-400 mt-1">Added {formatDate(client.created_at)}</p>
        </div>
        <ClientEditButton client={client} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Contact Details</h2>
            <div className="space-y-3">
              {infoItems.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm text-gray-700">{value}</p>
                  </div>
                </div>
              ))}
              {client.gps_lat && client.gps_lng && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">GPS Coordinates</p>
                    <a
                      href={`https://maps.google.com/?q=${client.gps_lat},${client.gps_lng}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {client.gps_lat.toFixed(6)}, {client.gps_lng.toFixed(6)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Jobs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Jobs ({totalJobs})</h2>
              <div className="flex gap-2">
                <Link href={`/jobs/survey/new?client=${id}`}>
                  <Button size="sm" variant="outline">+ Survey Job</Button>
                </Link>
                <Link href={`/jobs/construction/new?client=${id}`}>
                  <Button size="sm" variant="outline">+ Construction Job</Button>
                </Link>
              </div>
            </div>

            {totalJobs === 0 ? (
              <p className="text-sm text-gray-400">No jobs linked to this client yet.</p>
            ) : (
              <div className="space-y-2">
                {surveyJobs?.map((job) => (
                  <Link key={job.id} href={`/jobs/survey/${job.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900 font-mono">{job.job_no}</p>
                      <p className="text-xs text-gray-500">{formatDate(job.start_date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="blue">Survey</Badge>
                      <Badge variant="gray">{job.status}</Badge>
                    </div>
                  </Link>
                ))}
                {constructionJobs?.map((job) => (
                  <Link key={job.id} href={`/jobs/construction/${job.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900 font-mono">{job.job_no}</p>
                      <p className="text-xs text-gray-500">{formatDate(job.start_date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{job.progress_pct}%</span>
                      <Badge variant="orange">Construction</Badge>
                      <Badge variant="gray" className="capitalize">{job.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
