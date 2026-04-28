import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Workspace from '#models/workspace'
import { column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  @column()
  declare onboardingCompleted: boolean

  @column()
  declare preferredTheme: string | null

  @column()
  declare defaultHomeView: 'active-issues' | 'inbox' | 'assigned'

  @column()
  declare displayNameStyle: 'username' | 'full-name'

  @column()
  declare firstDayOfWeek: 'monday' | 'sunday'

  @column()
  declare convertEmoticonsToEmoji: boolean

  @column()
  declare sendCommentKey: 'cmd-enter' | 'enter'

  @column()
  declare fontSize: 'small' | 'default' | 'large'

  @column()
  declare usePointerCursors: boolean

  @column()
  declare openInDesktopApp: boolean

  @column()
  declare autoAssignToSelf: boolean

  @column()
  declare gitAttachmentFormat: 'title' | 'link'

  @column()
  declare moveOnGitBranchCopy: boolean

  @column()
  declare moveOnCodingToolOpen: boolean

  @column()
  declare assignOnStartedStatus: boolean

  @manyToMany(() => Workspace, {
    pivotTable: 'workspace_members',
  })
  declare workspaces: ManyToMany<typeof Workspace>

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
