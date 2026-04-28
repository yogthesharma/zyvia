import { preferencesValidator } from '#validators/preferences'
import type { HttpContext } from '@adonisjs/core/http'

export default class SettingsController {
  async showSection({ inertia, params, auth }: HttpContext) {
    return inertia.render('settings/section', {
      section: params.section,
      preferences: auth.user
        ? {
            defaultHomeView: auth.user.defaultHomeView,
            displayNameStyle: auth.user.displayNameStyle,
            firstDayOfWeek: auth.user.firstDayOfWeek,
            convertEmoticonsToEmoji: auth.user.convertEmoticonsToEmoji,
            sendCommentKey: auth.user.sendCommentKey,
            fontSize: auth.user.fontSize,
            usePointerCursors: auth.user.usePointerCursors,
            openInDesktopApp: auth.user.openInDesktopApp,
            autoAssignToSelf: auth.user.autoAssignToSelf,
            gitAttachmentFormat: auth.user.gitAttachmentFormat,
            moveOnGitBranchCopy: auth.user.moveOnGitBranchCopy,
            moveOnCodingToolOpen: auth.user.moveOnCodingToolOpen,
            assignOnStartedStatus: auth.user.assignOnStartedStatus,
          }
        : null,
    })
  }

  async updatePreferences({ request, auth, response, session, params }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.redirect('/login')
    }

    const payload = await request.validateUsing(preferencesValidator)

    user.merge({
      defaultHomeView: payload.defaultHomeView,
      displayNameStyle: payload.displayNameStyle,
      firstDayOfWeek: payload.firstDayOfWeek,
      convertEmoticonsToEmoji: payload.convertEmoticonsToEmoji,
      sendCommentKey: payload.sendCommentKey,
      fontSize: payload.fontSize,
      usePointerCursors: payload.usePointerCursors,
      openInDesktopApp: payload.openInDesktopApp,
      autoAssignToSelf: payload.autoAssignToSelf,
      gitAttachmentFormat: payload.gitAttachmentFormat,
      moveOnGitBranchCopy: payload.moveOnGitBranchCopy,
      moveOnCodingToolOpen: payload.moveOnCodingToolOpen,
      assignOnStartedStatus: payload.assignOnStartedStatus,
    })

    await user.save()
    session.flash('success', 'Preferences saved')

    return response.redirect(`/${params.workspaceSlug}/settings/preferences`)
  }
}
