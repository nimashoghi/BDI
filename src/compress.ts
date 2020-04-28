interface Element {
    size: number
    value: number
}
const baseDelta = (
    buffer: Element[],
    limit: number,
    size: number,
    base: number,
) =>
    buffer.map((element) =>
        element.value - base > limit
            ? {base: undefined, ...element}
            : {base, size, value: element.value - base},
    )

const sizeToLimit = (size: number) => {
    switch (size) {
        case 1:
            return 0xff
        case 2:
            return 0xffff
        case 4:
            return 0xffffffff
        default:
            throw new Error()
    }
}

const makeTag = (index: number, encoding: number, base: number) =>
    (index << 5) | (encoding << 1) | (base === 0 ? 0x0 : 0x1)

const tag = makeTag(23232441, 0b1001, 2)
tag.toString(2) // ?

const processTag = (tag: number) => ({
    encoding: (tag >> 0x1) & 0b1111,
    index: tag >> 0x5,
    isZeroBase: !((tag & 0x1) === 0b1),
})

interface CompressionConfig {
    baseSize: number
    encoding: number
    name: string
    offsetSize: number
}
const compressWith = (
    buffer: Element[],
    {baseSize, encoding, offsetSize}: CompressionConfig,
) => {
    const baseLimit = sizeToLimit(baseSize)
    const offsetLimit = sizeToLimit(offsetSize)

    const buffer_ = baseDelta(buffer, offsetLimit, baseSize, 0)
    const baseIndex = buffer_.findIndex(
        (element) => element.size !== baseSize && element.value < baseLimit,
    )
    if (baseIndex === undefined) {
        return undefined
    }
    buffer_[baseIndex].size = baseSize
    const final = baseDelta(
        buffer_,
        offsetLimit,
        baseSize,
        buffer_[baseIndex].value,
    )
    if (!final.every((element) => element.size === offsetSize)) {
        return undefined
    }
    return {
        elements: final.map((element, i) => ({
            ...element,
            tag: makeTag(i, encoding, element.base ?? 0),
        })),
        size: baseSize + final.length * offsetSize,
    }
}

const configs: CompressionConfig[] = [{}]

const bufferToElement = (buffer: Uint8Array) =>
    Array.from(new Uint32Array(buffer)).map((value) => ({
        size: 4,
        value,
    }))

export const compress = (
    buffer: Uint8Array,
): ReturnType<typeof compressWith> => {
    const elements = bufferToElement(buffer)
    if (buffer.every((x) => x === 0)) {
        return {
            elements: [
                {base: 0, size: 1, tag: makeTag(0, 0x0000, 0), value: 0},
            ],
            size: 1,
        }
    }

    const u32Buffer = new Uint32Array(buffer)
    if (u32Buffer.every((x) => x === u32Buffer[0])) {
        return {
            elements: [
                {
                    base: u32Buffer[0],
                    size: 4,
                    tag: makeTag(0, 0x0001, 0),
                    value: u32Buffer[0],
                },
            ],
            size: 4,
        }
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
    return compressed
}

export const decompress = (buffer: Uint8Array, tag: number) => {
    const {encoding, index, isZeroBase} = processTag(tag)

    const u64buffer = new BigUint64Array(buffer)
    switch (encoding) {
        case 0b0000:
            return 0
        case 0b0001:
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
                : BigInt(buffer.subarray(0, config.baseSize))
            const start = config.baseSize + index * config.offsetSize
            const end = start + config.offsetSize
            return base + BigInt(buffer.subarray(start, end))
    }
}
