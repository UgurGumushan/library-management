import type {Server} from "node:http"
import "dotenv/config"

const {app} = await import("../app.ts")
const {prisma} = await import("../prisma.ts")

let server: Server | undefined

export async function globalSetup() {
    server = app.listen(process.env.TEST_PORT)
}

export async function globalTeardown() {
    if (server) {
        server.on("close", async () => {
            await prisma.$disconnect()
        })
    }

}
