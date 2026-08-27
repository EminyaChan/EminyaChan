import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthRequiredError } from "@/lib/auth/session";

// Central error → response mapping so route handlers never leak raw
// stack traces / provider error internals to the client.
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AuthRequiredError) {
    return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025") {
    return NextResponse.json({ error: "The requested item was not found." }, { status: 404 });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
