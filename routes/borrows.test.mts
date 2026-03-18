import assert from "node:assert/strict"
import {randomUUID} from "node:crypto"
import {after, before, test} from "node:test"

const {prisma} = await import("../prisma.ts")

const userName = `borrow-user-${randomUUID()}`
const bookName = `borrow-book-${randomUUID()}`

before(async () => {
    await prisma.borrow.deleteMany({
        where: {
            user: {name: userName},
            book: {name: bookName}
        }
    })
    await prisma.user.deleteMany({where: {name: userName}})
    await prisma.book.deleteMany({where: {name: bookName}})
})

after(async () => {
    await prisma.borrow.deleteMany({
        where: {
            user: {name: userName},
            book: {name: bookName}
        }
    })
    await prisma.user.deleteMany({where: {name: userName}})
    await prisma.book.deleteMany({where: {name: bookName}})
})

test("Create user and book, then borrow and return", async () => {
    const createUserRes = await fetch(`http://localhost:${process.env.TEST_PORT}/users`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({name: userName})
    })
    assert.equal(createUserRes.status, 201)

    const createBookRes = await fetch(`http://localhost:${process.env.TEST_PORT}/books`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({name: bookName})
    })
    assert.equal(createBookRes.status, 201)

    const user = await prisma.user.findFirst({where: {name: userName}})
    const book = await prisma.book.findFirst({where: {name: bookName}})
    assert.ok(user)
    assert.ok(book)

    const borrowRes = await fetch(`http://localhost:${process.env.TEST_PORT}/users/${user.id}/borrow/${book.id}`, {
        method: "POST"
    })
    assert.equal(borrowRes.status, 204)

    const borrowAgainRes = await fetch(`http://localhost:${process.env.TEST_PORT}/users/${user.id}/borrow/${book.id}`, {
        method: "POST"
    })
    assert.equal(borrowAgainRes.status, 400)

    const returnRes = await fetch(`http://localhost:${process.env.TEST_PORT}/users/${user.id}/return/${book.id}`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({score: 8})
    })
    assert.equal(returnRes.status, 204)

    const returnAgainRes = await fetch(`http://localhost:${process.env.TEST_PORT}/users/${user.id}/return/${book.id}`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({score: 8})
    })
    assert.equal(returnAgainRes.status, 404)
})
