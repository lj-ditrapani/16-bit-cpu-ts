import { strict as assert } from 'assert'
import { makeCpu, makeDebugCpu } from './../src/ljd_16_bit_cpu'

describe('Cpu', () => {
  it('can run a program to add 2 numbers together', () => {
    const program = [
      0x100a, // Set RA to address $0000
      0x200a,
      0x3a00, // Load R0 = mem($0000)
      0x7a1a, // Incement address in RA by one
      0x3a01, // Load R1 = mem($0001)
      0x5012, // Add R2 = R0 + R1
      0x1faa, // Set RA to address $FA00
      0x200a,
      0x4a20, // Store mem($FA00) = R2
      0x0000 // END
    ]
    const data = [0x0014, 0x0046]
    const cpuWithIoRam = makeCpu(program, data)
    assert.equal(cpuWithIoRam.ioRam[512], 0x0000)
    const ioRam1 = cpuWithIoRam.cpu.run(10)
    assert.equal(ioRam1[512], 0x005a)
    const ioRam2 = cpuWithIoRam.cpu.run(12)
    assert.equal(ioRam2[512], 0x005a)
  })

  it('runs a branching program where 101 - 99 < 3 => 255 and PC = 21', () => {
    // RA (register 10) is used for all value addresses
    // RB has address of 2nd branch
    // RC has address of final, common, end of program
    // A is stored in ram[0100]
    // B is stored in ram[0101]
    // If A - B < 3, store 255 in ram[0102], else store 1 in ram[0102]
    // Put A in R1
    // Put B in R2
    // Sub A - B and put in R3
    // Load const 3 into R4
    // Sub R3 - R4 => R5
    // If R5 is negative, 255 => R6, else 1 => R6
    // Store R6 into ram[FBFF]
    const program = [
      // Load 2nd branch address into RB
      0x100b, // 00 HBY 0x00 RB
      0x210b, // 01 LBY 0x10 RB

      // Load end of program address int RC
      0x7b2c, // 02 ADI RB 2 RC

      // Load A value into R1
      0x101a, // 03 HBY 0x01 RA
      0x200a, // 04 LBY 0x00 RA
      0x3a01, // 05 LOD RA R1

      // Load B value into R2
      0x201a, // 06 LBY 0x01 RA
      0x3a02, // 07 LOD RA R2

      0x6123, // 08 SUB R1 R2 R3

      // Load constant 3 to R4
      0x1004, // 09 HBY 0x00 R4
      0x2034, // 0A LBY 0x03 R4

      0x6345, // 0B SUB R3 R4 R5

      // Branch to ? if A - B >= 3
      0xe5b3, // 0C BRV R5 RB ZP

      // Load constant 255 into R6
      0x1006, // 0D HBY 0x00 R6
      0x2ff6, // 0E LBY 0xFF R6
      0xe0c7, // 0F BRV R0 RC NZP (Jump to end)

      // Load constant 0x01 into R6
      0x1006, // 10 HBY 0x00 R6
      0x2016, // 11 LBY 0x01 R6

      // Store final value into ram[FBFF]
      0x1fba, // 12 HBY 0xFB RA
      0x2ffa, // 13 LBY 0xFF RA
      0x4a60, // 14 STR RA R6
      0x0000 // 15 END
    ]

    const data = new Array(258)
    data[0x0100] = 101
    data[0x0101] = 99
    const { cpu, ioRam } = makeDebugCpu(program, data)
    assert.equal(ioRam[1023], 0)
    const ioRam1 = cpu.run(21)
    assert.equal(ioRam1[1023], 255)
    assert.deepEqual(
      cpu.registers,
      Uint16Array.of(0, 101, 99, 2, 3, 65535, 255, 0, 0, 0, 0xfbff, 0x10, 0x12, 0, 0, 0)
    )
    assert.equal(cpu.instructionCounter, 21)
  })

  it('runs a program with a while loop that outputs 0xDOA8 (#{0xD0A8}) and PC = 16', () => {
    /* Run a complete program
     * Uses storage I/O
     * - input/read $E800
     * - output/write $EC00
     * Input: n followed by a list of n integers
     * Output: -2 * sum(list of n integers)
     */
    const program = [
      // R0 gets address of beginning of input from storage space
      0x1e80, // 0 HBY 0xE8 R0       0xE8 -> Upper(R0)
      0x2000, // 1 LBY 0x00 R0       0x00 -> Lower(R0)

      // R1 gets address of begining of output to storage space
      0x1ec1, // 2 HBY 0xEC R1       0xEC -> Upper(R1)
      0x2001, // 3 LBY 0x00 R1       0x00 -> Lower(R1)

      // R2 gets n, the count of how many input values to sum
      0x3002, // 4 LOD R0 R2         First Input (count n) -> R2

      // R3 and R4 have start and end of while loop respectively
      0x2073, // 5 LBY 0x07 R3       addr start of while loop -> R3
      0x20d4, // 6 LBY 0x0D R4       addr to end while loop -> R4

      // Start of while loop
      0xe242, // 7 BRV R2 R4 Z       if R2 is zero (0x.... -> PC)
      0x7010, // 8 ADI R0 1 R0       increment input address
      0x3006, // 9 LOD R0 R6         Next Input -> R6
      0x5565, // A ADD R5 R6 R5      R5 + R6 (running sum) -> R5
      0x8212, // B SBI R2 1 R2       R2 - 1 -> R2
      0xe037, // C BRV R0 R3 NZP     0x.... -> PC (unconditional)

      // End of while loop
      0xd506, // D SHF R5 left 1 R6  Double sum

      // Negate double of sum
      0x6767, // E SUB R7 R6 R7      0 - R6 -> R7

      // Output result
      0x4170, // F STR R1 R7         Output value of R7
      0x0000 //   END
    ]

    const length = 101

    function* makeData() {
      yield length
      for (let i = 0; i < length; i++) {
        yield 10 + i
      }
    }
    const data = Array.from(makeData())
    // const data = Array.from(Array(101).keys()).map(x => x + 10)
    const cpuWithIoRam = makeDebugCpu(program, data)
    const cpu = cpuWithIoRam.cpu
    const ioRam = cpu.run(200)
    assert.equal(ioRam[512], 0x005a)

    /* n = length(10..110) = 101
     * sum(10..110) = 6060
     * -2 * 6060 = -12120
     * 16-bit hex(+12120) = 0x2F58
     * 16-bit hex(-12120) = 0xD0A8
     */
    /*
    computer2.ram(0xE800).toInt shouldBe 101
    computer2.ram(0xE801).toInt shouldBe 10
    computer2.ram(0xE800 + 101).toInt shouldBe 110
    computer2.ram(0xEC00).toInt shouldBe 0xD0A8
       */
    assert.equal(cpu.instructionCounter, 16)
  })
})
