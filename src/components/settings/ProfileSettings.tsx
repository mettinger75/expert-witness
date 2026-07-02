'use client'

import { useState, useEffect } from 'react'
import { authHeaders } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ProfileData {
  firstName: string
  lastName: string
  credentials: string
  specialty: string
  subspecialties: string
  bio: string
  practiceName: string
  address: string
  city: string
  state: string
  zip: string
  email: string
  phone: string
}

const DEFAULT_PROFILE: ProfileData = {
  firstName: 'Mark',
  lastName: 'Ettinger',
  credentials: 'MD',
  specialty: 'Anesthesiology',
  subspecialties: '',
  bio: '',
  practiceName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  email: '',
  phone: '',
}

export function ProfileSettings() {
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Load from system_settings
    fetch('/api/settings/options')
      .then((r) => r.json())
      .then((data) => {
        if (data['options.profile']) {
          setProfile((prev) => ({ ...prev, ...data['options.profile'] }))
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          settingKey: 'options.profile',
          options: profile as unknown as Array<{ value: string; label: string; is_active: boolean; sort_order: number }>,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Profile saved successfully')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const update = (field: keyof ProfileData, value: string) =>
    setProfile((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expert Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first-name">First Name</Label>
              <Input id="first-name" value={profile.firstName} onChange={(e) => update('firstName', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="last-name">Last Name</Label>
              <Input id="last-name" value={profile.lastName} onChange={(e) => update('lastName', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="credentials">Credentials</Label>
            <Input id="credentials" value={profile.credentials} onChange={(e) => update('credentials', e.target.value)} placeholder="e.g., MD, DO, PhD" />
          </div>
          <div>
            <Label htmlFor="specialty">Primary Specialty</Label>
            <Input id="specialty" value={profile.specialty} onChange={(e) => update('specialty', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="subspecialties">Subspecialties</Label>
            <Input id="subspecialties" value={profile.subspecialties} onChange={(e) => update('subspecialties', e.target.value)} placeholder="e.g., Critical Care, Obstetric Anesthesia" />
          </div>
          <div>
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea id="bio" rows={4} value={profile.bio} onChange={(e) => update('bio', e.target.value)} placeholder="Brief professional biography for reports..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="practice-name">Practice Name</Label>
            <Input id="practice-name" value={profile.practiceName} onChange={(e) => update('practiceName', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={profile.address} onChange={(e) => update('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={profile.city} onChange={(e) => update('city', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={profile.state} onChange={(e) => update('state', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" value={profile.zip} onChange={(e) => update('zip', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={profile.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={profile.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Profile
        </Button>
      </div>
    </div>
  )
}
