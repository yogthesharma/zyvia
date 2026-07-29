"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CaretDownIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
} from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  createWorkspaceInvites,
  revokeWorkspaceInvite,
} from "@/lib/members/actions"
import {
  formatJoinedMonth,
  formatLastSeen,
  initialsFromName,
  workspaceRoleLabel,
} from "@/lib/members/schema"
import type {
  PendingInviteRow,
  WorkspaceMemberRow,
  WorkspaceMembersPageData,
} from "@/lib/members/types"

const TOAST_ID = "workspace-members"

type Filter = "all" | "active" | "pending"

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  active: "Active",
  pending: "Pending invites",
}

function MemberNameCell({ member }: { member: WorkspaceMemberRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar className="size-6">
        {member.avatarUrl ? (
          <AvatarImage src={member.avatarUrl} alt="" />
        ) : null}
        <AvatarFallback className="text-[10px]">
          {initialsFromName(member.fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{member.fullName}</p>
        {member.username ? (
          <p className="truncate text-xs text-muted-foreground">
            {member.username}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function createMemberColumns(): ColumnDef<WorkspaceMemberRow>[] {
  return [
    {
      accessorKey: "fullName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => <MemberNameCell member={row.original} />,
    },
    {
      accessorKey: "email",
      header: "Email",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email || "—"}</span>
      ),
    },
    {
      accessorKey: "role",
      header: "Status",
      enableSorting: false,
      size: 110,
      meta: { className: "w-[7rem]" },
      cell: ({ row }) => (
        <Badge variant={row.original.role === "member" ? "outline" : "default"}>
          {workspaceRoleLabel(row.original.role)}
        </Badge>
      ),
    },
    {
      accessorKey: "teamCount",
      header: "Teams",
      enableSorting: false,
      size: 96,
      meta: { className: "w-[6rem]" },
      cell: ({ row }) => {
        const count = row.original.teamCount
        return (
          <span className="text-muted-foreground">
            {count === 1 ? "1 team" : `${count} teams`}
          </span>
        )
      },
    },
    {
      accessorKey: "joinedAt",
      header: "Joined",
      enableSorting: false,
      size: 96,
      meta: { className: "w-[6rem]" },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatJoinedMonth(row.original.joinedAt)}
        </span>
      ),
    },
    {
      accessorKey: "lastSeenAt",
      header: "Last seen",
      enableSorting: false,
      size: 104,
      meta: { className: "w-[6.5rem]" },
      cell: ({ row }) => {
        const label = formatLastSeen(row.original.lastSeenAt)
        return (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {label === "Online" ? (
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            ) : null}
            {label}
          </span>
        )
      },
    },
  ]
}

function createInviteColumns(options: {
  canManage: boolean
  onRevoke: (invite: PendingInviteRow) => void
  pendingId: string | null
}): ColumnDef<PendingInviteRow>[] {
  return [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      enableSorting: false,
      size: 110,
      meta: { className: "w-[7rem]" },
      cell: ({ row }) => (
        <Badge variant="outline">{workspaceRoleLabel(row.original.role)}</Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Invited",
      enableSorting: false,
      size: 96,
      meta: { className: "w-[6rem]" },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatJoinedMonth(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      size: 96,
      meta: { className: "w-[6rem]" },
      cell: ({ row }) =>
        options.canManage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={options.pendingId === row.original.id}
            onClick={(event) => {
              event.stopPropagation()
              options.onRevoke(row.original)
            }}
          >
            Revoke
          </Button>
        ) : null,
    },
  ]
}

function exportMembersCsv(members: WorkspaceMemberRow[], workspaceName: string) {
  const header = ["Name", "Username", "Email", "Status", "Teams", "Joined", "Last seen"]
  const rows = members.map((member) => [
    member.fullName,
    member.username ?? "",
    member.email,
    workspaceRoleLabel(member.role),
    String(member.teamCount),
    formatJoinedMonth(member.joinedAt),
    formatLastSeen(member.lastSeenAt),
  ])
  const csv = [header, ...rows]
    .map((cols) =>
      cols
        .map((value) => {
          const escaped = String(value).replace(/"/g, '""')
          return `"${escaped}"`
        })
        .join(",")
    )
    .join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${workspaceName.toLowerCase().replace(/\s+/g, "-")}-members.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function MembersSettingsList({
  initial,
}: {
  initial: WorkspaceMembersPageData
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [emailsRaw, setEmailsRaw] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<"member" | "admin">(
    "member"
  )
  const [inviting, setInviting] = React.useState(false)
  const [revokingId, setRevokingId] = React.useState<string | null>(null)

  const memberColumns = React.useMemo(() => createMemberColumns(), [])
  const inviteColumns = React.useMemo(
    () =>
      createInviteColumns({
        canManage: initial.canManage,
        pendingId: revokingId,
        onRevoke: (invite) => {
          void (async () => {
            setRevokingId(invite.id)
            const result = await revokeWorkspaceInvite({
              workspaceId: initial.workspaceId,
              workspaceSlug: initial.workspaceSlug,
              inviteId: invite.id,
            })
            setRevokingId(null)
            if (result.error) {
              toast.error(result.error, { id: TOAST_ID })
              return
            }
            toast.success("Invite revoked", { id: TOAST_ID })
            router.refresh()
          })()
        },
      }),
    [initial.canManage, initial.workspaceId, initial.workspaceSlug, revokingId, router]
  )

  const needle = query.trim().toLowerCase()

  const filteredMembers = React.useMemo(() => {
    if (filter === "pending") return []
    return initial.members.filter((member) => {
      if (!needle) return true
      return (
        member.fullName.toLowerCase().includes(needle) ||
        (member.username?.toLowerCase().includes(needle) ?? false) ||
        member.email.toLowerCase().includes(needle)
      )
    })
  }, [initial.members, filter, needle])

  const filteredInvites = React.useMemo(() => {
    if (filter === "active") return []
    return initial.pendingInvites.filter((invite) => {
      if (!needle) return true
      return invite.email.toLowerCase().includes(needle)
    })
  }, [initial.pendingInvites, filter, needle])

  async function onInvite() {
    setInviting(true)
    const result = await createWorkspaceInvites({
      workspaceId: initial.workspaceId,
      workspaceSlug: initial.workspaceSlug,
      emailsRaw,
      role: inviteRole,
    })
    setInviting(false)
    if (result.error) {
      toast.error(result.error, { id: TOAST_ID })
      return
    }
    toast.success(
      result.invitedCount === 1
        ? "Invite saved"
        : `${result.invitedCount} invites saved`,
      { id: TOAST_ID }
    )
    setEmailsRaw("")
    setInviteRole("member")
    setInviteOpen(false)
    router.refresh()
  }

  return (
    <div className="flex w-full min-w-0 flex-col px-8 pt-12 pb-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Members</h1>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => exportMembersCsv(initial.members, initial.workspaceName)}
          >
            Export CSV
          </Button>
          {initial.canManage ? (
            <Button type="button" size="sm" onClick={() => setInviteOpen(true)}>
              Invite
            </Button>
          ) : null}
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            className="h-8 pl-8"
            aria-label="Search members"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              {FILTER_LABELS[filter]}
              <CaretDownIcon className="size-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            <DropdownMenuRadioGroup
              value={filter}
              onValueChange={(value) => setFilter(value as Filter)}
            >
              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pending">
                Pending invites
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filter !== "pending" ? (
        <div className="mb-8">
          <DataTable
            columns={memberColumns}
            data={filteredMembers}
            groupLabel={`Active ${filteredMembers.length}`}
            emptyMessage={
              needle
                ? "No members match that search."
                : "No members in this workspace yet."
            }
            initialSorting={[{ id: "fullName", desc: false }]}
          />
        </div>
      ) : null}

      {filter !== "active" ? (
        <DataTable
          columns={inviteColumns}
          data={filteredInvites}
          groupLabel={`Pending invites ${filteredInvites.length}`}
          emptyMessage={
            needle
              ? "No pending invites match that search."
              : "No pending invites."
          }
          initialSorting={[{ id: "email", desc: false }]}
        />
      ) : null}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite members</DialogTitle>
            <DialogDescription>
              Invites are saved now. Email delivery comes later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={emailsRaw}
              onChange={(event) => setEmailsRaw(event.target.value)}
              rows={4}
              placeholder="ada@acme.com, alan@acme.com"
              aria-label="Invite emails"
            />
            <Select
              value={inviteRole}
              onValueChange={(value) =>
                setInviteRole(value as "member" | "admin")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInviteOpen(false)}
              disabled={inviting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onInvite()}
              disabled={inviting || !emailsRaw.trim()}
            >
              {inviting ? "Inviting…" : "Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
