"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function syncUser() {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("No user found");
    }

    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0]?.emailAddress || "" },
    });

    if (existingUser) {
      return existingUser;
    }

    // Create new user in our database
    const newUser = await prisma.user.create({
      data: {
        email: user.emailAddresses[0]?.emailAddress || "",
      },
    });

    return newUser;
  } catch (error) {
    console.error("Error syncing user:", error);
    throw error;
  }
}
