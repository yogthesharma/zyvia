"use client"

import * as React from "react"
import { CopyIcon, TrashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import {
  SettingsPage,
  SettingsSection,
} from "@/components/app/settings-page"
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
import {
  createApiKey,
  revokeApiKey,
  revokeOtherSessions,
} from "@/lib/security/actions"
import {
  formatRelativeTime,
  parseUserAgent,
} from "@/lib/security/format"
import type { DeviceSession, PersonalApiKey } from "@/lib/security/types"
import { cn } from "@/lib/utils"

const TOAST_ID = "security-save"

export function SecurityForm({
  initialSessions,
  initialKeys,
}: {
  initialSessions: DeviceSession[]
  initialKeys: PersonalApiKey[]
}) {
  const [sessions, setSessions] = React.useState(initialSessions)
  const [keys, setKeys] = React.useState(initialKeys)
  const [pending, setPending] = React.useState<string | null>(null)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [keyName, setKeyName] = React.useState("")
  const [createdSecret, setCreatedSecret] = React.useState<string | null>(null)

  const [revokeKeyId, setRevokeKeyId] = React.useState<string | null>(null)

  React.useEffect(() => {
    setSessions(initialSessions)
    setKeys(initialKeys)
  }, [initialSessions, initialKeys])

  const current = sessions.find((session) => session.isCurrent)
  const others = sessions.filter((session) => !session.isCurrent)

  async function onRevokeOthers() {
    if (!others.length) {
      toast.message("No other sessions to revoke", { id: TOAST_ID })
      return
    }
    if (pending === "sessions") return
    setPending("sessions")
    try {
      const result = await revokeOtherSessions()
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.sessions) setSessions(result.sessions)
      toast.success("Other sessions revoked", { id: TOAST_ID })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not revoke sessions.",
        { id: TOAST_ID }
      )
    } finally {
      setPending(null)
    }
  }

  async function onCreateKey() {
    if (pending === "create-key" || !keyName.trim()) return
    setPending("create-key")
    try {
      const result = await createApiKey(keyName)
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.keys) setKeys(result.keys)
      if (result.secret) setCreatedSecret(result.secret)
      toast.success("API key created", { id: TOAST_ID })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create API key.",
        { id: TOAST_ID }
      )
    } finally {
      setPending(null)
    }
  }

  async function onRevokeKey(keyId: string) {
    if (pending?.startsWith("revoke-")) return
    setPending(`revoke-${keyId}`)
    try {
      const result = await revokeApiKey(keyId)
      if (result.error) {
        toast.error(result.error, { id: TOAST_ID })
        return
      }
      if (result.keys) setKeys(result.keys)
      setRevokeKeyId(null)
      toast.success("API key revoked", { id: TOAST_ID })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not revoke API key.",
        { id: TOAST_ID }
      )
    } finally {
      setPending(null)
    }
  }

  async function copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret)
      toast.success("Copied to clipboard", { id: TOAST_ID })
    } catch {
      toast.error("Could not copy to clipboard", { id: TOAST_ID })
    }
  }

  return (
    <>
      <SettingsPage
        title="Security & access"
        description="Manage signed-in devices and personal API keys."
        width="narrow"
      >
        <SettingsSection title="Sessions">
          <div className="space-y-0">
            <div className="px-4 py-3.5">
              <p className="text-sm text-muted-foreground">
                Devices logged into your account.
              </p>
            </div>

            {current ? (
              <div className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <p className="truncate text-sm font-medium">
                      {parseUserAgent(current.userAgent)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This device
                    {current.ip ? ` · ${current.ip}` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="px-4 py-3.5 text-sm text-muted-foreground">
                No active session details available.
              </p>
            )}

            {others.length > 0 ? (
              <div className="space-y-0">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <p className="text-sm text-muted-foreground">
                    {others.length} other session
                    {others.length === 1 ? "" : "s"}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending === "sessions"}
                    onClick={() => void onRevokeOthers()}
                  >
                    {pending === "sessions" ? "Revoking…" : "Revoke all"}
                  </Button>
                </div>
                {others.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium">
                        {parseUserAgent(session.userAgent)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Last seen {formatRelativeTime(session.lastSeenAt)}
                        {session.ip ? ` · ${session.ip}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </SettingsSection>

        <SettingsSection title="Personal API keys">
          <div className="space-y-0">
            <div className="flex items-start justify-between gap-4 px-4 py-3.5">
              <p className="text-sm text-muted-foreground">
                Use Zyvia’s GraphQL API to build your own integrations. Actions
                are attributed to you.
              </p>
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setKeyName("")
                  setCreatedSecret(null)
                  setCreateOpen(true)
                }}
              >
                New API key
              </Button>
            </div>

            {keys.length === 0 ? (
              <p className="px-4 py-3.5 text-sm text-muted-foreground">
                No API keys yet.
              </p>
            ) : (
              keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">{key.name}</p>
                    <p className="text-sm text-muted-foreground">
                      full access · {key.keyPrefix}…
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {formatRelativeTime(key.createdAt)}
                      {" · "}
                      Last used {formatRelativeTime(key.lastUsedAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Revoke ${key.name}`}
                    disabled={pending === `revoke-${key.id}`}
                    onClick={() => setRevokeKeyId(key.id)}
                  >
                    <TrashIcon className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </SettingsSection>
      </SettingsPage>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            setKeyName("")
            setCreatedSecret(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {createdSecret ? "API key created" : "Create API key"}
            </DialogTitle>
            <DialogDescription>
              {createdSecret
                ? "Copy this key now. You won’t be able to see it again."
                : "When using the API key all actions are attributed to you as an individual."}
            </DialogDescription>
          </DialogHeader>

          {createdSecret ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <code
                  className={cn(
                    "block flex-1 overflow-x-auto rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs"
                  )}
                >
                  {createdSecret}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Copy API key"
                  onClick={() => void copySecret(createdSecret)}
                >
                  <CopyIcon className="size-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => {
                    setCreateOpen(false)
                    setCreatedSecret(null)
                    setKeyName("")
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="api-key-name" className="text-sm font-medium">
                  Key name
                </label>
                <Input
                  id="api-key-name"
                  value={keyName}
                  placeholder="A descriptive name for this API key…"
                  maxLength={80}
                  disabled={pending === "create-key"}
                  onChange={(event) => setKeyName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && keyName.trim()) {
                      event.preventDefault()
                      void onCreateKey()
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Permissions: full access to workspaces you can use.
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending === "create-key"}
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={pending === "create-key" || !keyName.trim()}
                  onClick={() => void onCreateKey()}
                >
                  {pending === "create-key" ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(revokeKeyId)}
        onOpenChange={(open) => {
          if (!open) setRevokeKeyId(null)
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Revoke API key?</DialogTitle>
            <DialogDescription>
              Integrations using this key will stop working immediately. You
              can’t undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending?.startsWith("revoke-")}
              onClick={() => setRevokeKeyId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!revokeKeyId || pending === `revoke-${revokeKeyId}`}
              onClick={() => {
                if (revokeKeyId) void onRevokeKey(revokeKeyId)
              }}
            >
              {pending?.startsWith("revoke-") ? "Revoking…" : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
