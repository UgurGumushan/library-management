import express from "express"
import {errorHandler} from "./middleware/error-handler.ts"
import {booksRouter} from "./routes/books.ts"
import {borrowsRouter} from "./routes/borrows.ts"
import {usersRouter} from "./routes/users.ts"

const app = express()

app.use(usersRouter)
app.use(booksRouter)
app.use(borrowsRouter)
app.use(errorHandler)

export {app}
