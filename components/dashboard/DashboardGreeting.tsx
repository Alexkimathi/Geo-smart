'use client'

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

export function DashboardGreeting({ name }: { name: string }) {
  return (
    <h1 className="text-2xl font-bold text-gray-900">
      Good {getGreeting()}, {name}
    </h1>
  )
}
