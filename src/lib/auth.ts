import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../db/schema";
import { db } from "./db";
import { env } from "./env";

import { logger } from "./logger";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      logger.info("Password reset requested", {
        context: { userId: user.id, email: user.email, resetUrl: url },
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      logger.info("Verification email requested", {
        context: { userId: user.id, email: user.email, verifyUrl: url },
      });
    },
  },
});
