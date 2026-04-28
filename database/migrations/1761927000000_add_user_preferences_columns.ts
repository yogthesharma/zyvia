import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.string('default_home_view', 32).notNullable().defaultTo('active-issues')
      table.string('display_name_style', 32).notNullable().defaultTo('username')
      table.string('first_day_of_week', 16).notNullable().defaultTo('monday')
      table.boolean('convert_emoticons_to_emoji').notNullable().defaultTo(true)
      table.string('send_comment_key', 32).notNullable().defaultTo('cmd-enter')
      table.string('font_size', 16).notNullable().defaultTo('default')
      table.boolean('use_pointer_cursors').notNullable().defaultTo(false)
      table.boolean('open_in_desktop_app').notNullable().defaultTo(false)
      table.boolean('auto_assign_to_self').notNullable().defaultTo(false)
      table.string('git_attachment_format', 32).notNullable().defaultTo('title')
      table.boolean('move_on_git_branch_copy').notNullable().defaultTo(false)
      table.boolean('move_on_coding_tool_open').notNullable().defaultTo(false)
      table.boolean('assign_on_started_status').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('default_home_view')
      table.dropColumn('display_name_style')
      table.dropColumn('first_day_of_week')
      table.dropColumn('convert_emoticons_to_emoji')
      table.dropColumn('send_comment_key')
      table.dropColumn('font_size')
      table.dropColumn('use_pointer_cursors')
      table.dropColumn('open_in_desktop_app')
      table.dropColumn('auto_assign_to_self')
      table.dropColumn('git_attachment_format')
      table.dropColumn('move_on_git_branch_copy')
      table.dropColumn('move_on_coding_tool_open')
      table.dropColumn('assign_on_started_status')
    })
  }
}
