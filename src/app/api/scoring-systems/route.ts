import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
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

    const body = await req.json();

    // If this new system should be active, deactivate all existing systems first
    if (body.isActive !== false) {
      await prisma.scoringSystem.updateMany({
        where: { userId: dbUser.id },
        data: { isActive: false },
      });
    }

    const scoringSystem = await prisma.scoringSystem.create({
      data: {
        userId: dbUser.id,
        name: body.name,
        isActive: body.isActive !== false, // Default to true unless explicitly false
      },
    });

    return NextResponse.json(scoringSystem, { status: 201 });
  } catch (error) {
    console.error("[SCORING_SYSTEM_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
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

    const scoringSystems = await prisma.scoringSystem.findMany({
      where: { userId: dbUser.id },
      include: {
        habits: {
          include: {
            habit: true,
          },
          orderBy: {
            weight: "desc",
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Debug: Log the first scoring system to see what fields are included
    if (scoringSystems.length > 0 && scoringSystems[0].habits.length > 0) {
      console.log(
        "First scored habit:",
        JSON.stringify(scoringSystems[0].habits[0], null, 2)
      );
    }

    return NextResponse.json(scoringSystems, { status: 200 });
  } catch (error) {
    console.error("[SCORING_SYSTEM_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
