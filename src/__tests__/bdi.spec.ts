/* eslint-disable jest/expect-expect */
import {compress} from "../bdi"

describe("compression", () => {
    it("compresses correctly with the presentation exmaple", () => {
        expect(
            compress([
                BigInt(0xc04039c0),
                BigInt(0xc04039c8),
                BigInt(0xc04039d0),
                BigInt(0xc04039f8),
            ]),
        ).toEqual([
            BigInt(0xc04039c0),
            BigInt(0x00),
            BigInt(0x08),
            BigInt(0x10),
            BigInt(0x38),
        ])
    })

    it("compresses correctly with the h264ref example", () => {
        expect(
            compress([
                BigInt(0xc00000000),
                BigInt(0xc0000000b),
                BigInt(0xc00000003),
                BigInt(0xc00000001),
                BigInt(0xc00000004),
                BigInt(0xc00000000),
                BigInt(0xc00000003),
                BigInt(0xc00000004),
            ]),
        ).toEqual([
            BigInt(0xc00000000),
            BigInt(0x00),
            BigInt(0x0b),
            BigInt(0x03),
            BigInt(0x01),
            BigInt(0x04),
            BigInt(0x00),
            BigInt(0x03),
            BigInt(0x04),
        ])
    })

    it("compresses correctly with the perlbench example", () => {
        expect(
            compress([
                BigInt(0xc04039c0),
                BigInt(0xc04039c8),
                BigInt(0xc04039d0),
                BigInt(0xc04039d8),
                BigInt(0xc04039e0),
                BigInt(0xc04039e8),
                BigInt(0xc04039f0),
                BigInt(0xc04039f8),
            ]),
        ).toEqual([
            BigInt(0xc04039c0),
            BigInt(0x00),
            BigInt(0x08),
            BigInt(0x10),
            BigInt(0x18),
            BigInt(0x20),
            BigInt(0x28),
            BigInt(0x30),
            BigInt(0x38),
        ])
    })

    it("can't compress data that doesn't have locality", () => {
        expect(
            compress([
                BigInt(0xa04039c0),
                BigInt(0xb04039c8),
                BigInt(0xc04039d0),
                BigInt(0xd04039f8),
            ]),
        ).toEqual([
            BigInt(0xa04039c0),
            BigInt(0xb04039c8),
            BigInt(0xc04039d0),
            BigInt(0xd04039f8),
        ])
    })
})
