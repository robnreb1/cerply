/**
 * Google OAuth2 SSO Provider
 * Enterprise SSO via Google Workspace
 */

import { SSOProvider, SSOUser, SSOConfig } from '../types';

export class GoogleSSOProvider implements SSOProvider {
  private readonly authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';
  private readonly userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';

  constructor(private config: SSOConfig) {
    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      throw new Error('Google SSO requires clientId, clientSecret, and redirectUri');
    }
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId!,
      redirect_uri: this.config.redirectUri!,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<SSOUser> {
    // Exchange code for access token
    const tokenResponse = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId!,
        client_secret: this.config.clientSecret!,
        redirect_uri: this.config.redirectUri!,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info
    const userResponse = await fetch(this.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      const error = await userResponse.text();
      throw new Error(`Failed to fetch user info: ${error}`);
    }

    const userData = await userResponse.json();

    return {
      email: userData.email,
      name: userData.name,
      providerId: userData.id,
      domain: userData.email?.split('@')[1],
    };
  }

  validateConfig(): boolean {
    return (
      this.config.provider === 'google' &&
      this.config.enabled &&
      !!this.config.clientId &&
      !!this.config.clientSecret &&
      !!this.config.redirectUri
    );
  }
}

