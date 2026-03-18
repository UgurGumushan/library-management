import assert from "node:assert/strict"
import {randomUUID} from "node:crypto"
import {after, before, test} from "node:test"

const {prisma} = await import("../prisma.ts")

const name = `new-user-${randomUUID()}`

before(async () => {
    await prisma.user.deleteMany({where: {name}})
})
after(async () => {
    await prisma.user.deleteMany({where: {name}})
})

test("Fail to create a user", async () => {
    const res = await fetch(`http://localhost:${process.env.TEST_PORT}/users`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({name: ""})
    })
    assert.equal(res.status, 400)
    const created = await prisma.user.findUnique({where: {name}})
    assert.equal(created, null)
})

test("List users and do not find the created user", async () => {
    const res = await fetch(`http://localhost:${process.env.TEST_PORT}/users`);
    assert.equal(res.status, 200)
    const body = await res.json()
    const foundUser = body.find((user: { name: string }) => user.name === name)
    assert.equal(foundUser, undefined, `FoundUser: ${foundUser}`)
})

test("Create a user", async () => {
    const res = await fetch(`http://localhost:${process.env.TEST_PORT}/users`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({name})
    })
    assert.equal(res.status, 201)
})

test("List users and find the created user", async () => {
    const res = await fetch(`http://localhost:${process.env.TEST_PORT}/users`);
    assert.equal(res.status, 200)
    const body = await res.json()
    const user = body.find((user: { name: string }) => user.name === name)
    assert.ok(user)
})

test("Find the user details", async () => {
    const user = await prisma.user.findFirst({where: {name}})
    assert.ok(user)
    const res = await fetch(`http://localhost:${process.env.TEST_PORT}/users/${user.id}`);
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.deepEqual(body, {
        id: user.id,
        name,
        books: {"past": [], "present": []}
    })
})

