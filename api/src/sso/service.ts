/**
 * SSO Service
 * Manages SSO providers and authentication flows
 */

import { SSOProvider, SSOConfig, SSOUser, SSOSession } from './types';
import { MockSSOProvider } from './providers/mock';
import { GoogleSSOProvider } from './providers/google';
import { db } from '../db';
import { organizations, users, userRoles, ssoSessions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export class SSOService {
  private providers = new Map<string, SSOProvider>();
  private pendingStates = new Map<string, { organizationId: string; createdAt: number }>();

  constructor() {
    // Clean up old pending states every 10 minutes
    setInterval(() => this.cleanupPendingStates(), 10 * 60 * 1000);
  }

  /**
   * Register an SSO provider for an organization
   */
  registerProvider(organizationId: string, config: SSOConfig) {
    const provider = this.createProvider(config);
    if (!provider.validateConfig()) {
      throw new Error(`Invalid SSO config for provider: ${config.provider}`);
    }
    this.providers.set(organizationId, provider);
  }

  /**
   * Get SSO provider for an organization
   */
  getProvider(organizationId: string): SSOProvider | null {
    return this.providers.get(organizationId) || null;
  }

  /**
   * Initiate SSO login flow
   * Returns the authorization URL to redirect the user to
   */
  async initiateLogin(organizationId: string): Promise<string> {
    const provider = this.getProvider(organizationId);
    if (!provider) {
      throw new Error(`No SSO provider configured for organization: ${organizationId}`);
    }

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    this.pendingStates.set(state, { organizationId, createdAt: Date.now() });

    return provider.getAuthUrl(state);
  }

  /**
   * Handle SSO callback
   * Validates state, exchanges code for user info, creates/updates user, creates session
   */
  async handleCallback(state: string, code: string): Promise<SSOSession> {
    // Validate state
    const pending = this.pendingStates.get(state);
    if (!pending) {
      throw new Error('Invalid or expired state token');
    }

    // Check state age (15 minutes max)
    const age = Date.now() - pending.createdAt;
    if (age > 15 * 60 * 1000) {
      this.pendingStates.delete(state);
      throw new Error('State token expired');
    }

    const { organizationId } = pending;
    this.pendingStates.delete(state);

    // Get provider
    const provider = this.getProvider(organizationId);
    if (!provider) {
      throw new Error(`No SSO provider for organization: ${organizationId}`);
    }

    // Exchange code for user info
    const ssoUser = await provider.handleCallback(code);

    // Find or create user
    const user = await this.findOrCreateUser(organizationId, ssoUser);

    // Get user role
    const roleResult = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, user.id), eq(userRoles.organizationId, organizationId)))
      .limit(1);

    const role = (roleResult[0]?.role as 'admin' | 'manager' | 'learner') || 'learner';

    // Create SSO session in database
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await db.insert(ssoSessions).values({
      userId: user.id,
      organizationId,
      provider: 'google', // TODO: get from config
      providerId: ssoUser.providerId,
      expiresAt,
    });

    return {
      userId: user.id,
      organizationId,
      email: user.email,
      role,
      provider: 'google',
      expiresAt: expiresAt.getTime(),
    };
  }

  /**
   * Find or create user from SSO login
   */
  private async findOrCreateUser(organizationId: string, ssoUser: SSOUser) {
    // Check if user exists
    let existingUsers = await db.select().from(users).where(eq(users.email, ssoUser.email)).limit(1);

    if (existingUsers.length > 0) {
      const user = existingUsers[0];

      // Update organization if not set
      if (!user.organizationId) {
        await db.update(users).set({ organizationId }).where(eq(users.id, user.id));
        return { ...user, organizationId };
      }

      return user;
    }

    // Create new user
    const newUsers = await db
      .insert(users)
      .values({
        email: ssoUser.email,
        organizationId,
      })
      .returning();

    const newUser = newUsers[0];

    // Assign default learner role
    await db.insert(userRoles).values({
      userId: newUser.id,
      organizationId,
      role: 'learner',
    });

    return newUser;
  }

  /**
   * Load providers from database for all organizations
   */
  async loadProvidersFromDB() {
    const orgs = await db.select().from(organizations);

    for (const org of orgs) {
      if (org.ssoConfig) {
        try {
          this.registerProvider(org.id, org.ssoConfig as SSOConfig);
        } catch (error) {
          console.error(`Failed to load SSO provider for org ${org.id}:`, error);
        }
      }
    }
  }

  /**
   * Create provider instance from config
   */
  private createProvider(config: SSOConfig): SSOProvider {
    switch (config.provider) {
      case 'mock':
        return new MockSSOProvider(config);
      case 'google':
        return new GoogleSSOProvider(config);
      // TODO: Add SAML and OIDC providers
      default:
        throw new Error(`Unsupported SSO provider: ${config.provider}`);
    }
  }

  /**
   * Cleanup expired pending states
   */
  private cleanupPendingStates() {
    const now = Date.now();
    const maxAge = 15 * 60 * 1000; // 15 minutes

    for (const [state, data] of this.pendingStates.entries()) {
      if (now - data.createdAt > maxAge) {
        this.pendingStates.delete(state);
      }
    }
  }
}

// Singleton instance
export const ssoService = new SSOService();

