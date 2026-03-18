import {BookModel} from "./generated/prisma/models/Book.ts";
import {UserModel} from "./generated/prisma/models/User.ts";

export interface BookDetailed extends BookModel {
    score?: number | string | null
}

export interface UserDetailed extends UserModel {
    books: {
        past: {
            name: string,
            userScore: number | null
        }[],
        present: {
            name: string
        }[]
    }
}
