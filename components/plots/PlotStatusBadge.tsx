import { cn } from '@/lib/utils'
import type { PlotStatus, ReservationStatus } from '@/types/database'

const PLOT_COLORS: Record<PlotStatus, string> = {
  available:   'bg-green-100 text-green-800',
  reserved:    'bg-yellow-100 text-yellow-800',
  sold:        'bg-red-100 text-red-800',
  transferred: 'bg-blue-100 text-blue-800',
}

const PLOT_LABELS: Record<PlotStatus, string> = {
  available:   'Available',
  reserved:    'Reserved',
  sold:        'Sold',
  transferred: 'Transferred',
}

const RES_COLORS: Record<ReservationStatus, string> = {
  pending_approval: 'bg-orange-100 text-orange-800',
  active:           'bg-yellow-100 text-yellow-800',
  completed:        'bg-green-100 text-green-800',
  defaulted:        'bg-red-100 text-red-800',
  cancelled:        'bg-gray-100 text-gray-600',
}

const RES_LABELS: Record<ReservationStatus, string> = {
  pending_approval: 'Pending Approval',
  active:           'Active',
  completed:        'Completed',
  defaulted:        'Defaulted',
  cancelled:        'Cancelled',
}

export function PlotStatusBadge({ status }: { status: PlotStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', PLOT_COLORS[status])}>
      {PLOT_LABELS[status]}
    </span>
  )
}

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', RES_COLORS[status])}>
      {RES_LABELS[status]}
    </span>
  )
}
