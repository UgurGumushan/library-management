import type {NextFunction, Request, Response} from "express"

const errorHandler = (err: Error, req: Request, res: Response<"Internal Error">, next: NextFunction) => {
    console.error(err.stack)
    res.status(500).send("Internal Error")
}

export {errorHandler}
