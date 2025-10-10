import { pgTable, text, jsonb, timestamp, unique, index, uuid, integer, foreignKey, check, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const ingestJobs = pgTable("ingest_jobs", {
	id: text().primaryKey().notNull(),
	userId: text("user_id"),
	payload: jsonb().notNull(),
	status: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	userId: text("user_id"),
	token: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("sessions_token_unique").on(table.token),
]);

export const events = pgTable("events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id"),
	type: text().notNull(),
	payload: jsonb().default({}).notNull(),
	ts: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_events_ts").using("btree", table.ts.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_events_type_ts").using("btree", table.type.asc().nullsLast().op("text_ops"), table.ts.desc().nullsFirst().op("text_ops")),
]);

export const genLedger = pgTable("gen_ledger", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	itemId: text("item_id"),
	modelUsed: text("model_used").notNull(),
	costCents: integer("cost_cents").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	ts: timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_gen_ledger_model").using("btree", table.modelUsed.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
	index("idx_gen_ledger_ts").using("btree", table.ts.desc().nullsFirst().op("timestamptz_ops")),
]);

export const organizations = pgTable("organizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	domain: text(),
	ssoConfig: jsonb("sso_config"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("organizations_domain_key").on(table.domain),
]);

export const ssoSessions = pgTable("sso_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	provider: text().notNull(),
	providerId: text("provider_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_sso_sessions_expires").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_sso_sessions_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sso_sessions_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "sso_sessions_organization_id_fkey"
		}).onDelete("cascade"),
]);

export const userRoles = pgTable("user_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	role: text().notNull(),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	grantedBy: uuid("granted_by"),
}, (table) => [
	index("idx_user_roles_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_roles_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "user_roles_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.grantedBy],
			foreignColumns: [users.id],
			name: "user_roles_granted_by_fkey"
		}),
	unique("user_roles_user_id_organization_id_role_key").on(table.userId, table.organizationId, table.role),
	check("user_roles_role_check", sql`role = ANY (ARRAY['admin'::text, 'manager'::text, 'learner'::text])`),
]);

export const teams = pgTable("teams", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	name: text().notNull(),
	managerId: uuid("manager_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_teams_manager").using("btree", table.managerId.asc().nullsLast().op("uuid_ops")),
	index("idx_teams_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "teams_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.managerId],
			foreignColumns: [users.id],
			name: "teams_manager_id_fkey"
		}),
]);

export const teamMembers = pgTable("team_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	teamId: uuid("team_id").notNull(),
	userId: uuid("user_id").notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_team_members_team").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("idx_team_members_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "team_members_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "team_members_user_id_fkey"
		}).onDelete("cascade"),
	unique("team_members_team_id_user_id_key").on(table.teamId, table.userId),
]);

export const tracks = pgTable("tracks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	title: text().notNull(),
	planRef: text("plan_ref").notNull(),
	certifiedArtifactId: uuid("certified_artifact_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_tracks_org").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_tracks_plan_ref").using("btree", table.planRef.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "tracks_organization_id_fkey"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: 'string' }),
	organizationId: uuid("organization_id"),
}, (table) => [
	index("idx_users_organization").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "users_organization_id_fkey"
		}),
	unique("users_email_key").on(table.email),
]);

export const teamTrackSubscriptions = pgTable("team_track_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	teamId: uuid("team_id").notNull(),
	trackId: uuid("track_id").notNull(),
	cadence: text().notNull(),
	startAt: timestamp("start_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_team_track_sub_active").using("btree", table.active.asc().nullsLast().op("bool_ops")).where(sql`(active = true)`),
	index("idx_team_track_sub_team").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	index("idx_team_track_sub_track").using("btree", table.trackId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "team_track_subscriptions_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [tracks.id],
			name: "team_track_subscriptions_track_id_fkey"
		}).onDelete("cascade"),
	unique("team_track_subscriptions_team_id_track_id_key").on(table.teamId, table.trackId),
	check("team_track_subscriptions_cadence_check", sql`cadence = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])`),
]);

export const plans = pgTable("plans", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	brief: text().notNull(),
	status: text().default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "plans_user_id_fkey"
		}),
]);

export const modules = pgTable("modules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	planId: uuid("plan_id").notNull(),
	title: text().notNull(),
	order: integer().notNull(),
}, (table) => [
	index("idx_modules_plan").using("btree", table.planId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [plans.id],
			name: "modules_plan_id_fkey"
		}),
]);

export const items = pgTable("items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	moduleId: uuid("module_id").notNull(),
	type: text().notNull(),
	stem: text(),
	options: jsonb(),
	answer: integer(),
	explainer: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_items_module").using("btree", table.moduleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.id],
			name: "items_module_id_fkey"
		}),
]);

export const attempts = pgTable("attempts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	itemId: uuid("item_id").notNull(),
	answerIndex: integer("answer_index"),
	correct: integer().notNull(),
	timeMs: integer("time_ms"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_attempts_item").using("btree", table.itemId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "attempts_user_id_fkey"
		}),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "attempts_item_id_fkey"
		}),
]);

export const reviewSchedule = pgTable("review_schedule", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	itemId: uuid("item_id").notNull(),
	nextAt: timestamp("next_at", { withTimezone: true, mode: 'string' }).notNull(),
	strengthScore: integer("strength_score").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_review_schedule_next").using("btree", table.nextAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_review_schedule_user").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.nextAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_reviews_next").using("btree", table.nextAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "review_schedule_user_id_fkey"
		}),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "review_schedule_item_id_fkey"
		}),
]);
