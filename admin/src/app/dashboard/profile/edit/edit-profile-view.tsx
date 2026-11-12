"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { ArrowLeft, ImagePlus, Loader2, Save } from "lucide-react"

import {
  ProfileActionError,
  updateAdminProfile,
} from "@/lib/admin/profile-actions"
import {
  validateProfileName,
  validateProfilePhoto,
  type AdminSelfProfile,
} from "@/lib/admin/profile-models"

import { ProfileAvatar } from "@/app/dashboard/profile/profile-avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Edit Profile — port of Flutter `EditProfileView`
 * (employee/profile/presentation/edit_profile_view.dart, reused by
 * admin_profile/layout/admin_edit_profile_page.dart).
 *
 * Name and photo are editable; email is read-only. The save path uploads the
 * photo to the same `profiles/{uid}/...` prefix as Flutter, then updates
 * `users/{uid}` with `name`, optional `photoUrl` and `updatedAt`.
 */
export function EditProfileView({ profile }: { profile: AdminSelfProfile }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(profile.name)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The cleanup only releases the previous object URL; creating the next one
  // happens in the picker handler (never as a setState inside an effect).
  useEffect(() => {
    if (!previewUrl) {
      return
    }
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setError(null)
    if (!file) {
      setPhotoFile(null)
      setPreviewUrl(null)
      return
    }
    const photoError = validateProfilePhoto(file)
    if (photoError) {
      setError(photoError)
      setPhotoFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }
    setPhotoFile(file)
    setPreviewUrl(
      typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null,
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) {
      return
    }

    const nameError = validateProfileName(name)
    if (nameError) {
      setError(nameError)
      return
    }

    setError(null)
    setSaving(true)
    try {
      await updateAdminProfile({ uid: profile.uid, name, photoFile })
      router.push("/dashboard/profile")
      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof ProfileActionError
          ? caught.message
          : "Your profile could not be updated. Please try again.",
      )
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/profile">
            <ArrowLeft className="mr-1.5 size-4" />
            Profile
          </Link>
        </Button>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Profile</h1>
        <p className="text-muted-foreground text-sm">
          Update the name and photo shown across StaffRail.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
            <CardDescription>
              Your email address is managed by your workspace administrator and cannot be
              changed here.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <ProfileAvatar
                name={name || profile.name}
                photoUrl={previewUrl ?? profile.photoUrl}
                size="xl"
              />
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  data-testid="profile-photo-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={saving}
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="mr-2 size-4" />
                  Choose photo
                </Button>
                <p className="text-muted-foreground text-xs">
                  {photoFile
                    ? `${photoFile.name} · a new photo will be uploaded when you save.`
                    : "JPG, PNG or another image type up to 5 MB."}
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                data-testid="profile-name"
                autoComplete="name"
                value={name}
                disabled={saving}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-email">Email account</Label>
              <Input
                id="profile-email"
                value={profile.email}
                readOnly
                disabled
                aria-describedby="profile-email-help"
              />
              <p id="profile-email-help" className="text-muted-foreground text-xs">
                Contact support if this address needs to change.
              </p>
            </div>

            {error ? (
              <p role="alert" data-testid="profile-edit-error" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
          </CardContent>

          <CardFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => router.push("/dashboard/profile")}
            >
              Cancel
            </Button>
            <Button type="submit" data-testid="profile-save" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
