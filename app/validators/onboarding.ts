import vine from '@vinejs/vine'

export const onboardingValidator = vine.create({
  workspaceName: vine.string().trim().minLength(2).maxLength(160),
  workspaceSlug: vine
    .string()
    .trim()
    .minLength(2)
    .maxLength(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .unique({ table: 'workspaces', column: 'slug' }),
  preferredTheme: vine.enum(['light', 'dark', 'system'] as const),
})
