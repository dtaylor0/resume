import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    console.log(req.nextUrl.searchParams);
    return NextResponse.json({ message: "Hello world" });
}
