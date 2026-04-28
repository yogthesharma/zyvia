import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.boolean('onboarding_completed').notNullable().defaultTo(false)
      table.string('preferred_theme', 16).nullable()
    })

    this.schema.createTable('workspaces', (table) => {
      table.increments('id').notNullable()
      table.string('name', 160).notNullable()
      table.string('slug', 160).notNullable().unique()
      table.integer('owner_user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('workspace_members', (table) => {
      table.increments('id').notNullable()
      table.integer('workspace_id').unsigned().notNullable().references('workspaces.id').onDelete('CASCADE')
      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table.string('role', 24).notNullable().defaultTo('member')
      table.timestamp('created_at').notNullable()

      table.unique(['workspace_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable('workspace_members')
    this.schema.dropTable('workspaces')

    this.schema.alterTable('users', (table) => {
      table.dropColumn('onboarding_completed')
      table.dropColumn('preferred_theme')
    })
  }
}
