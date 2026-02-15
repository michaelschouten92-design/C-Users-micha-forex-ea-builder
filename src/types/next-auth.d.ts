import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      impersonatorId?: string;
      impersonatingEmail?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    impersonatorId?: string;
    impersonatingEmail?: string;
  }
}
