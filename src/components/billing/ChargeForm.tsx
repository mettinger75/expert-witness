'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateCharge } from '@/hooks/useCharges'
import { CHARGE_TYPES } from '@/lib/constants'
import { formatCurrency } from '@/lib/formatters'
import type { LineItemType } from '@/types/enums'

interface ChargeFormProps {
  caseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChargeForm({ caseId, open, onOpenChange }: ChargeFormProps) {
  const createCharge = useCreateCharge()

  const [lineType, setLineType] = useState<string>('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')

  const computedTotal = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)

  function resetForm() {
    setLineType('')
    setDescription('')
    setQuantity('1')
    setUnitPrice('')
  }

  function handleSubmit() {
    if (!lineType) {
      return
    }
    if (!description.trim()) {
      return
    }
    const qty = parseFloat(quantity)
    const price = parseFloat(unitPrice)
    if (isNaN(qty) || isNaN(price)) {
      return
    }

    createCharge.mutate(
      {
        case_id: caseId,
        line_type: lineType as LineItemType,
        description: description.trim(),
        quantity: qty,
        unit_price: price,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          resetForm()
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            style={{ fontFamily: 'Georgia, serif', color: '#0E1F35' }}
          >
            New Charge
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Charge Type */}
          <div>
            <Label htmlFor="charge-type">Charge Type *</Label>
            <Select value={lineType} onValueChange={setLineType}>
              <SelectTrigger id="charge-type">
                <SelectValue placeholder="Select charge type" />
              </SelectTrigger>
              <SelectContent>
                {CHARGE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="charge-description">Description *</Label>
            <Input
              id="charge-description"
              placeholder="Describe the charge..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Quantity + Unit Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="charge-qty">Quantity</Label>
              <Input
                id="charge-qty"
                type="number"
                step="0.25"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="charge-price">Unit Price ($)</Label>
              <Input
                id="charge-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Computed Total */}
          <div
            className="flex justify-between items-center px-3 py-2 rounded-md"
            style={{ backgroundColor: '#F8F6F1' }}
          >
            <span className="text-sm font-medium" style={{ color: '#0E1F35' }}>
              Total
            </span>
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: '#0E1F35' }}
            >
              {formatCurrency(computedTotal)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createCharge.isPending || !lineType || !description.trim() || !unitPrice}
              style={{ backgroundColor: '#0E1F35' }}
            >
              {createCharge.isPending ? 'Saving...' : 'Add Charge'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
