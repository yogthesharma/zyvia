import vine from '@vinejs/vine'

export const preferencesValidator = vine.compile(
  vine.object({
    defaultHomeView: vine.enum(['active-issues', 'inbox', 'assigned']),
    displayNameStyle: vine.enum(['username', 'full-name']),
    firstDayOfWeek: vine.enum(['monday', 'sunday']),
    convertEmoticonsToEmoji: vine.boolean(),
    sendCommentKey: vine.enum(['cmd-enter', 'enter']),
    fontSize: vine.enum(['small', 'default', 'large']),
    usePointerCursors: vine.boolean(),
    openInDesktopApp: vine.boolean(),
    autoAssignToSelf: vine.boolean(),
    gitAttachmentFormat: vine.enum(['title', 'link']),
    moveOnGitBranchCopy: vine.boolean(),
    moveOnCodingToolOpen: vine.boolean(),
    assignOnStartedStatus: vine.boolean(),
  })
)
