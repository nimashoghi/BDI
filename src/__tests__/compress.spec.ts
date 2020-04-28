import {compress} from "../compress"

describe("algorithm", () => {
    it("compresses correctly with the presentation exmaple", () => {
        expect(
            Array.from(
                compress(
                    new Uint8Array([
                        0xc04039c0,
                        0xc04039c8,
                        0xc04039d0,
                        0xc04039f8,
                    ]),
                ),
            ),
        ).toEqual([0xc04039c0, 0x00, 0x08, 0x10, 0x38])
    })

    it("compresses correctly with the h264ref example", () => {
        expect(
            Array.from(
                compress(
                    new Uint8Array([
                        0xc00000000,
                        0xc0000000b,
                        0xc00000003,
                        0xc00000001,
                        0xc00000004,
                        0xc00000000,
                        0xc00000003,
                        0xc00000004,
                    ]),
                ),
            ),
        ).toEqual([0xc00000000, 0x00, 0x0b, 0x03, 0x01, 0x04, 0x00, 0x03, 0x04])
    })

    it("compresses correctly with the perlbench example", () => {
        expect(
            Array.from(
                compress(
                    new Uint8Array([
                        0xc04039c0,
                        0xc04039c8,
                        0xc04039d0,
                        0xc04039d8,
                        0xc04039e0,
                        0xc04039e8,
                        0xc04039f0,
                        0xc04039f8,
                    ]),
                ),
            ),
        ).toEqual([0xc04039c0, 0x00, 0x08, 0x10, 0x18, 0x20, 0x28, 0x30, 0x38])
    })
})
