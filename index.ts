import express from "express"
import type {Request, Response, NextFunction} from "express"
import z from "zod";
import type {BookDetailed, BookSummary, UserDetailed} from "./types.ts";
import {prisma} from "./prisma.ts";

import type {BorrowModel, BookModel, UserModel} from "./generated/prisma/models.ts"

const app = express()
const port = 3000

app.get("/users", async (req, res: Response<UserModel[]>) => {
    const users = await prisma.user.findMany()
    res.status(200).send(users)
})

app.get("/users/:userId", async (req, res: Response<UserDetailed | string>) => {
    const parseResult = z.object({userId: z.coerce.number({error: "Invalid User Id"})}).safeParse({userId: req.params.userId})

    if (!parseResult.success) {
        return res.status(400).send(parseResult.error.message)
    }

    try {
        const user = await prisma.user.findFirst({
            where: {id: parseResult.data.userId}, include: {borrows: {include: {book: true}}}
        })

        if (!user) return res.status(404).send("User not found")

        const userBorrowedBookIds = user.borrows.map(b => b.bookId)
        const bookRatings = await prisma.borrow.groupBy({
            by: ["bookId"],
            where: {score: {not: null}},
            _avg: {score: true},
            having: {bookId: {in: userBorrowedBookIds}}
        })

        const pastBooks: BookModel[] = [];
        let presentBooks: BookModel[] = []

        for (const borrow of user.borrows) {
            if (borrow.isReturned && pastBooks.findIndex(b => b.id === borrow.bookId) === -1) {
                pastBooks.push(borrow.book)
            } else if (!borrow.isReturned && presentBooks.findIndex(b => b.id === borrow.bookId) === -1) {
                presentBooks.push(borrow.book)
            }
        }

        const past = pastBooks.map(b => {
            const foundScore = bookRatings.find(r => r.bookId === b.id)
            const userScore = foundScore?._avg.score ?? -1
            return {name: b.name, userScore}
        })

        const present = presentBooks.map(b => {
            const foundScore = bookRatings.find(r => r.bookId === b.id)
            const userScore = foundScore?._avg.score ?? -1
            return {name: b.name, userScore}
        })

        res.status(200).send({
            id: user.id,
            name: user.name,
            books: {
                past,
                present,
            }
        })
    } catch (error) {
        console.error("Error fetching user:", error)
        res.status(500).send("Internal Server Error")
    }
})

app.post("/users", express.json(), async (req, res: Response<UserModel | string>) => {
    const parseResult = z.object({
        name: z.string("Name must be a string").min(1, {error: "Name must be at least 1 character"}).max(100, {error: "Name must be at most 100 characters long"}),
    }).safeParse(req.body)

    if (!parseResult.success) {
        return res.status(400).send(parseResult.error.message)
    }

    try {
        const result = await prisma.user.create({data: {name: parseResult.data.name}})
        res.status(201).send(result)
    } catch (error) {
        console.error("Error creating user:", error)
        res.status(500).send("Internal Server Error")
    }
})

app.get("/books", async (req, res: Response<BookModel[] | string>) => {
    try {
        const books = await prisma.book.findMany()
        res.status(200).send(books)
    } catch (error) {
        console.error("Error fetching books:", error)
        res.status(500).send("Internal Server Error")
    }
})

app.get("/books/:bookId", async (req, res: Response<BookDetailed | string>) => {
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

        console.debug("Book Score:", bookScore)

        return res.status(200).send({id: book.id, name: book.name, score: bookScore._avg.score ?? -1})

    } catch (error) {
        console.error("Error fetching book:", error)
        return res.status(500).send("Internal Server Error")
    }
})

app.post("/books", express.json(), async (req, res: Response<BookModel | string>) => {
    const parseResult = z.object({
        name: z.string("Name must be a string").min(1, {error: "Name must be at least 1 character"}).max(100, {error: "Name must be at most 100 characters long"}),
    }).safeParse(req.body)

    if (!parseResult.success) {
        return res.status(400).send(parseResult.error.message)
    }

    try {
        const result = await prisma.book.create({data: {name: parseResult.data.name}})
        res.status(201).send(result)
    } catch (error) {
        console.error("Error creating book:", error)
        return res.status(500).send("Internal Server Error")
    }
})

app.post("/users/:userId/borrow/:bookId", express.json(), async (req, res: Response<BorrowModel | string>) => {
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

        const result = await prisma.borrow.create({
            data: {userId: parseResult.data.userId, bookId: parseResult.data.bookId}
        })
        res.status(204).send(result)
    } catch (error) {
        console.error("Error creating borrow record:", error)
        return res.status(500).send("Internal Server Error")
    }
})

app.post("/users/:userId/return/:bookId", express.json(), async (req, res) => {
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

        const updatedBorrow = await prisma.borrow.update({
            where: {id: borrowNotReturned.id},
            data: {
                isReturned: true,
                score: parseResult.data.score
            }
        })
        return res.status(204).send(updatedBorrow)
    } catch (error) {
        console.error(error)
        return res.status(500).send('Internal Error')
    }
})

app.use((err: Error, req: Request, res: Response<"Internal Error">, next: NextFunction) => {
    console.error(err.stack)
    res.status(500).send('Internal Error')
})

app.listen(port, (error) => {
    if (error) {
        console.error(error)
    } else {
        console.log(`Library Management app listening on port ${port}`)
    }
})

