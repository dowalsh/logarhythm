import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// PATCH - Update scoring system
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user from Clerk to find their email
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();

    if (!user || !user.emailAddresses[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Find the user in our database by email
    const dbUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();

    // Verify the scoring system belongs to the user
    const scoringSystem = await prisma.scoringSystem.findFirst({
      where: { id, userId: dbUser.id },
    });

    if (!scoringSystem) {
      return NextResponse.json(
        { error: "Scoring system not found" },
        { status: 404 }
      );
    }

    // If setting this system as active, deactivate all others first
    if (body.isActive === true) {
      await prisma.scoringSystem.updateMany({
        where: { userId: dbUser.id },
        data: { isActive: false },
      });
    }

    const updatedSystem = await prisma.scoringSystem.update({
      where: { id },
      data: {
        name: body.name,
        isActive: body.isActive,
      },
    });

    return NextResponse.json(updatedSystem, { status: 200 });
  } catch (error) {
    console.error("[SCORING_SYSTEM_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete scoring system
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user from Clerk to find their email
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();

    if (!user || !user.emailAddresses[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Find the user in our database by email
    const dbUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const { id } = await context.params;

    // Verify the scoring system belongs to the user
    const scoringSystem = await prisma.scoringSystem.findFirst({
      where: { id, userId: dbUser.id },
    });

    if (!scoringSystem) {
      return NextResponse.json(
        { error: "Scoring system not found" },
        { status: 404 }
      );
    }

    // Check if this is the active system
    if (scoringSystem.isActive) {
      return NextResponse.json(
        { error: "Cannot delete the active scoring system" },
        { status: 400 }
      );
    }

    // Delete the scoring system (this will cascade delete ScoredHabits)
    await prisma.scoringSystem.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Scoring system deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[SCORING_SYSTEM_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
