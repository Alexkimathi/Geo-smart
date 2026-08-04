'use client'

import { useRouter } from 'next/navigation'
import { useState, useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ClientForm } from '@/components/clients/ClientForm'
import { updateClientAction } from '../actions'
import type { Client } from '@/types/database'
import type { ClientFormState } from '../actions'
import { Pencil } from 'lucide-react'

export function ClientEditButton({ client }: { client: Client }) {
  const [open, setOpen] = useState(false)

  const boundAction = (prev: ClientFormState, formData: FormData) =>
    updateClientAction(client.id, prev, formData)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-4 h-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>
        <ClientForm
          client={client}
          action={boundAction}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
