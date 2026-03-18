import express, {Router} from "express"
import type {Response} from "express"
import z from "zod"
import type {BookDetailed} from "../types.ts"
import type {BookModel} from "../generated/prisma/models.ts"
import {prisma} from "../prisma.ts"

const router = Router()

router.get("/books", async (req, res: Response<BookModel[] | string>) => {
    try {
        const books = await prisma.book.findMany()
        res.status(200).send(books)
    } catch (error) {
        console.error("Error fetching books:", error)
        res.status(500).send("Internal Server Error")
    }
})

router.get("/books/:bookId", async (req, res: Response<BookDetailed | string>) => {
    const parseResult = z.object({bookId: z.coerce.number({error: "Invalid Book Id"})}).safeParse({bookId: req.params.bookId})
    if (!parseResult.success) {
        return res.status(400).send(parseResult.error.message)
    }

    try {
        const book = await prisma.book.findFirst({where: {id: parseResult.data.bookId}})
        if (!book) {
            return res.status(404).send("Book not found")
        }

        const bookScore = await prisma.borrow.aggregate({
            where: {score: {not: null}, bookId: parseResult.data.bookId},
            _avg: {score: true}
        })

        return res.status(200).send({
            id: book.id,
            name: book.name,
            score: bookScore._avg.score ? Number(bookScore._avg.score).toFixed(2) : -1
        })

    } catch (error) {
        console.error("Error fetching book:", error)
        return res.status(500).send("Internal Server Error")
    }
})

router.post("/books", express.json(), async (req, res: Response<undefined | string>) => {
    const parseResult = z.object({
        name: z.string("Name must be a string").min(1, {error: "Name must be at least 1 character"}).max(100, {error: "Name must be at most 100 characters long"}),
    }).safeParse(req.body)

    if (!parseResult.success) {
        return res.status(400).send(parseResult.error.message)
    }

    try {
        await prisma.book.create({data: {name: parseResult.data.name}})
        res.status(201).send()
    } catch (error) {
        console.error("Error creating book:", error)
        return res.status(500).send("Internal Server Error")
    }
})

export {router as booksRouter}
