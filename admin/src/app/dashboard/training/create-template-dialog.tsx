"use client"

import { useState, type FormEvent } from "react"
import { Loader2, Send } from "lucide-react"

import { EmployeeActionError } from "@/lib/admin/employee-actions"
import { createTrainingTemplate } from "@/lib/admin/training-actions"
import { TRAINING_REQUIREMENT_TYPES } from "@/lib/admin/training-models"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

/**
 * "Create New Template" — port of the Flutter CreateTrainingDialog
 * (admin_training/presentation/screens/widgets/create_training_dialog.dart).
 *
 * Validation mirrors the Dart form (title, description and duration are
 * mandatory; requirement type is one of certificate/acknowledgement). The
 * duration is free text on web ("45 mins") because the Flutter time picker
 * exists only to format `"{h}h {m} mins"` into the same string.
 */

interface CreateTemplateDialogProps {
  open: boolean
  adminUid: string
  onOpenChange: (open: boolean) => void
  onCreated: (template: { id: string; title: string }) => void
}

export function CreateTemplateDialog({
  open,
  adminUid,
  onOpenChange,
  onCreated,
}: CreateTemplateDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [durationText, setDurationText] = useState("")
  const [requirementType, setRequirementType] = useState<string>("certificate")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setTitle("")
    setDescription("")
    setDurationText("")
    setRequirementType("certificate")
    setError(null)
    setSubmitting(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true)
      return
    }
    if (submitting) {
      return
    }
    onOpenChange(false)
    setTimeout(reset, 150)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (title.trim().length === 0) {
      setError("Title is required.")
      return
    }
    if (description.trim().length === 0) {
      setError("Description is required.")
      return
    }
    if (durationText.trim().length === 0) {
      setError("Duration is required.")
      return
    }

    setSubmitting(true)
    try {
      const created = await createTrainingTemplate({
        adminUid,
        title,
        description,
        durationText,
        requirementType,
      })
      onCreated({ id: created.id, title: title.trim() })
      reset()
      onOpenChange(false)
    } catch (caught) {
      setError(
        caught instanceof EmployeeActionError
          ? caught.message
          : "The training template could not be published. Try again.",
      )
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="create-template-dialog" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish New Training</DialogTitle>
          <DialogDescription>
            Define a training template. Employees receive a personal copy when the
            template is assigned.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="create-template-title">Training Title *</Label>
            <Input
              id="create-template-title"
              data-testid="create-template-title"
              value={title}
              disabled={submitting}
              placeholder="e.g. HIPAA Compliance 2026"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-template-description">Description / Summary *</Label>
            <Textarea
              id="create-template-description"
              data-testid="create-template-description"
              value={description}
              disabled={submitting}
              rows={4}
              placeholder="Outline the core objectives and curriculum of this module…"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-template-duration">Estimated Duration *</Label>
              <Input
                id="create-template-duration"
                data-testid="create-template-duration"
                value={durationText}
                disabled={submitting}
                placeholder="e.g. 45 mins"
                onChange={(event) => setDurationText(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-template-requirement">Requirement Type</Label>
              <select
                id="create-template-requirement"
                data-testid="create-template-requirement"
                className="border-input dark:bg-input/30 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                value={requirementType}
                disabled={submitting}
                onChange={(event) => setRequirementType(event.target.value)}
              >
                {TRAINING_REQUIREMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === "certificate" ? "Certificate Upload" : "Digital Acknowledgement"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <p role="alert" data-testid="create-template-error" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => handleOpenChange(false)}
            >
              Discard
            </Button>
            <Button type="submit" data-testid="create-template-submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 size-4" />
              )}
              {submitting ? "Publishing…" : "Publish Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
