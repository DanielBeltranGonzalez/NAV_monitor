'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Pencil, Check, X } from 'lucide-react'

interface Bank {
  id: number
  name: string
  _count: { investments: number }
}

export function BankTable({ banks }: { banks: Bank[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function startEdit(bank: Bank) {
    setEditing(bank.id)
    setEditName(bank.name)
    setError('')
  }

  function cancelEdit() {
    setEditing(null)
    setError('')
  }

  async function saveEdit(id: number) {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/banks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Error al guardar')
      setSaving(false)
      return
    }
    setEditing(null)
    setSaving(false)
    router.refresh()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este banco?')) return
    setDeleting(id)
    setError('')
    const res = await fetch(`/api/banks/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'No se pudo eliminar')
    } else {
      router.refresh()
    }
    setDeleting(null)
  }

  if (banks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay bancos. Crea el primero.
      </div>
    )
  }

  return (
    <>
      {error && <p className="px-4 pt-3 text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-right">Inversiones</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {banks.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                {editing === b.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(b.id)
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    autoFocus
                    className="h-8 w-56"
                  />
                ) : (
                  <span className="font-medium">{b.name}</span>
                )}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {b._count.investments}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  {editing === b.id ? (
                    <>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => saveEdit(b.id)}
                        disabled={saving}
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={cancelEdit}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => startEdit(b)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => handleDelete(b.id)}
                        disabled={deleting === b.id || b._count.investments > 0}
                        title={b._count.investments > 0 ? 'Tiene inversiones asociadas' : 'Eliminar'}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
