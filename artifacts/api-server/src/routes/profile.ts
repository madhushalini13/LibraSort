import { clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetProfileResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { requireAuth, authenticatedUserId } from "../middlewares/requireAuth";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/profile", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  const clerkUser = await clerkClient.users.getUser(userId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    "";
  const providerName = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const name =
    existing?.name?.trim() ||
    providerName ||
    email.split("@")[0] ||
    "Library member";
  const profileImage = existing?.profileImage ?? clerkUser.imageUrl ?? null;
  const createdAt = new Date(clerkUser.createdAt);

  const [profile] = await db
    .update(usersTable)
    .set({ name, email, profileImage, createdAt, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();
  res.json(GetProfileResponse.parse(profile));
});

router.patch("/profile", async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.name.trim()) {
    res.status(400).json({ error: "Please enter a name." });
    return;
  }

  let profileImage: string | null | undefined;
  if (parsed.data.profileImage !== undefined) {
    profileImage = parsed.data.profileImage;
    if (profileImage !== null) {
      try {
        const parsedUrl = new URL(profileImage);
        if (parsedUrl.protocol !== "https:") {
          res.status(400).json({ error: "Profile image must use a secure URL." });
          return;
        }
      } catch {
        res.status(400).json({ error: "Enter a valid profile image URL." });
        return;
      }
    }
  }

  const setValues = {
    name: parsed.data.name.trim(),
    updatedAt: new Date(),
    ...(profileImage === undefined ? {} : { profileImage }),
  };
  const [profile] = await db
    .update(usersTable)
    .set(setValues)
    .where(eq(usersTable.id, authenticatedUserId(req)))
    .returning();
  if (!profile) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  res.json(UpdateProfileResponse.parse(profile));
});

export default router;