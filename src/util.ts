export const zip = <A, B>(a: A[], b: B[]) => {
    const array: [A, B][] = []
    for (let i = 0; i < Math.max(a.length, b.length); ++i) {
        array.push([a[i], b[i]])
    }
    return array
}
