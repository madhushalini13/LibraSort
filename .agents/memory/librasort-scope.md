---
name: LibraSort scope constraints
description: Durable user requirements and the platform boundary for LibraSort work.
---

The user requires a real, user-owned library with no seeded fake users, books,
or statistics; no static demo; no fake authentication; and no reuse, import,
connection to, or reference to a previous LibraSort project. The user also
stated “Do NOT use Replit” and “Do NOT use Clerk unless absolutely required by
the platform.” The current workspace is a Replit artifact and its managed
authentication uses Clerk; do not present this implementation as an
off-platform deployment.

**Why:** these were explicit project constraints; the auth/platform choice was
made only because of the environment hosting the selected artifact.

**How to apply:** preserve actual database-backed records and authenticated
ownership, and be explicit about this platform boundary in future changes or
handoffs.