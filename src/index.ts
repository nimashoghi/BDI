import {compress, decompress, toByteArray} from "./compress"
import {zip} from "./util"

const i2hex = (i: number) => ("0" + i.toString(16)).slice(-2)

/* eslint-env: browser */
;(window as any).compress = () => {
    try {
        const inputBytes = (document.querySelector("#compressInput") as
            | HTMLTextAreaElement
            | undefined)?.value
        if (!inputBytes) {
            alert("Input bytes must be set!")
            return
        }

        const buffer = new BigUint64Array(
            inputBytes.split("\n").map((line) => BigInt(line.trim())),
        )
        const output = compress(buffer)

        const outputElement = document.querySelector("#compressOutput") as
            | HTMLTextAreaElement
            | undefined
        if (!outputElement) {
            alert("could't find output element")
            return
        }

        const hex = Array.from(toByteArray(output))
            .map((value) => i2hex(value))
            .join("")

        let extra = `BASE = 0x${output.base.toString(16)}\nElements:\n`
        let i = 0
        for (const [{tag, value, base}, initial] of zip(
            output.elements,
            Array.from(buffer),
        )) {
            extra += `[${i++}] 0x${initial.toString(
                16,
            )} is stored as 0x${value.toString(16)} with tag 0x${tag.toString(
                16,
            )}`
            if (base !== undefined) {
                extra += ` and the base 0x${base.toString(16)}`
            }
            extra += "\n"
        }

        const init = `${
            output.name === "no_compression" ? "" : "Compressed with "
        }${output.name}: ${hex}`
        const sizes = `Input Size: ${
            buffer.byteLength
        } bytes\nCompressed size: ${output.size} bytes (${
            BigInt(buffer.byteLength) - output.size
        } bytes saved)`
        outputElement.value = `${init}\n\n${sizes}\n\n${extra}`
    } catch (e) {
        alert(e.message)
    }
}
;(window as any).decompress = () => {
    try {
        const input = document.querySelector("#decompressInput") as
            | HTMLTextAreaElement
            | undefined
        const tag = document.querySelector("#decompressTag") as
            | HTMLInputElement
            | undefined
        const output = document.querySelector("#decompressOutput") as
            | HTMLTextAreaElement
            | undefined
        if (!input || !tag || !output) {
            alert("Couldn't find input element")
            return
        }

        const fromHexString = (hexString: string) =>
            new Uint8Array(
                hexString.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ??
                    [],
            )

        const value = decompress(fromHexString(input.value), BigInt(tag.value))
        output.value = `0x${value.toString(16)}`
    } catch (e) {
        alert(e.message)
    }
}
