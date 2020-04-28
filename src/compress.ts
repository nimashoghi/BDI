interface Element {
    size: bigint
    value: bigint
}
const baseDelta = (
    buffer: Element[],
    limit: bigint,
    size: bigint,
    base: bigint,
) =>
    buffer.map((element) =>
        element.value - base > limit
            ? {base: undefined, ...element}
            : {base, size, value: element.value - base},
    )

const sizeToLimit = (size: bigint) => {
    switch (size) {
        case 1n:
            return 0xffn
        case 2n:
            return 0xffffn
        case 4n:
            return 0xffffffffn
        default:
            throw new Error()
    }
}

const makeTag = (index: bigint, encoding: bigint, base: bigint) =>
    (index << 5n) | (encoding << 1n) | (base === 0n ? 0x0n : 0x1n)

const tag = makeTag(23232441n, 0b1001n, 2n)
tag.toString(2) // ?

const processTag = (tag: bigint) => ({
    encoding: (tag >> 0x1n) & 0b1111n,
    index: tag >> 0x5n,
    isZeroBase: !((tag & 0x1n) === 0b1n),
})

interface CompressionConfig {
    baseSize: bigint
    deltaSize: bigint
    encoding: bigint
    name: string
}
const compressWith = (
    buffer: Element[],
    {baseSize, deltaSize, encoding}: CompressionConfig,
) => {
    const baseLimit = sizeToLimit(baseSize)
    const deltaLimit = sizeToLimit(deltaSize)

    const buffer_ = baseDelta(buffer, deltaLimit, baseSize, 0n)
    const baseIndex = buffer_.findIndex(
        (element) => element.size !== baseSize && element.value < baseLimit,
    )
    if (baseIndex === undefined) {
        return undefined
    }
    buffer_[baseIndex].size = baseSize
    const final = baseDelta(
        buffer_,
        deltaLimit,
        baseSize,
        buffer_[baseIndex].value,
    )
    if (!final.every((element) => element.size === deltaSize)) {
        return undefined
    }
    return {
        elements: final.map((element, i) => ({
            ...element,
            tag: makeTag(BigInt(i), encoding, element.base ?? 0n),
        })),
        size: baseSize + BigInt(final.length) * deltaSize,
    }
}

const configs: CompressionConfig[] = [
    {
        baseSize: 8n,
        deltaSize: 1n,
        encoding: 0b0010n,
        name: "base8-delta1",
    },
    {
        baseSize: 8n,
        deltaSize: 4n,
        encoding: 0b0100n,
        name: "base8-delta4",
    },
    {
        baseSize: 8n,
        deltaSize: 2n,
        encoding: 0b0011n,
        name: "base8-delta2",
    },
    {
        baseSize: 4n,
        deltaSize: 2n,
        encoding: 0b0110n,
        name: "base4-delta2",
    },
    {
        baseSize: 4n,
        deltaSize: 1n,
        encoding: 0b0101n,
        name: "base4-delta1",
    },
    {
        baseSize: 2n,
        deltaSize: 1n,
        encoding: 0b0111n,
        name: "base2-delta1",
    },
]

const bufferToElement = (buffer: BigUint64Array) =>
    Array.from(new BigInt64Array(buffer)).map((value) => ({
        size: 4n,
        value,
    }))

const toBytes = (e: bigint, size: bigint) => {
    const a: number[] = []
    for (let i = 0n; i < size; ++i) {
        a.push(Number((e << i) & 0xffn))
    }
    return a
}

const makeOutput = (
    compressed: NonNullable<ReturnType<typeof compressWith>>,
) => {
    const out = new Uint8Array(
        compressed.elements.flatMap((element) =>
            toBytes(element.value, element.size),
        ),
    )
    if (out.length !== Number(compressed.size)) {
        throw new Error("wat")
    }
    return out
}

export const compress = (buffer: BigUint64Array) => {
    const elements = bufferToElement(buffer)
    if (buffer.every((x) => x === 0n)) {
        return makeOutput({
            elements: [
                {base: 0n, size: 1n, tag: makeTag(0n, 0b0000n, 0n), value: 0n},
            ],
            size: 1n,
        })
    }

    if (buffer.every((x) => x === buffer[0])) {
        return makeOutput({
            elements: [
                {
                    base: buffer[0],
                    size: 4n,
                    tag: makeTag(0n, 0b0001n, 0n),
                    value: buffer[0],
                },
            ],
            size: 4n,
        })
    }

    const compressed = configs
        .map((config) => {
            const value = compressWith(elements, config)
            if (value === undefined) {
                return undefined
            }
            return {...value, name: config.name}
        })
        .reduce((prev, curr) =>
            (prev?.size ?? Number.MAX_SAFE_INTEGER) >
            (curr?.size ?? Number.MAX_SAFE_INTEGER)
                ? curr
                : prev,
        )

    if (compressed === undefined) {
        console.log("couldn't find good compression")
        return undefined
    }

    console.log(compressed.name)
    return makeOutput(compressed)
}

export const decompress = (buffer: BigUint64Array, tag: bigint) => {
    const {encoding, index, isZeroBase} = processTag(tag)

    const u64buffer = new BigUint64Array(buffer)
    switch (encoding) {
        case 0b0000n:
            return 0
        case 0b0001n:
            return u64buffer[0]
        default:
            const config = configs.find(
                (config) => config.encoding === encoding,
            )
            if (config === undefined) {
                throw new Error()
            }

            const base = isZeroBase
                ? 0n
                : BigInt(buffer.subarray(0, Number(config.baseSize)))
            const start = config.baseSize + index * config.deltaSize
            const end = start + config.deltaSize
            return base + BigInt(buffer.subarray(Number(start), Number(end)))
    }
}
