import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      suspended?: boolean;
      impersonatorId?: string;
      impersonatingEmail?: string;
    } & DefaultSession["user"];
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
