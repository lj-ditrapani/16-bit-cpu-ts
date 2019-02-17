import { strict as assert } from 'assert'
import { makeCpu } from './../src/ljd_16_bit_cpu'

describe('Cpu', () => {
  describe('not sure yet', () => {
    it('something something', () => {
      const program = [
        0x100a, // Set RA to address $0000
        0x200a,
        0x3a00, // Load R0 = mem($0000)
        0x7a1a, // Incement address in RA by one
        0x3a01, // Load R1 = mem($0001)
        0x5012, // Add R2 = R0 + R1
        0x1faa, // Set RA to address $FA00
        0x200a,
        0x4a20 // Store mem($FA00) = R2
      ]
      const data = [0x0014, 0x0046]
      const cpu = makeCpu(program, data)
      const ioRam = cpu.run(20)
      assert.equal(ioRam[512], 0x005a)
    })
  })
})
