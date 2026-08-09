declare global {
  export interface User {
    sub: string;
    email_verified: boolean;
    name: string;
    preferred_username: string;
    given_name: string;
    family_name: string;
    email: string;
  }

  namespace Express {
    interface Request {
      user?: User;
      hash: string;
      token?: string;
    }
  }
}

export {};