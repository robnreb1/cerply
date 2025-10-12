import { relations } from "drizzle-orm/relations";
import { users, ssoSessions, organizations, userRoles, teams, teamMembers, tracks, teamTrackSubscriptions, plans, modules, items, attempts, reviewSchedule } from "./schema";

export const ssoSessionsRelations = relations(ssoSessions, ({one}) => ({
	user: one(users, {
		fields: [ssoSessions.userId],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [ssoSessions.organizationId],
		references: [organizations.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	ssoSessions: many(ssoSessions),
	userRoles_userId: many(userRoles, {
		relationName: "userRoles_userId_users_id"
	}),
	userRoles_grantedBy: many(userRoles, {
		relationName: "userRoles_grantedBy_users_id"
	}),
	teams: many(teams),
	teamMembers: many(teamMembers),
	organization: one(organizations, {
		fields: [users.organizationId],
		references: [organizations.id]
	}),
	plans: many(plans),
	attempts: many(attempts),
	reviewSchedules: many(reviewSchedule),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	ssoSessions: many(ssoSessions),
	userRoles: many(userRoles),
	teams: many(teams),
	tracks: many(tracks),
	users: many(users),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	user_userId: one(users, {
		fields: [userRoles.userId],
		references: [users.id],
		relationName: "userRoles_userId_users_id"
	}),
	organization: one(organizations, {
		fields: [userRoles.organizationId],
		references: [organizations.id]
	}),
	user_grantedBy: one(users, {
		fields: [userRoles.grantedBy],
		references: [users.id],
		relationName: "userRoles_grantedBy_users_id"
	}),
}));

export const teamsRelations = relations(teams, ({one, many}) => ({
	organization: one(organizations, {
		fields: [teams.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [teams.managerId],
		references: [users.id]
	}),
	teamMembers: many(teamMembers),
	teamTrackSubscriptions: many(teamTrackSubscriptions),
}));

export const teamMembersRelations = relations(teamMembers, ({one}) => ({
	team: one(teams, {
		fields: [teamMembers.teamId],
		references: [teams.id]
	}),
	user: one(users, {
		fields: [teamMembers.userId],
		references: [users.id]
	}),
}));

export const tracksRelations = relations(tracks, ({one, many}) => ({
	organization: one(organizations, {
		fields: [tracks.organizationId],
		references: [organizations.id]
	}),
	teamTrackSubscriptions: many(teamTrackSubscriptions),
}));

export const teamTrackSubscriptionsRelations = relations(teamTrackSubscriptions, ({one}) => ({
	team: one(teams, {
		fields: [teamTrackSubscriptions.teamId],
		references: [teams.id]
	}),
	track: one(tracks, {
		fields: [teamTrackSubscriptions.trackId],
		references: [tracks.id]
	}),
}));

export const plansRelations = relations(plans, ({one, many}) => ({
	user: one(users, {
		fields: [plans.userId],
		references: [users.id]
	}),
	modules: many(modules),
}));

export const modulesRelations = relations(modules, ({one, many}) => ({
	plan: one(plans, {
		fields: [modules.planId],
		references: [plans.id]
	}),
	items: many(items),
}));

export const itemsRelations = relations(items, ({one, many}) => ({
	module: one(modules, {
		fields: [items.moduleId],
		references: [modules.id]
	}),
	attempts: many(attempts),
	reviewSchedules: many(reviewSchedule),
}));

export const attemptsRelations = relations(attempts, ({one}) => ({
	user: one(users, {
		fields: [attempts.userId],
		references: [users.id]
	}),
	item: one(items, {
		fields: [attempts.itemId],
		references: [items.id]
	}),
}));

export const reviewScheduleRelations = relations(reviewSchedule, ({one}) => ({
	user: one(users, {
		fields: [reviewSchedule.userId],
		references: [users.id]
	}),
	item: one(items, {
		fields: [reviewSchedule.itemId],
		references: [items.id]
	}),
}));