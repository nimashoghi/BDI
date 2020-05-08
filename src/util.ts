export const assertDefined = <T>(value: T | undefined | null) => {
    if (value === undefined || value === null) {
        throw new Error(`Value cannot be undefined or null!`)
    }
    return value
}

export const enumerate = <T>(value: T[]) =>
    value.map((value, i) => [value, i] as const)
