'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import { formatEUR, formatDate } from '@/lib/formatters'

interface ValueRow {
  id: number
  date: string
  value: string
}

interface EditState {
  date: string
  value: string
}

export function ValueTable({
  investmentId,
  values,
}: {
  investmentId: number
  values: ValueRow[]
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState>({ date: '', value: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function startEdit(v: ValueRow) {
    setEditing(v.id)
    setEditState({
      date: v.date.slice(0, 10),
      value: String(parseFloat(v.value)),
    })
    setError('')
  }

  function cancelEdit() {
    setEditing(null)
    setError('')
  }

  async function saveEdit(id: number) {
    setSaving(true)
    setError('')
    const numValue = parseFloat(editState.value)
    const res = await fetch(`/api/values/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: editState.date, value: numValue }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Error al guardar')
      return
    }
    setEditing(null)
    router.refresh()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este valor?')) return
    setDeleting(id)
    const res = await fetch(`/api/values/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Error al eliminar')
    } else {
      router.refresh()
    }
    setDeleting(null)
  }

  if (values.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay valores registrados para esta inversión.
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-white dark:bg-slate-900">
      {error && <p className="px-4 pt-3 text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Valor (€)</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {values.map((v) => {
            const isEditing = editing === v.id
            return (
              <TableRow key={v.id}>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editState.date}
                      onChange={(e) => setEditState((s) => ({ ...s, date: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(v.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="h-8 w-40"
                    />
                  ) : (
                    formatDate(v.date)
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editState.value}
                      onChange={(e) => setEditState((s) => ({ ...s, value: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(v.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                      className="h-8 w-36 text-right"
                    />
                  ) : (
                    formatEUR(parseFloat(v.value))
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => saveEdit(v.id)}
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
                          onClick={() => startEdit(v)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleDelete(v.id)}
                          disabled={deleting === v.id}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
