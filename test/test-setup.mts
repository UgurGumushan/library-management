import {app} from "../app.ts";
import {prisma} from "../prisma.ts";
import {Server} from "node:http";

let server: Server

export async function globalSetup() {
    server = app.listen(process.env.TEST_PORT)
    server.on("close", () => {
        prisma.$disconnect()
    })
}

export async function globalTeardown() {
    server.close()
}
