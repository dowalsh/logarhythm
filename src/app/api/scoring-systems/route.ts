import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const scoringSystem = await prisma.scoringSystem.create({
      data: {
        userId,
        name: body.name,
        isActive: body.isActive ?? true,
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scoringSystems = await prisma.scoringSystem.findMany({
      where: { userId },
      include: {
        habits: {
          include: {
            habit: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(scoringSystems, { status: 200 });
  } catch (error) {
    console.error("[SCORING_SYSTEM_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
