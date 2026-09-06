import { eq } from "drizzle-orm";
import { user } from "@/db/schema";
import type { SelectUser } from "@/db/validation";
import { db } from "@/lib/db";

/**
 * Domain Service: User Management
 * Follows DDD and Bounded Context principles (AGENTS.md Rule 3.A)
 * Canonical Naming & Ubiquitous Language (AGENTS.md Rule 3.B)
 */

export interface UpdateUserProfileInput {
  name?: string;
  image?: string;
}

export async function findUserById(userId: string): Promise<SelectUser | null> {
  const result = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });
  return result ?? null;
}

export async function findUserByEmail(
  email: string,
): Promise<SelectUser | null> {
  const result = await db.query.user.findFirst({
    where: eq(user.email, email),
  });
  return result ?? null;
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput,
): Promise<SelectUser> {
  const [updatedUser] = await db
    .update(user)
    .set({
      name: input.name,
      image: input.image,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning();

  if (!updatedUser) {
    throw new Error(`User with ID ${userId} not found`);
  }

  return updatedUser;
}
