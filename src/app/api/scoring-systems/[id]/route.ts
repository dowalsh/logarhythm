import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// PATCH - Update scoring system
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();

    // Verify the scoring system belongs to the user
    const scoringSystem = await prisma.scoringSystem.findFirst({
      where: { id, userId },
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
        where: { userId },
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Verify the scoring system belongs to the user
    const scoringSystem = await prisma.scoringSystem.findFirst({
      where: { id, userId },
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
