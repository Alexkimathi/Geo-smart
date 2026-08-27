import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// Auto-release plots:
// 1. Reservations approved 14+ days ago with no installment payments → cancel
// 2. Active reservations where last payment was 30+ days ago → default

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const now = new Date()
  const released: string[] = []
  const defaulted: string[] = []

  // ── Rule 1: 14-day lock ────────────────────────────────────
  // Reservation approved but reservation_expires_at has passed
  // AND there are no installment/lump_sum payments (only optional reservation_fee)
  const { data: expiredReservations } = await db
    .from('plot_reservations')
    .select('id, plot_id')
    .eq('status', 'active')
    .lt('reservation_expires_at', now.toISOString())

  for (const res of expiredReservations ?? []) {
    // Check if any installment/lump_sum payment exists
    const { count } = await db
      .from('plot_payments')
      .select('id', { count: 'exact', head: true })
      .eq('reservation_id', res.id)
      .in('payment_type', ['installment', 'lump_sum'])

    if ((count ?? 0) === 0) {
      // No installment started — cancel and release
      await db.from('plot_reservations').update({ status: 'cancelled' }).eq('id', res.id)
      await db.from('plots').update({ status: 'available' }).eq('id', res.plot_id)
      released.push(res.id)
    }
  }

  // ── Rule 2: 30-day default ─────────────────────────────────
  // For active reservations, find the latest installment/lump_sum payment
  // If last_payment_date + 30 days < now → default
  const { data: activeReservations } = await db
    .from('plot_reservations')
    .select('id, plot_id')
    .eq('status', 'active')

  for (const res of activeReservations ?? []) {
    const { data: lastPayment } = await db
      .from('plot_payments')
      .select('payment_date')
      .eq('reservation_id', res.id)
      .in('payment_type', ['installment', 'lump_sum'])
      .order('payment_date', { ascending: false })
      .limit(1)
      .single()

    if (!lastPayment) continue  // no installments yet — handled by Rule 1

    const lastDate = new Date(lastPayment.payment_date)
    const deadline = new Date(lastDate)
    deadline.setDate(deadline.getDate() + 30)

    if (now > deadline) {
      await db.from('plot_reservations').update({ status: 'defaulted' }).eq('id', res.id)
      await db.from('plots').update({ status: 'available' }).eq('id', res.plot_id)
      defaulted.push(res.id)
    }
  }

  return NextResponse.json({
    ok: true,
    released: released.length,
    defaulted: defaulted.length,
    releasedIds: released,
    defaultedIds: defaulted,
    runAt: now.toISOString(),
  })
}
