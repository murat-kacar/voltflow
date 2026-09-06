import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { account, session, user, verification } from "./schema";

/**
 * Type-safe Zod runtime validators derived directly from Drizzle ORM schemas
 * Satisfies AGENTS.md Rule 3.E (Boundary Input Validation)
 */

// User Validation Schemas
export const selectUserSchema = createSelectSchema(user);
export const insertUserSchema = createInsertSchema(user, {
  email: z.string().email(),
  name: z.string().min(2).max(100),
});

// Session Validation Schemas
export const selectSessionSchema = createSelectSchema(session);
export const insertSessionSchema = createInsertSchema(session);

// Account Validation Schemas
export const selectAccountSchema = createSelectSchema(account);
export const insertAccountSchema = createInsertSchema(account);

// Verification Validation Schemas
export const selectVerificationSchema = createSelectSchema(verification);
export const insertVerificationSchema = createInsertSchema(verification);

// Inferred TypeScript Types
export type SelectUser = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type SelectSession = z.infer<typeof selectSessionSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
