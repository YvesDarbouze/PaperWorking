/**
 * Places Autocomplete Session Token Manager
 * 
 * Google Places API billing rule:
 * One session token per user address-entry gesture.
 * Autocomplete calls within the session are billed as a single session
 * when concluded with a Place Details request that includes the same session token.
 * After details fetch or submission, the session token is consumed and reset.
 */

export class PlacesSessionManager {
  private currentToken: string | null = null;

  /**
   * Get or generate the active session token for the current address-entry gesture.
   */
  public getToken(): string {
    if (!this.currentToken) {
      this.currentToken = this.generateToken();
    }
    return this.currentToken;
  }

  /**
   * Check if an active session token is in-flight.
   */
  public hasToken(): boolean {
    return this.currentToken !== null;
  }

  /**
   * Consume and clear the active session token upon Place Details fetch or submission.
   * Returns the consumed token, or null if no token was active.
   */
  public consumeToken(): string | null {
    const token = this.currentToken;
    this.currentToken = null;
    return token;
  }

  /**
   * Explicitly reset the token without returning it (e.g., when clearing input or canceling).
   */
  public resetToken(): void {
    this.currentToken = null;
  }

  private generateToken(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `pw-session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
