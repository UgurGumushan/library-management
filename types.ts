import {BookModel} from "./generated/prisma/models/Book.ts";
import {UserModel} from "./generated/prisma/models/User.ts";

export interface BookDetailed extends BookModel {
    score?: number | null
}

export interface BookSummary {
    name: string,
    userScore: number
}

export interface UserDetailed extends UserModel {
    books: {
        past: BookSummary[]
        present: BookSummary[]
    }
}
