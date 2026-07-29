"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CaretDownIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { TeamIcon } from "@/components/app/team-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  addTeamMembers,
  removeTeamMember,
  updateTeamMemberRole,
} from "@/lib/members/actions"
import {
  initialsFromName,
  teamRoleDisplayLabel,
} from "@/lib/members/schema"
import type {
  TeamMemberRow,
  TeamMembersPageData,
  WorkspaceMemberCandidate,
} from "@/lib/members/types"
import { cn } from "@/lib/utils"

const TOAST_ID = "team-members"

type RoleFilter = "all" | "owner" | "admin" | "member"

const ROLE_FILTER_LABELS: Record<RoleFilter, string> = {
  all: "All",
  owner: "Owner",
  admin: "Admin",
  member: "Member",
}

function MemberNameCell({ member }: { member: TeamMemberRow }) {
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
      <span className="truncate font-medium text-foreground">
        {member.fullName}
      </span>
    </div>
  )
}

function createColumns(options: {
  canManage: boolean
  viewerUserId: string | null
  busyUserId: string | null
  onChangeRole: (member: TeamMemberRow, role: "owner" | "admin" | "member") => void
  onRemove: (member: TeamMemberRow) => void
}): ColumnDef<TeamMemberRow>[] {
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
      id: "role",
      accessorFn: (row) =>
        teamRoleDisplayLabel({
          teamRole: row.teamRole,
          workspaceRole: row.workspaceRole,
        }),
      header: "Role",
      enableSorting: false,
      size: 180,
      meta: { className: "w-[11rem]" },
      cell: ({ row }) => {
        const member = row.original
        const label = teamRoleDisplayLabel({
          teamRole: member.teamRole,
          workspaceRole: member.workspaceRole,
        })
        const elevated =
          member.workspaceRole === "owner" || member.workspaceRole === "admin"

        if (!options.canManage || elevated) {
          return <Badge variant="outline">{label}</Badge>
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2"
                disabled={options.busyUserId === member.userId}
              >
                <Badge variant="outline">{label}</Badge>
                <CaretDownIcon className="size-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => options.onChangeRole(member, "member")}
              >
                Member
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => options.onChangeRole(member, "admin")}
              >
                Admin
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => options.onChangeRole(member, "owner")}
              >
                Owner
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => options.onRemove(member)}
              >
                {member.userId === options.viewerUserId
                  ? "Leave team"
                  : "Remove from team"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

export function TeamMembersSettings({
  initial,
  viewerUserId,
}: {
  initial: TeamMembersPageData
  viewerUserId: string
}) {
  const router = useRouter()
  const hubHref = `/w/${initial.workspaceSlug}/settings/teams/${initial.teamKey.toLowerCase()}`
  const [query, setQuery] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("all")
  const [addOpen, setAddOpen] = React.useState(false)
  const [candidateQuery, setCandidateQuery] = React.useState("")
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())
  const [adding, setAdding] = React.useState(false)
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null)

  const columns = React.useMemo(
    () =>
      createColumns({
        canManage: initial.canManage,
        viewerUserId,
        busyUserId,
        onChangeRole: (member, role) => {
          void (async () => {
            setBusyUserId(member.userId)
            const result = await updateTeamMemberRole({
              workspaceId: initial.workspaceId,
              workspaceSlug: initial.workspaceSlug,
              teamId: initial.teamId,
              userId: member.userId,
              role,
            })
            setBusyUserId(null)
            if (result.error) {
              toast.error(result.error, { id: TOAST_ID })
              return
            }
            toast.success("Role updated", { id: TOAST_ID })
            router.refresh()
          })()
        },
        onRemove: (member) => {
          void (async () => {
            setBusyUserId(member.userId)
            const result = await removeTeamMember({
              workspaceId: initial.workspaceId,
              workspaceSlug: initial.workspaceSlug,
              teamId: initial.teamId,
              userId: member.userId,
            })
            setBusyUserId(null)
            if (result.error) {
              toast.error(result.error, { id: TOAST_ID })
              return
            }
            toast.success(
              member.userId === viewerUserId ? "Left team" : "Member removed",
              { id: TOAST_ID }
            )
            router.refresh()
          })()
        },
      }),
    [
      busyUserId,
      initial.canManage,
      initial.teamId,
      initial.workspaceId,
      initial.workspaceSlug,
      router,
      viewerUserId,
    ]
  )

  const needle = query.trim().toLowerCase()
  const filtered = React.useMemo(() => {
    return initial.members.filter((member) => {
      if (roleFilter !== "all" && member.teamRole !== roleFilter) return false
      if (!needle) return true
      return (
        member.fullName.toLowerCase().includes(needle) ||
        member.email.toLowerCase().includes(needle) ||
        (member.username?.toLowerCase().includes(needle) ?? false)
      )
    })
  }, [initial.members, needle, roleFilter])

  const filteredCandidates = React.useMemo(() => {
    const q = candidateQuery.trim().toLowerCase()
    return initial.candidates.filter((candidate) => {
      if (!q) return true
      return (
        candidate.fullName.toLowerCase().includes(q) ||
        candidate.email.toLowerCase().includes(q) ||
        (candidate.username?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [candidateQuery, initial.candidates])

  function toggleCandidate(candidate: WorkspaceMemberCandidate, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(candidate.userId)
      else next.delete(candidate.userId)
      return next
    })
  }

  async function onAddMembers() {
    setAdding(true)
    const result = await addTeamMembers({
      workspaceId: initial.workspaceId,
      workspaceSlug: initial.workspaceSlug,
      teamId: initial.teamId,
      userIds: [...selected],
      role: "member",
    })
    setAdding(false)
    if (result.error) {
      toast.error(result.error, { id: TOAST_ID })
      return
    }
    toast.success(
      result.addedCount === 1
        ? "Member added"
        : `${result.addedCount} members added`,
      { id: TOAST_ID }
    )
    setSelected(new Set())
    setCandidateQuery("")
    setAddOpen(false)
    router.refresh()
  }

  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none sticky top-0 z-20 h-0">
        <Link
          href={hubHref}
          className="pointer-events-auto absolute top-4 left-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <TeamIcon icon={initial.teamIcon} className="size-4" />
          <span className="max-w-[14rem] truncate">{initial.teamName}</span>
        </Link>
      </div>

      <div className="flex w-full min-w-0 flex-col px-8 pt-12 pb-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Team members</h1>
          {initial.canManage ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setAddOpen(true)}
              disabled={!initial.candidates.length}
            >
              Add a member
            </Button>
          ) : null}
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email"
              className="h-8 pl-8"
              aria-label="Search team members"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                {ROLE_FILTER_LABELS[roleFilter]}
                <CaretDownIcon className="size-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-40">
              <DropdownMenuRadioGroup
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as RoleFilter)}
              >
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="owner">Owner</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="member">
                  Member
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage={
            needle || roleFilter !== "all"
              ? "No members match that filter."
              : "No members on this team yet."
          }
          initialSorting={[{ id: "fullName", desc: false }]}
        />
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) {
            setSelected(new Set())
            setCandidateQuery("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a member</DialogTitle>
            <DialogDescription>
              Choose people already in this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={candidateQuery}
                onChange={(event) => setCandidateQuery(event.target.value)}
                placeholder="Search by name or email"
                className="h-8 pl-8"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md bg-muted/40 p-1">
              {filteredCandidates.length ? (
                filteredCandidates.map((candidate) => {
                  const checked = selected.has(candidate.userId)
                  return (
                    <label
                      key={candidate.userId}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 hover:bg-muted/70",
                        checked && "bg-muted/70"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleCandidate(candidate, value === true)
                        }
                      />
                      <Avatar className="size-6">
                        {candidate.avatarUrl ? (
                          <AvatarImage src={candidate.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="text-[10px]">
                          {initialsFromName(candidate.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {candidate.fullName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {candidate.email || "No email"}
                        </p>
                      </div>
                    </label>
                  )
                })
              ) : (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {initial.candidates.length
                    ? "No people match that search."
                    : "Everyone in the workspace is already on this team."}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddOpen(false)}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onAddMembers()}
              disabled={adding || selected.size === 0}
            >
              {adding
                ? "Adding…"
                : selected.size
                  ? `Add ${selected.size}`
                  : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
