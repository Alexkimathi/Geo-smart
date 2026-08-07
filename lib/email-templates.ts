const fmt = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 2 })

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>GeoSmart Notification</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:24px 32px;border-radius:8px 8px 0 0;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">GeoSmart</span>
              <span style="color:#93c5fd;font-size:14px;margin-left:8px;">Survey &amp; Mapping</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">This is an automated notification from GeoSmart. Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;color:#6b7280;font-size:14px;white-space:nowrap;width:140px;">${label}</td>
    <td style="padding:8px 12px;color:#111827;font-size:14px;font-weight:500;">${value}</td>
  </tr>`
}

// ─── Job Delivered ─────────────────────────────────────────────────────────

export interface JobDeliveredData {
  job_no: string
  site_name: string
  survey_type: string
  county?: string | null
  clientName: string | null
  start_date?: string | null
  end_date?: string | null
}

export function jobDeliveredEmailTemplate(data: JobDeliveredData): { subject: string; html: string } {
  const subject = `Survey Job Delivered — ${data.job_no}: ${data.site_name}`

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—'
    const parsed = new Date(d + 'T00:00:00')
    return new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
  }

  const content = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Survey Job Delivered</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">The following survey job has been marked as <strong style="color:#15803d;">Delivered</strong>.</p>

    <span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:12px;font-weight:700;letter-spacing:0.5px;padding:4px 12px;border-radius:9999px;margin-bottom:24px;">DELIVERED</span>

    <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;overflow:hidden;margin-bottom:24px;">
      ${detailRow('Job Number', data.job_no)}
      ${detailRow('Site Name', data.site_name)}
      ${detailRow('Survey Type', data.survey_type)}
      ${detailRow('County', data.county ?? '—')}
      ${detailRow('Client', data.clientName ?? '—')}
      ${detailRow('Start Date', formatDate(data.start_date))}
      ${detailRow('End Date', formatDate(data.end_date))}
    </table>

    <p style="margin:0;color:#6b7280;font-size:13px;">Log in to GeoSmart to view the full job details and related documents.</p>
  `

  return { subject, html: emailLayout(content) }
}

// ─── Invoice Sent ──────────────────────────────────────────────────────────

export interface InvoiceSentData {
  docNo: string
  clientName: string | null
  total: number
  dueDate?: string | null
  jobRef?: string | null
}

export function invoiceSentEmailTemplate(data: InvoiceSentData): { subject: string; html: string } {
  const subject = `Invoice ${data.docNo} Issued — ${data.clientName ?? 'Client'}`

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—'
    const parsed = new Date(d + 'T00:00:00')
    return new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
  }

  const content = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Invoice Issued</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">The following invoice has been marked as <strong style="color:#b45309;">Sent</strong> to the client.</p>

    <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;overflow:hidden;margin-bottom:24px;">
      ${detailRow('Invoice Number', data.docNo)}
      ${detailRow('Client', data.clientName ?? '—')}
      ${detailRow('Amount', fmt.format(data.total))}
      ${detailRow('Due Date', formatDate(data.dueDate))}
      ${data.jobRef ? detailRow('Job Reference', data.jobRef) : ''}
    </table>

    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;color:#854d0e;font-size:13px;">
        <strong>Payment Reminder:</strong> Please ensure payment is made by the due date shown above.
        Contact us if you have any questions about this invoice.
      </p>
    </div>

    <p style="margin:0;color:#6b7280;font-size:13px;">Log in to GeoSmart to view the full invoice details and make a payment record.</p>
  `

  return { subject, html: emailLayout(content) }
}
