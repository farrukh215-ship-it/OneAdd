declare namespace Express {
  export interface Request {
    user?: {
      sub: string;
      phone?: string;
      email?: string;
      type?: string;
      [key: string]: unknown;
    };
  }
}
