"use client"

import { useState } from "react"
import { cn } from "cn"

import { profileInitials } from "@/lib/admin/profile-models"

const SIZE_CLASSES = {
  sm: "size-10 text-xs",
  md: "size-14 text-sm",
  lg: "size-20 text-xl",
  xl: "size-24 text-2xl",
} as const

interface ProfileAvatarProps {
  name: string
  photoUrl?: string | null
  size?: keyof typeof SIZE_CLASSES
  className?: string
}

/**
 * Avatar with the Flutter `ProfileHeader` fallback contract: use the stored
 * photo when it loads, otherwise show the first two initials. No placeholder
 * image is bundled, so a broken URL does not masquerade as a real photo.
 */
export function ProfileAvatar({
  name,
  photoUrl,
  size = "lg",
  className,
}: ProfileAvatarProps) {
  // Remember WHICH URL failed rather than a boolean: selecting a new photo
  // must retry the new URL without a setState-in-effect reset.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showPhoto = Boolean(photoUrl) && failedUrl !== photoUrl

  return (
    <span
      className={cn(
        "bg-primary/10 text-primary ring-background relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-2",
        SIZE_CLASSES[size],
        className,
      )}
      aria-hidden="true"
    >
      {photoUrl && showPhoto ? (
        // External or local file URLs can come from arbitrary hosts; use <img> so Next Image remote
        // patterns would have to be hard-coded to one deployment.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="size-full object-cover"
          onError={() => setFailedUrl(photoUrl)}
        />
      ) : (
        profileInitials(name)
      )}
    </span>
  )
}
