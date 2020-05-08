import {inspect} from "util"
import {compress as compress_, CompressionConfig} from "./compression"
import {assertDefined} from "./util"

const bytes = (x: bigint) => 8n * x

const configs: CompressionConfig[] = [
    {
        bases: [
            {baseSize: bytes(0n), deltaSize: bytes(1n), immediate: 0n},
            {baseSize: bytes(8n), deltaSize: bytes(1n)},
        ],
        name: "base8-delta1",
    },
    {
        bases: [
            {baseSize: bytes(0n), deltaSize: bytes(4n), immediate: 0n},
            {baseSize: bytes(8n), deltaSize: bytes(4n)},
        ],
        name: "base8-delta4",
    },
    {
        bases: [
            {baseSize: bytes(0n), deltaSize: bytes(2n), immediate: 0n},
            {baseSize: bytes(8n), deltaSize: bytes(2n)},
        ],
        name: "base8-delta2",
    },
    {
        bases: [
            {baseSize: bytes(0n), deltaSize: bytes(2n), immediate: 0n},
            {baseSize: bytes(4n), deltaSize: bytes(2n)},
        ],
        name: "base4-delta2",
    },
    {
        bases: [
            {baseSize: bytes(0n), deltaSize: bytes(1n), immediate: 0n},
            {baseSize: bytes(4n), deltaSize: bytes(1n)},
        ],
        name: "base4-delta1",
    },
    {
        bases: [
            {baseSize: bytes(0n), deltaSize: bytes(1n), immediate: 0n},
            {baseSize: bytes(2n), deltaSize: bytes(1n)},
        ],
        name: "base2-delta1",
    },
]

export default configs

export const compress = (buffer: bigint[]) => {
    const {bases, elements} = compress_(buffer, configs)
    return [
        ...bases
            .filter(
                ({base, immediate}) =>
                    base !== undefined && immediate === undefined,
            )
            .map(({base}) => assertDefined(base)),
        ...elements.map(({value}) => value),
    ]
}

const main = async () => {
    console.log(
        inspect(
            compress([
                0xc04039c0n,
                0xc04039c8n,
                0xc04039d0n,
                0xc04039d8n,
                0xc04039e0n,
                0xc04039e8n,
                0xc04039f0n,
                0xc04039f8n,
            ]),
        ),
    )
}

if (require?.main === module) {
    main().catch(console.error)
}
