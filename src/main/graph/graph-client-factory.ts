import { Client } from '@microsoft/microsoft-graph-client';

/**
 * Create a Microsoft Graph client using a provided access token getter.
 * The getter is called for each request, enabling silent token refresh.
 */
export function createGraphClient(getAccessToken: () => Promise<string>): Client {
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken,
    },
  });
}
