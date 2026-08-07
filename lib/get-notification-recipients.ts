import { createServiceClient } from '@/lib/supabase/service'

export interface RecipientResult {
  emails: string[]
  clientEmail: string | null
  clientName: string | null
}

export async function getSurveyJobNotificationRecipients(jobId: string): Promise<RecipientResult> {
  const db = createServiceClient()

  const [jobResult, usersResult, profilesResult] = await Promise.all([
    db
      .from('survey_jobs')
      .select('client_id, team_ids, clients(name, email)')
      .eq('id', jobId)
      .single(),
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from('profiles').select('id, role').in('role', ['admin', 'manager']),
  ])

  const job = jobResult.data
  const allUsers = usersResult.data?.users ?? []
  const adminManagerProfiles = profilesResult.data ?? []

  // Build a map of user id → email for quick lookup
  const userEmailMap = new Map<string, string>(
    allUsers.flatMap((u) => (u.email ? [[u.id, u.email]] : []))
  )

  const emails = new Set<string>()
  let clientEmail: string | null = null
  let clientName: string | null = null

  // 1. Client email
  const client = (job?.clients as { name?: string; email?: string } | null)
  if (client?.email) {
    clientEmail = client.email
    clientName = client.name ?? null
    emails.add(client.email)
  } else if (client?.name) {
    clientName = client.name
  }

  // 2. Admins and managers
  for (const profile of adminManagerProfiles) {
    const email = userEmailMap.get(profile.id)
    if (email) emails.add(email)
  }

  // 3. Team members — try job_team table first, fall back to team_ids[]
  const { data: teamRows } = await db
    .from('job_team')
    .select('user_id')
    .eq('job_id', jobId)

  const teamIds: string[] =
    teamRows && teamRows.length > 0
      ? teamRows.map((r: { user_id: string }) => r.user_id)
      : (job?.team_ids ?? [])

  for (const uid of teamIds) {
    const email = userEmailMap.get(uid)
    if (email) emails.add(email)
  }

  return { emails: Array.from(emails), clientEmail, clientName }
}

export async function getInvoiceNotificationRecipients(docId: string): Promise<RecipientResult> {
  const db = createServiceClient()

  const [docResult, usersResult, profilesResult] = await Promise.all([
    db
      .from('finance_documents')
      .select('client_id, clients(name, email)')
      .eq('id', docId)
      .single(),
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from('profiles').select('id, role').in('role', ['admin', 'manager']),
  ])

  const doc = docResult.data
  const allUsers = usersResult.data?.users ?? []
  const adminManagerProfiles = profilesResult.data ?? []

  const userEmailMap = new Map<string, string>(
    allUsers.flatMap((u) => (u.email ? [[u.id, u.email]] : []))
  )

  const emails = new Set<string>()
  let clientEmail: string | null = null
  let clientName: string | null = null

  // 1. Client email
  const client = (doc?.clients as { name?: string; email?: string } | null)
  if (client?.email) {
    clientEmail = client.email
    clientName = client.name ?? null
    emails.add(client.email)
  } else if (client?.name) {
    clientName = client.name
  }

  // 2. Admins and managers
  for (const profile of adminManagerProfiles) {
    const email = userEmailMap.get(profile.id)
    if (email) emails.add(email)
  }

  return { emails: Array.from(emails), clientEmail, clientName }
}
