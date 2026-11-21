/**
 * SasyaVahini — Google OAuth Authentication Service
 *
 * Verifies Google ID tokens using google-auth-library and manages account linking.
 */

const { OAuth2Client } = require('google-auth-library');
const logger = require('../utils/logger');

class GoogleAuthService {
  constructor() {
    this.client = null;
    this.currentClientId = null;
  }

  getClient() {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) return null;

    if (!this.client || this.currentClientId !== googleClientId) {
      this.client = new OAuth2Client(googleClientId);
      this.currentClientId = googleClientId;
    }
    return { client: this.client, clientId: googleClientId };
  }

  /**
   * Verify an ID token sent from the Google Identity Services frontend
   */
  async verifyIdToken(idToken) {
    if (!idToken) {
      throw new Error('Google ID token is required');
    }

    const clientObj = this.getClient();
    if (!clientObj) {
      const err = new Error('Google OAuth is not configured on this server. Please set GOOGLE_CLIENT_ID in .env.');
      err.statusCode = 503;
      throw err;
    }

    try {
      const ticket = await clientObj.client.verifyIdToken({
        idToken,
        audience: clientObj.clientId
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid Google token payload');
      }

      // Security Check: Issuer must be Google
      const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
      if (!validIssuers.includes(payload.iss)) {
        throw new Error(`Untrusted token issuer: ${payload.iss}`);
      }

      // Security Check: Token must not be expired
      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < nowSec) {
        throw new Error('Google ID token has expired');
      }

      return {
        googleId: payload.sub,
        email: payload.email?.toLowerCase(),
        name: payload.name,
        picture: payload.picture,
        emailVerified: Boolean(payload.email_verified)
      };
    } catch (err) {
      logger.warn('Google token verification failed:', err.message);
      const verificationErr = new Error('Google authentication failed: ' + (err.message || 'Invalid token'));
      verificationErr.statusCode = 401;
      throw verificationErr;
    }
  }
}

module.exports = new GoogleAuthService();
