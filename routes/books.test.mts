import assert from "node:assert/strict"
import {randomUUID} from "node:crypto"
import {after, before, test} from "node:test"

const {prisma} = await import("../prisma.ts")

const name = `new-book-${randomUUID()}`

before(async () => {
    await prisma.book.deleteMany({where: {name}})
})
after(async () => {
    await prisma.book.deleteMany({where: {name}})
})

test("Fail to create a book", async () => {
    const res = await fetch(`http://localhost:${process.env.TEST_PORT}/books`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({name: ""})
    })
    assert.equal(res.status, 400)
    const created = await prisma.book.findFirst({where: {name}})
    assert.equal(created, null)
})

test("List books and do not find the created book", async () => {
    const res = await fetch(`http://localhost:${process.env.TEST_PORT}/books`)
    assert.equal(res.status, 200)
    const body = await res.json()
    const foundBook = body.find((book: {name: string}) => book.name === name)
    assert.equal(foundBook, undefined, `FoundBook: ${foundBook}`)
})

test("Create a book", async () => {
    const res = await fetch(`http://localhost:${process.env.TEST_PORT}/books`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({name})
    })
    assert.equal(res.status, 201)
})

test("List books and find the created book", async () => {
    const res = await fetch(`http://localhost:${process.env.TEST_PORT}/books`)
    assert.equal(res.status, 200)
    const body = await res.json()
    const book = body.find((book: {name: string}) => book.name === name)
    assert.ok(book)
})

test("Find the book details", async () => {
    const book = await prisma.book.findFirst({where: {name}})
    assert.ok(book)
    const res = await fetch(`http://localhost:${process.env.TEST_PORT}/books/${book.id}`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.deepEqual(body, {
        id: book.id,
        name,
        score: -1
    })
})
