import { beforeEach, describe, expect, it, vi } from "vitest"

import { MemoryDataStore } from "@/lib/data/memory-store"
import {
  ProfileActionError,
  changeAdminPassword,
  deleteAdminWorkspace,
  updateAdminProfile,
} from "@/lib/admin/profile-actions"

const ADMIN = "adm-1"
const EMAIL = "admin@staffrail.test"

function validPassword(): string {
  return "LongEnough1!"
}

let store: MemoryDataStore

beforeEach(() => {
  vi.clearAllMocks()
  store = new MemoryDataStore([
    [`users/${ADMIN}`, { uid: ADMIN, email: EMAIL, name: "Jordan Taylor", role: "admin", isActive: true }],
  ])
})

describe("updateAdminProfile", () => {
  it("updates the users/{uid} name when no photo is selected", async () => {
    const result = await updateAdminProfile({ uid: ADMIN, name: "  Jordan Taylor  " }, store)

    expect(store.docs.get(`users/${ADMIN}`)?.name).toBe("Jordan Taylor")
    expect(store.docs.get(`users/${ADMIN}`)?.updatedAt).toBeInstanceOf(Date)
    expect(store.files.size).toBe(0)
    expect(result).toEqual({ name: "Jordan Taylor" })
  })

  it("uploads the photo under profiles/{uid}/ then writes the download URL", async () => {
    const photo = {
      name: "head shot.png",
      type: "image/png",
      size: 2048,
    } as File

    const result = await updateAdminProfile(
      {
        uid: ADMIN,
        name: "Jordan Taylor",
        photoFile: photo,
      },
      store,
    )

    expect(store.files.size).toBe(1)
    const uploadedPath = Array.from(store.files.keys())[0]
    expect(uploadedPath).toMatch(/^profiles\/adm-1\/\d+_head_shot\.png$/)
    expect(result.photoUrl).toMatch(/^\/api\/files\/profiles\/adm-1\//)
    expect(store.docs.get(`users/${ADMIN}`)?.photoUrl).toBe(result.photoUrl)
  })

  it("rejects a blank name and a non-image before touching the store", async () => {
    await expect(updateAdminProfile({ uid: ADMIN, name: "   " }, store)).rejects.toMatchObject({
      code: "invalid-name",
    })
    await expect(
      updateAdminProfile(
        {
          uid: ADMIN,
          name: "Jordan",
          photoFile: { name: "x.pdf", type: "application/pdf", size: 10 } as File,
        },
        store,
      ),
    ).rejects.toMatchObject({ code: "invalid-photo" })

    expect(store.files.size).toBe(0)
  })

  it("maps permission failures to a clear profile error", async () => {
    vi.spyOn(store, "updateDoc").mockRejectedValue(
      Object.assign(new Error("denied"), { code: "permission-denied" }),
    )

    await expect(updateAdminProfile({ uid: ADMIN, name: "Jordan" }, store)).rejects.toMatchObject({
      code: "permission-denied",
    })
  })
})

describe("changeAdminPassword", () => {
  it("rejects a weak password without calling the server action", async () => {
    const changeFn = vi.fn()
    await expect(
      changeAdminPassword(
        {
          uid: ADMIN,
          email: EMAIL,
          currentPassword: "old-password",
          newPassword: "short",
        },
        changeFn,
      ),
    ).rejects.toMatchObject({ code: "invalid-password" })

    expect(changeFn).not.toHaveBeenCalled()
  })

  it("delegates valid password updates to the server action", async () => {
    const changeFn = vi.fn().mockResolvedValue(undefined)
    await changeAdminPassword(
      {
        uid: ADMIN,
        email: EMAIL,
        currentPassword: "old-password",
        newPassword: validPassword(),
      },
      changeFn,
    )

    expect(changeFn).toHaveBeenCalledWith("old-password", validPassword())
  })

  it("maps wrong current password to the friendly wrong-password code", async () => {
    const changeFn = vi.fn().mockRejectedValue(
      Object.assign(new Error("wrong"), { code: "auth/wrong-password" }),
    )

    await expect(
      changeAdminPassword(
        {
          uid: ADMIN,
          email: EMAIL,
          currentPassword: "nope",
          newPassword: validPassword(),
        },
        changeFn,
      ),
    ).rejects.toMatchObject({
      code: "wrong-password",
      message: "Incorrect password. Please try again.",
    })
  })
})

describe("deleteAdminWorkspace", () => {
  it("delegates workspace dissolution with password confirmation", async () => {
    const dissolveFn = vi.fn().mockResolvedValue({ success: true, cascaded: 4 })
    const result = await deleteAdminWorkspace(
      {
        uid: ADMIN,
        email: EMAIL,
        password: "correct-password",
      },
      dissolveFn,
    )

    expect(dissolveFn).toHaveBeenCalledWith("correct-password")
    expect(result).toEqual({ cascaded: 4 })
  })

  it("surfaces the backend size limit", async () => {
    const dissolveFn = vi.fn().mockRejectedValue(
      Object.assign(new Error("too many"), { code: "resource-exhausted" }),
    )

    await expect(
      deleteAdminWorkspace({ uid: ADMIN, email: EMAIL, password: "correct-password" }, dissolveFn),
    ).rejects.toMatchObject({ code: "too-many-linked-accounts" })
  })

  it("surfaces a concurrent-change conflict", async () => {
    const dissolveFn = vi.fn().mockRejectedValue(
      Object.assign(new Error("conflict"), { code: "aborted" }),
    )

    await expect(
      deleteAdminWorkspace({ uid: ADMIN, email: EMAIL, password: "correct-password" }, dissolveFn),
    ).rejects.toMatchObject({ code: "conflict" })
  })

  it("maps permission failures and empty password cleanly", async () => {
    const dissolveFn = vi.fn().mockRejectedValue(
      Object.assign(new Error("denied"), { code: "permission-denied" }),
    )

    await expect(
      deleteAdminWorkspace({ uid: ADMIN, email: EMAIL, password: "correct-password" }, dissolveFn),
    ).rejects.toMatchObject({ code: "permission-denied" })

    await expect(
      deleteAdminWorkspace({ uid: ADMIN, email: EMAIL, password: "" }, dissolveFn),
    ).rejects.toBeInstanceOf(ProfileActionError)
  })
})
