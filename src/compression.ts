import {assertDefined, enumerate} from "./util"

export type Int = bigint
export const Int = BigInt
export const INT_SIZE = Int(0x64)

export interface BaseConfig {
    base?: Int
    baseSize: Int
    deltaSize: Int
    immediate?: Int
}

export interface CompressionElement {
    base?: {index: Int; value: Int}
    size: Int
    value: Int
}

export interface CompressionConfig {
    bases: BaseConfig[]
    name: string
}

const sizeToLimit = (size: Int) =>
    Array.from(Array(Number(size)), (_, i) => 0b1n << Int(i)).reduce(
        (acc, curr) => acc | curr,
        0n,
    )

const baseDelta = (
    buffer: CompressionElement[],
    size: Int,
    base: Int,
    baseIndex: Int,
) => {
    const limit = sizeToLimit(size)
    return buffer.map((element) => {
        if (element.base !== undefined) {
            return element
        } else {
            const delta = element.value - base
            if (delta > limit) {
                return {base: undefined, ...element}
            } else {
                return {
                    base: {index: baseIndex, value: base},
                    size,
                    value: delta,
                }
            }
        }
    })
}

const getBase = (elements: CompressionElement[], size: Int) => {
    const limit = sizeToLimit(size)
    return elements.find(
        ({base, value}) => base === undefined && value <= limit,
    )?.value
}

const compressBase = (
    buffer: Int[],
    {bases: bases_, name}: CompressionConfig,
) => {
    const originalSize = Int(buffer.length) * INT_SIZE
    let [elements, size] = [
        buffer.map(
            (value): CompressionElement => ({
                base: undefined,
                size: INT_SIZE,
                value,
            }),
        ),
        0n,
    ]

    // make a full copy so we don't edit the param
    const bases = [...bases_].map((base) => ({...base}))
    for (const [b, i] of enumerate(bases)) {
        const {baseSize, deltaSize, immediate} = b
        const base = immediate ?? getBase(elements, baseSize)
        if (base === undefined) {
            continue
        }

        b.base = base
        elements = baseDelta(elements, deltaSize, base, BigInt(i))
        size += baseSize
    }

    if (elements.some(({base}) => base === undefined)) {
        return undefined
    }

    size += elements.reduce((acc, {size}) => acc + size, 0n)

    return {
        bases,
        elements,
        name,
        originalSize,
        size,
    }
}

export const compress = (buffer: Int[], configs: CompressionConfig[]) => {
    const results = configs
        .map((config) => compressBase(buffer, config))
        .filter((result) => result !== undefined)
        .map((result) => assertDefined(result))

    if (results.length === 0) {
        throw new Error(
            `Could not find a matching compression scheme from your provided configs!`,
        )
    }

    return results.reduce((lhs, rhs) => (lhs.size < rhs.size ? lhs : rhs))
}
