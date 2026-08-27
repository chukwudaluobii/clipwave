import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError } from "./session";

/** Shared error → HTTP response mapping for API route handlers. */
export function errorResponse(e: unknown) {
  if (e instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (e instanceof z.ZodError) {
    return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  console.error(e);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
