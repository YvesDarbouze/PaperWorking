export type VerifyIdTokenFn = (idToken: string) => Promise<{ uid: string } | null>;

export type GetStripeCustomerIdFn = (uid: string) => Promise<string | null>;
