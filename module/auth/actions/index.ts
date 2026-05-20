"use server"

import { prisma } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

export const onBoardUser = async () => {
    try {
        const user = await currentUser();
        if (!user) {
            return {
                success: false,
                error: "No authenticated user found"
            }
        }

        const { id, firstName, lastName, imageUrl, emailAddresses } = user

        const newUser = await prisma.user.upsert({
            where: {
                clerkId: id
            },
            update: {
                name: firstName && lastName
                    ? `${firstName} ${lastName}`
                    : firstName || lastName || null,
                image: imageUrl || null,
                email: emailAddresses[0]?.emailAddress || "",
            },
            create: {
                clerkId: id,
                name: firstName && lastName
                    ? `${firstName} ${lastName}`
                    : firstName || lastName || null,
                image: imageUrl || null,
                email: emailAddresses[0]?.emailAddress || "",
            }
        })

        return {
            success: true,
            user: newUser,
            message: "User onboarded successfully"
        }

    } catch (error) {
        console.log("Error happened:", error)
        return {
            success: false,
            error: "Failed to onboard user"
        }
    }
}

export const getCurrentUser = async () => {
    try {
        const user = await currentUser();
        if (!user) {
            return null
        }

        const dbUser = await prisma.user.findUnique({
            where: {
                clerkId: user.id
            },
            select: {
                id: true,
                email: true,
                name: true,
                clerkId: true
            }
        })

        return dbUser

    } catch (error) {
        console.log("Error happened:", error)
        return null
    }
}
