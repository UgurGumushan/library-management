import {app} from "./app.ts"

const port = 3000

app.listen(port, (error) => {
    if (error) {
        console.error(error)
    } else {
        console.log(`Library Management app listening on port ${port}`)
    }
})
