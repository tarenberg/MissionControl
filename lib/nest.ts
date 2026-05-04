import fetch from 'node-fetch';

/**
 * Google Nest SDM API Client for Mission Control
 * Handles authentication and data fetching for the Studio Bridge.
 */

const NEST_AUTH_URL = 'https://www.googleapis.com/oauth2/v4/token';
const SDM_API_URL = 'https://smartdevicemanagement.googleapis.com/v1';

export interface NestCredentials {
  clientId: string;
  clientSecret: string;
  projectId: string;
  refreshToken?: string;
}

export class NestClient {
  private credentials: NestCredentials;
  private accessToken?: string;

  constructor(credentials: NestCredentials) {
    this.credentials = credentials;
  }

  /**
   * Refreshes the OAuth 2.0 access token using the refresh token.
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.credentials.refreshToken) {
      throw new Error('No refresh token provided for Nest client.');
    }

    const response = await fetch(NEST_AUTH_URL, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        refresh_token: this.credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Nest access token: ${error}`);
    }

    const data = await response.json() as { access_token: string };
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  /**
   * Fetches all authorized devices for the project.
   */
  async listDevices() {
    const token = this.accessToken || (await this.refreshAccessToken());
    const response = await fetch(`${SDM_API_URL}/enterprises/${this.credentials.projectId}/devices`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list Nest devices: ${error}`);
    }

    return response.json();
  }

  /**
   * Fetches data for a specific device.
   */
  async getDevice(deviceId: string) {
    const token = this.accessToken || (await this.refreshAccessToken());
    const response = await fetch(`${SDM_API_URL}/enterprises/${this.credentials.projectId}/devices/${deviceId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch Nest device ${deviceId}: ${error}`);
    }

    return response.json();
  }

  /**
   * Executes a command on a device (e.g., set temperature, capture snapshot).
   */
  async executeCommand(deviceId: string, command: string, params: object = {}) {
    const token = this.accessToken || (await this.refreshAccessToken());
    const response = await fetch(`${SDM_API_URL}/enterprises/${this.credentials.projectId}/devices/${deviceId}:executeCommand`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command,
        params,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to execute command ${command} on Nest device ${deviceId}: ${error}`);
    }

    return response.json();
  }

  /**
   * Helper to get traits for a specific device.
   */
  async getDeviceTraits(deviceId: string) {
    const data = await this.getDevice(deviceId);
    return data.traits || {};
  }
}

/**
 * Singleton instance of NestClient using environment variables.
 */
export const nest = new NestClient({
  clientId: process.env.NEST_CLIENT_ID || '',
  clientSecret: process.env.NEST_CLIENT_SECRET || '',
  projectId: process.env.NEST_PROJECT_ID || '',
  refreshToken: process.env.NEST_REFRESH_TOKEN || '',
});
