/**
 * Mock SSO Provider for Development
 * Allows testing SSO flows without external dependencies
 */

import { SSOProvider, SSOUser, SSOConfig } from '../types';

export class MockSSOProvider implements SSOProvider {
  constructor(private config: SSOConfig) {}

  getAuthUrl(state: string): string {
    // In dev mode, return a mock callback URL that will simulate SSO success
    const base = process.env.API_BASE_URL || 'http://localhost:8080';
    return `${base}/api/auth/sso/mock/callback?state=${state}&mock=true`;
  }

  async handleCallback(code: string): Promise<SSOUser> {
    // Mock: extract email from "code" parameter
    // In real dev usage, code might be like "admin@cerply-dev.local"
    const email = code || 'dev@cerply-dev.local';
    const domain = email.split('@')[1] || 'cerply-dev.local';

    return {
      email,
      name: email.split('@')[0],
      providerId: `mock_${email}`,
      domain,
    };
  }

  validateConfig(): boolean {
    return this.config.provider === 'mock' && this.config.enabled;
  }
}

