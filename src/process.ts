import {promises as fs} from "fs"
import {compress} from "./bdi"

const main = async () => {
    const ints = (await fs.readFile("./data.txt"))
        .toString()
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => !!line)
        .map((line) => BigInt(parseInt(line)))
    compress(ints)
    console.log(`in size: ${ints.length * 64};`)
}

if (require?.main === module) {
    main().catch(console.error)
}
