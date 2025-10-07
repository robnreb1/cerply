/**
 * SSO Provider Types
 * Abstraction for enterprise SSO integrations (SAML, OIDC, OAuth2)
 */

export interface SSOConfig {
  provider: 'mock' | 'google' | 'saml' | 'oidc';
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  metadataUrl?: string;
  certificate?: string;
  issuer?: string;
}

export interface SSOUser {
  email: string;
  name?: string;
  providerId: string; // External ID from SSO provider
  domain?: string; // Email domain for organization matching
}

export interface SSOProvider {
  /**
   * Get the authorization URL to redirect the user to
   */
  getAuthUrl(state: string): string;

  /**
   * Exchange authorization code for user info
   */
  handleCallback(code: string): Promise<SSOUser>;

  /**
   * Validate the provider config
   */
  validateConfig(): boolean;
}

export interface SSOSession {
  userId: string;
  organizationId: string;
  email: string;
  role: 'admin' | 'manager' | 'learner';
  provider: string;
  expiresAt: number;
}

