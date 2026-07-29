"use client"

import * as React from "react"
import Link from "next/link"
import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"

import { TeamIcon } from "@/components/app/team-icon"
import { Button } from "@/components/ui/button"
import {
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
} from "@/components/ui/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { TeamLifecycleStatus, TeamSummary } from "@/lib/teams/types"

type StatusFilter = TeamLifecycleStatus

const STATUS_LABELS: Record<StatusFilter, string> = {
  active: "Active",
  retired: "Retired",
  deleted: "Recently deleted",
}

function formatCreatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function visibilityLabel(visibility: TeamSummary["visibility"]) {
  return visibility === "workspace" ? "Workspace" : visibility
}

function createColumns(): ColumnDef<TeamSummary>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const team = row.original
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <TeamIcon icon={team.icon} className="size-4" />
            <span className="truncate font-medium text-foreground">
              {team.name}
            </span>
            <span className="shrink-0 text-muted-foreground">{team.key}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "visibility",
      header: "Visibility",
      enableSorting: false,
      size: 120,
      meta: { className: "w-[7.5rem]" },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {visibilityLabel(row.original.visibility)}
        </span>
      ),
    },
    {
      accessorKey: "memberCount",
      header: "Members",
      enableSorting: false,
      size: 88,
      meta: { className: "w-[5.5rem]" },
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.memberCount}</span>
      ),
    },
    {
      accessorKey: "issueCount",
      header: "Issues",
      enableSorting: false,
      size: 88,
      meta: { className: "w-[5.5rem]" },
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.issueCount}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      enableSorting: false,
      size: 88,
      meta: { className: "w-[5.5rem]" },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatCreatedAt(row.original.createdAt)}
        </span>
      ),
    },
  ]
}

export function TeamsSettingsList({
  workspaceSlug,
  teams,
}: {
  workspaceSlug: string
  teams: TeamSummary[]
}) {
  const createHref = `/w/${workspaceSlug}/settings/teams/new`
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("active")
  const columns = React.useMemo(() => createColumns(), [])

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return teams.filter((team) => {
      if (team.status !== status) return false
      if (!needle) return true
      return (
        team.name.toLowerCase().includes(needle) ||
        team.key.toLowerCase().includes(needle)
      )
    })
  }, [teams, query, status])

  const emptyMessage =
    status === "active"
      ? query.trim()
        ? "No teams match that filter."
        : "No teams yet. Create one to start tracking issues."
      : status === "retired"
        ? query.trim()
          ? "No retired teams match that filter."
          : "No retired teams."
        : query.trim()
          ? "No deleted teams match that filter."
          : "No recently deleted teams."

  return (
    <div className="flex w-full min-w-0 flex-col px-8 pt-12 pb-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Teams</h1>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name..."
            className="h-8 pl-8"
            aria-label="Filter teams by name"
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
              {STATUS_LABELS[status]}
              <CaretDownIcon className="size-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            <DropdownMenuRadioGroup
              value={status}
              onValueChange={(value) => setStatus(value as StatusFilter)}
            >
              <DropdownMenuRadioItem value="active">
                Active
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="retired">
                Retired
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="deleted">
                Recently deleted
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto">
          <Button asChild size="sm">
            <Link href={createHref}>Create team</Link>
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage={emptyMessage}
        initialSorting={[{ id: "name", desc: false }]}
        getRowHref={(row) =>
          `/w/${workspaceSlug}/settings/teams/${row.original.key.toLowerCase()}`
        }
      />
    </div>
  )
}
