'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Trash2, Pencil, Check, X, History } from 'lucide-react'
import Link from 'next/link'
import { formatEUR, formatDate } from '@/lib/formatters'

interface InvestmentValue {
  id: number
  date: string
  value: string
}

interface Bank {
  id: number
  name: string
}

interface Investment {
  id: number
  name: string
  comment: string | null
  bank: Bank
  createdAt: string
  values: InvestmentValue[]
}

interface EditState {
  name: string
  bankId: string
  comment: string
}

export function InvestmentTable({
  investments,
  banks,
}: {
  investments: Investment[]
  banks: Bank[]
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState>({ name: '', bankId: '', comment: '' })
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  function startEdit(inv: Investment) {
    setEditing(inv.id)
    setEditState({ name: inv.name, bankId: String(inv.bank.id), comment: inv.comment ?? '' })
  }

  function cancelEdit() {
    setEditing(null)
    setEditError('')
  }

  async function saveEdit(id: number) {
    setSaving(true)
    setEditError('')
    const res = await fetch(`/api/investments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editState.name, bankId: Number(editState.bankId), comment: editState.comment.trim() || null }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setEditError(data.error ?? 'Error al guardar')
      return
    }
    setEditing(null)
    router.refresh()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta inversión y todos sus valores?')) return
    setDeleting(id)
    await fetch(`/api/investments/${id}`, { method: 'DELETE' })
    router.refresh()
    setDeleting(null)
  }

  if (investments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay inversiones. Crea la primera.
      </div>
    )
  }

  const active = investments.filter((inv) => {
    const v = inv.values[0]
    return !v || parseFloat(v.value) !== 0
  })
  const inactive = investments.filter((inv) => {
    const v = inv.values[0]
    return v && parseFloat(v.value) === 0
  })

  function toGroups(list: Investment[]) {
    return list.reduce<Record<string, Investment[]>>((acc, inv) => {
      if (!acc[inv.bank.name]) acc[inv.bank.name] = []
      acc[inv.bank.name].push(inv)
      return acc
    }, {})
  }

  function renderRows(list: Investment[]) {
    const groups = toGroups(list)
    return Object.entries(groups).flatMap(([bankName, rows]) => {
      const bankRow = (
        <TableRow key={`bank-${bankName}`} className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/60">
          <TableCell colSpan={4} className="py-1 text-xs text-muted-foreground font-medium">
            {bankName}
          </TableCell>
        </TableRow>
      )

      const invRows = rows.map((inv) => {
        const latest = inv.values[0]
        const isEditing = editing === inv.id
        return (
          <TableRow key={inv.id}>
            <TableCell>
              {isEditing ? (
                <div className="flex flex-col gap-1">
                  <Input
                    value={editState.name}
                    onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(inv.id)
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    autoFocus
                    className="h-8 w-48"
                  />
                  <Select
                    value={editState.bankId}
                    onValueChange={(v) => setEditState((s) => ({ ...s, bankId: v }))}
                  >
                    <SelectTrigger className="h-8 w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <textarea
                    value={editState.comment}
                    onChange={(e) => setEditState((s) => ({ ...s, comment: e.target.value }))}
                    rows={2}
                    maxLength={1000}
                    placeholder="Comentario…"
                    className="w-48 resize-none rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              ) : (
                <div>
                  <span className="font-medium">{inv.name}</span>
                  {inv.comment && (
                    <span className="block text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                      {inv.comment}
                    </span>
                  )}
                </div>
              )}
            </TableCell>
            <TableCell className="text-right">
              {latest ? formatEUR(parseFloat(latest.value)) : '—'}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {latest ? formatDate(latest.date) : '—'}
            </TableCell>
            <TableCell>
              {isEditing && editError && (
                <p className="text-xs text-destructive text-right mb-1">{editError}</p>
              )}
              <div className="flex justify-end gap-1">
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => saveEdit(inv.id)}
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
                      asChild
                      className="h-8 w-8"
                      title="Historial de valores"
                    >
                      <Link href={`/investments/${inv.id}/values`}>
                        <History className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => startEdit(inv)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => handleDelete(inv.id)}
                      disabled={deleting === inv.id}
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
      })

      return [bankRow, ...invRows]
    })
  }

  const colGroup = (
    <colgroup>
      <col />
      <col className="w-36" />
      <col className="w-36" />
      <col className="w-32" />
    </colgroup>
  )

  const tableHeader = (
    <TableHeader>
      <TableRow>
        <TableHead>Nombre</TableHead>
        <TableHead className="text-right">Último NAV</TableHead>
        <TableHead>Fecha</TableHead>
        <TableHead />
      </TableRow>
    </TableHeader>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border bg-white dark:bg-slate-900">
        <Table className="table-fixed w-full">
          {colGroup}
          {tableHeader}
          <TableBody>{renderRows(active)}</TableBody>
        </Table>
      </div>

      {inactive.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground px-4 pb-2">
            NAV = 0
          </h2>
          <div className="rounded-md border bg-white dark:bg-slate-900 opacity-60">
            <Table className="table-fixed w-full">
              {colGroup}
              {tableHeader}
              <TableBody>{renderRows(inactive)}</TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
