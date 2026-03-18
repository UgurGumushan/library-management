import express, {Router} from "express"
import type {Response} from "express"
import z from "zod"
import type {UserDetailed} from "../types.ts"
import type {UserModel} from "../generated/prisma/models.ts"
import {prisma} from "../prisma.ts"

const router = Router()

router.get("/users", async (req, res: Response<UserModel[]>) => {
    const users = await prisma.user.findMany()
    res.status(200).send(users)
})

router.get("/users/:userId", async (req, res: Response<UserDetailed | string>) => {
    const parseResult = z.object({userId: z.coerce.number({error: "Invalid User Id"})}).safeParse({userId: req.params.userId})

    if (!parseResult.success) {
        return res.status(400).send(parseResult.error.message)
    }

    try {
        const user = await prisma.user.findFirst({
            where: {id: parseResult.data.userId}, include: {borrows: {include: {book: true}}}
        })

        if (!user) return res.status(404).send("User not found")

        const pastBooks: {
            bookId: number
            name: string,
            userScore: number
        }[] = []
        let presentBooks: { bookId: number, name: string }[] = []

        for (const borrow of user.borrows) {
            if (borrow.isReturned && pastBooks.findIndex(b => b.bookId === borrow.bookId) === -1) {
                pastBooks.push({bookId: borrow.bookId, name: borrow.book.name, userScore: borrow.score ?? -1})
            } else if (!borrow.isReturned && presentBooks.findIndex(b => b.bookId === borrow.bookId) === -1) {
                presentBooks.push({bookId: borrow.bookId, name: borrow.book.name})
            }
        }

        res.status(200).send({
            id: user.id,
            name: user.name,
            books: {
                past: pastBooks.map(b => ({name: b.name, userScore: b.userScore})),
                present: presentBooks.map(b => ({name: b.name})),
            }
        })
    } catch (error) {
        console.error("Error fetching user:", error)
        res.status(500).send("Internal Server Error")
    }
})

router.post("/users", express.json(), async (req, res: Response<undefined | string>) => {
    const parseResult = z.object({
        name: z.string("Name must be a string").min(1, {error: "Name must be at least 1 character"}).max(100, {error: "Name must be at most 100 characters long"}),
    }).safeParse(req.body)

    if (!parseResult.success) {
        return res.status(400).send(parseResult.error.message)
    }

    try {
        await prisma.user.create({data: {name: parseResult.data.name}})
        res.status(201).send()
    } catch (error) {
        console.error("Error creating user:", error)
        res.status(500).send("Internal Server Error")
    }
})

export {router as usersRouter}
