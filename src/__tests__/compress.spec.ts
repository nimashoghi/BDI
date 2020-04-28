import {compress} from "../compress"

describe("algorithm", () => {
    it("compresses correctly with the presentation exmaple", () => {
        expect(
            compress(
                new BigUint64Array([
                    0xc04039c0n,
                    0xc04039c8n,
                    0xc04039d0n,
                    0xc04039f8n,
                ]),
            ),
        ).toEqual([0xc04039c0, 0x00, 0x08, 0x10, 0x38])
    })

    it("compresses correctly with the h264ref example", () => {
        expect(
            compress(
                new BigUint64Array([
                    0xc00000000n,
                    0xc0000000bn,
                    0xc00000003n,
                    0xc00000001n,
                    0xc00000004n,
                    0xc00000000n,
                    0xc00000003n,
                    0xc00000004n,
                ]),
            ),
        ).toEqual([0xc00000000, 0x00, 0x0b, 0x03, 0x01, 0x04, 0x00, 0x03, 0x04])
    })

    it("compresses correctly with the perlbench example", () => {
        expect(
            compress(
                new BigUint64Array([
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
        ).toEqual([0xc04039c0, 0x00, 0x08, 0x10, 0x18, 0x20, 0x28, 0x30, 0x38])
    })
})
