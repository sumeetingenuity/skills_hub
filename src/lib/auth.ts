import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function getAuthUser() {
  const clerkAuth = await auth()
  if (!clerkAuth.userId) return null

  let user = await prisma.user.findUnique({
    where: { clerkId: clerkAuth.userId },
  })

  if (!user) {
    const clerkUser = await currentUser()
    user = await prisma.user.create({
      data: {
        clerkId: clerkAuth.userId,
        email: clerkUser?.emailAddresses?.[0]?.emailAddress || `${clerkAuth.userId}@skillhub.local`,
        name: clerkUser?.fullName || clerkUser?.firstName || null,
        avatarUrl: clerkUser?.imageUrl || null,
      },
    })
  }

  return user
}

export async function requireAuth() {
  const user = await getAuthUser()
  if (!user) {
    throw new Error("Authentication required")
  }
  return user
}
