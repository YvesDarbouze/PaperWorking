declare module 'jsonwebtoken' {
  export interface JwtPayload {
    [key: string]: unknown;
  }
  export function sign(payload: string | Buffer | object, secretOrPrivateKey: string | Buffer, options?: Record<string, unknown>): string;
  export function verify(token: string, secretOrPublicKey: string | Buffer, options?: Record<string, unknown>): JwtPayload | string;
  export function decode(token: string, options?: Record<string, unknown>): JwtPayload | string | null;
}
