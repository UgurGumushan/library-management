import express, {Router} from "express"
import type {Response} from "express"
import z from "zod"
import {prisma} from "../prisma.ts"

const router = Router()

router.post("/users/:userId/borrow/:bookId", express.json(), async (req, res: Response<undefined | string>) => {
    const parseResult = z.object({
        userId: z.coerce.number().min(1, {error: "User ID must be a positive integer"}).max(Number.MAX_SAFE_INTEGER, {error: "User ID must be a valid positive integer"}),
        bookId: z.coerce.number().min(1, {error: "Book ID must be a positive integer"}).max(Number.MAX_SAFE_INTEGER, {error: "Book ID must be a valid positive integer"}),
    }).safeParse({
        userId: req.params.userId,
        bookId: req.params.bookId
    })
    if (!parseResult.success) {
        return res.status(400).send(parseResult.error.message)
    }

    try {
        const user = await prisma.user.findFirst({
            where: {id: parseResult.data.userId}
        })
        if (!user) {
            return res.status(404).send("User not found")
        }

        const book = await prisma.book.findFirst({
            where: {id: parseResult.data.bookId}
        })
        if (!book) {
            return res.status(404).send("Book not found")
        }

        const bookIsBorrowed = await prisma.borrow.findFirst({
            where: {
                bookId: parseResult.data.bookId,
                isReturned: false
            }
        })

        if (bookIsBorrowed) {
            return res.status(400).send("Book is already borrowed")
        }

        await prisma.borrow.create({
            data: {userId: parseResult.data.userId, bookId: parseResult.data.bookId}
        })
        res.status(204).send()
    } catch (error) {
        console.error("Error creating borrow record:", error)
        return res.status(500).send("Internal Server Error")
    }
})

router.post("/users/:userId/return/:bookId", express.json(), async (req, res) => {
    const parseResult = z.object({
        userId: z.coerce.number().min(1, {error: "User ID must be a positive integer"}).max(Number.MAX_SAFE_INTEGER, {error: "User ID must be a valid positive integer"}),
        bookId: z.coerce.number().min(1, {error: "Book ID must be a positive integer"}).max(Number.MAX_SAFE_INTEGER, {error: "Book ID must be a valid positive integer"}),
        score: z.number().min(0, {error: "Score must be at least 0"}).max(10, {error: "Score must be at most 10"}),
    }).safeParse({
        userId: req.params.userId,
        bookId: req.params.bookId,
        score: Number(req.body.score)
    })


    if (!parseResult.success) {
        return res.status(400).send(parseResult.error.message)
    }
    try {
        const user = await prisma.user.findUnique({
            where: {id: parseResult.data.userId}
        })
        if (!user) {
            return res.status(404).send("User not found")
        }

        const book = await prisma.book.findUnique({
            where: {id: parseResult.data.bookId}
        })
        if (!book) {
            return res.status(404).send("Book not found")
        }

        const borrowNotReturned = await prisma.borrow.findFirst({
            where: {
                bookId: parseResult.data.bookId,
                isReturned: false
            }
        })

        if (!borrowNotReturned) {
            return res.status(404).send("Book is not borrowed")
        }

        if (borrowNotReturned.userId !== parseResult.data.userId) {
            return res.status(404).send("Book is not borrowed by this user")
        }

        await prisma.borrow.update({
            where: {id: borrowNotReturned.id},
            data: {
                isReturned: true,
                score: parseResult.data.score
            }
        })
        return res.status(204).send()
    } catch (error) {
        console.error(error)
        return res.status(500).send("Internal Error")
    }
})

export {router as borrowsRouter}
