/* eslint-disable @typescript-eslint/no-unused-vars */
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      suspended?: boolean;
      emailVerified?: Date | null;
      impersonatorId?: string;
      impersonatingEmail?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    suspended?: boolean;
    emailVerified?: boolean;
    impersonatorId?: string;
    impersonatingEmail?: string;
  }
}
