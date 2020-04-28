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
        case BigInt(1):
            return BigInt(0xff)
        case BigInt(2):
            return BigInt(0xffff)
        case BigInt(4):
            return BigInt(0xffffffff)
        case BigInt(8):
            return BigInt("0xffffffffffffffff")
        default:
            throw new Error(`${size} should be 1, 2, or 4`)
    }
}

const makeTag = (index: bigint, encoding: bigint, base: bigint) =>
    (index << BigInt(5)) |
    (encoding << BigInt(1)) |
    (base === BigInt(0) ? BigInt(0x0) : BigInt(0x1))

const processTag = (tag: bigint) => ({
    encoding: (tag >> BigInt(0x1)) & BigInt(0b1111),
    index: tag >> BigInt(0x5),
    isZeroBase: !((tag & BigInt(0x1)) === BigInt(0b1)),
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

    const buffer_ = baseDelta(buffer, deltaLimit, deltaSize, BigInt(0))
    const baseIndex = buffer_.findIndex(
        (element) => element.base === undefined && element.value < baseLimit,
    )
    if (baseIndex === -1) {
        return undefined
    }
    buffer_[baseIndex].size = baseSize
    const final = baseDelta(
        buffer_,
        deltaLimit,
        deltaSize,
        buffer_[baseIndex].value,
    )
    if (!final.every((element) => element.base !== undefined)) {
        return undefined
    }
    return {
        base: buffer_[baseIndex].value,
        baseSize,
        elements: final.map((element, i) => ({
            ...element,
            tag: makeTag(BigInt(i), encoding, element.base ?? BigInt(0)),
        })),
        size:
            baseSize +
            final.reduce((acc, element) => acc + element.size, BigInt(0)),
    }
}

const configs: CompressionConfig[] = [
    {
        baseSize: BigInt(8),
        deltaSize: BigInt(1),
        encoding: BigInt(0b0010),
        name: "base8-delta1",
    },
    {
        baseSize: BigInt(8),
        deltaSize: BigInt(4),
        encoding: BigInt(0b0100),
        name: "base8-delta4",
    },
    {
        baseSize: BigInt(8),
        deltaSize: BigInt(2),
        encoding: BigInt(0b0011),
        name: "base8-delta2",
    },
    {
        baseSize: BigInt(4),
        deltaSize: BigInt(2),
        encoding: BigInt(0b0110),
        name: "base4-delta2",
    },
    {
        baseSize: BigInt(4),
        deltaSize: BigInt(1),
        encoding: BigInt(0b0101),
        name: "base4-delta1",
    },
    {
        baseSize: BigInt(2),
        deltaSize: BigInt(1),
        encoding: BigInt(0b0111),
        name: "base2-delta1",
    },
]

const bufferToElement = (buffer: BigUint64Array) =>
    Array.from(new BigInt64Array(buffer)).map((value) => ({
        size: BigInt(8),
        value,
    }))

const toBytes = (e: bigint, size: bigint) => {
    const a: number[] = []
    for (let i = BigInt(0); i < size; ++i) {
        a.push(Number((e >> (i * BigInt(8))) & BigInt(0xff)))
    }
    // return Buffer.from(a)
    return a.reverse()
}

interface CompressedOutput {
    base: bigint
    baseSize: bigint
    elements: {
        base?: bigint
        size: bigint
        tag: bigint
        value: bigint
    }[]
    encoding: bigint
    size: bigint
}

export const tryCompress = (
    buffer: BigUint64Array,
): CompressedOutput | undefined => {
    const elements = bufferToElement(buffer)
    if (buffer.every((x) => x === BigInt(0))) {
        return {
            base: BigInt(0),
            baseSize: BigInt(1),
            elements: [
                {
                    base: BigInt(0),
                    size: BigInt(1),
                    tag: makeTag(BigInt(0), BigInt(0b0000), BigInt(0)),
                    value: BigInt(0),
                },
            ],
            encoding: BigInt(0b0000),
            size: BigInt(1),
        }
    }

    if (buffer.every((x) => x === buffer[0])) {
        return {
            base: BigInt(0),
            baseSize: BigInt(8),
            elements: [
                {
                    base: buffer[0],
                    size: BigInt(8),
                    tag: makeTag(BigInt(0), BigInt(0b0001), BigInt(0)),
                    value: buffer[0],
                },
            ],
            encoding: BigInt(0b0000),
            size: BigInt(8),
        }
    }

    const compressed = configs
        .map((config) => {
            const value = compressWith(elements, config)
            if (value === undefined) {
                return undefined
            }
            return {
                ...value,
                encoding: config.encoding,
                name: config.name,
            }
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
    return compressed
}

export const compress = (buffer: BigUint64Array): CompressedOutput =>
    tryCompress(buffer) ?? {
        base: BigInt(0),
        baseSize: BigInt(0),
        elements: [...buffer].map((value) => ({
            base: undefined,
            size: BigInt(0x8),
            tag: makeTag(BigInt(0), BigInt(0b1111), BigInt(0)),
            value,
        })),
        encoding: BigInt(0b1111),
        size: BigInt(buffer.length) * BigInt(8),
    }

export const toArray = (compressed: ReturnType<typeof compress>) => {
    const out = compressed.elements.map((element) => element.value)
    if (
        new Uint8Array(
            compressed.elements.flatMap((element) =>
                toBytes(element.value, element.size),
            ),
        ).length !== Number(compressed.size - compressed.baseSize)
    ) {
        throw new Error("wat")
    }
    return [
        ...(compressed.encoding === BigInt(0b1111) ? [] : [compressed.base]),
        ...out,
    ]
}

export const toByteArray = (compressed: ReturnType<typeof compress>) => {
    if (compressed === undefined) {
        return undefined
    }

    const out = Buffer.from([
        ...(compressed.encoding === BigInt(0b1111)
            ? []
            : toBytes(compressed.base, compressed.baseSize)),
        ...compressed.elements.flatMap((element) =>
            toBytes(element.value, element.size),
        ),
    ])

    if (out.length !== Number(compressed.size)) {
        throw new Error("wat")
    }
    return out
}

const arrayBufferToBigInt = (buf: ArrayBufferLike) => {
    const hex: string[] = []

    for (const i of new Uint8Array(buf)) {
        let h = i.toString(16)
        if (h.length % 2) {
            h = "0" + h
        }
        hex.push(h)
    }

    return BigInt("0x" + (hex.join("") || "0"))
}

export const decompress = (buffer: ArrayBufferLike, tag: bigint) => {
    const {encoding, index, isZeroBase} = processTag(tag)

    switch (encoding) {
        case BigInt(0b0000):
            return 0
        case BigInt(0b0001):
            return new BigUint64Array(buffer.slice(0, 8))[0]
        default:
            const config = configs.find(
                (config) => config.encoding === encoding,
            )
            if (config === undefined) {
                throw new Error()
            }

            const base = isZeroBase
                ? BigInt(0)
                : arrayBufferToBigInt(buffer.slice(0, Number(config.baseSize)))
            const start = config.baseSize + index * config.deltaSize
            const end = start + config.deltaSize
            const delta = arrayBufferToBigInt(
                buffer.slice(Number(start), Number(end)),
            )
            return base + delta
    }
}
