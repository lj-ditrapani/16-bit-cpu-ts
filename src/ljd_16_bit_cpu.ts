export interface ICpu {
  run(n: number): void
  step(): void
}

export class Cpu implements ICpu {
  private readonly instructionCounter = 0
  private readonly instructions: Instruction[]

  constructor(
    private readonly programRom: Uint16Array,
    private readonly dataRom: Uint16Array,
    private readonly dataRam: Uint16Array,
    private readonly ioRamBuffer1: Uint16Array,
    private readonly ioRamBuffer2: Uint16Array
  ) {
    ensureLength(this.programRom, 64 * 1024, 'programRom')
    ensureLength(this.dataRom, 32 * 1024, 'dataRom')
    ensureLength(this.dataRam, 28 * 1024, 'dataRam')
    ensureLength(this.ioRamBuffer1, 2 * 1024, 'ioRamBuffer1')
    ensureLength(this.ioRamBuffer2, 2 * 1024, 'ioRamBuffer2')
    this.instructions = Array.from(programRom).map(word => {
      const [opCode, a, b, c] = getNibbles(word)
      const instructionConstructor = opCode2Instruction[opCode]
      return new instructionConstructor(a, b, c)
    })
  }

  public run(n: number): void {
    while (n > 0) {
      const done = this.step()
      if (done) {
        break
      }
    }
  }

  public step(): boolean {
    const instruction = this.instructions[this.instructionCounter]
    switch (instruction.name) {
      case 'end':
        break
      case 'hby':
        break
    }
    return true
  }
}

const ensure = (flag: boolean, message: string): void => {
  if (!flag) {
    throw new Error('Invalid argument: ' + message)
  }
}

const ensureLength = (array: Uint16Array, length: number, name: string): void => {
  ensure(array.length === length, `${name} length must be ${length}`)
}

type Instruction = End | Hby

/* tslint:disable */
class End {
  public readonly name: 'end' = 'end'

  constructor(_a: number, _b: number, _c: number) {}
}
/* tslint:enable */

class Hby {
  public readonly name: 'hby' = 'hby'
  public readonly immediate8Bit: number
  public readonly destinationRegister: number

  constructor(a: number, b: number, c: number) {
    this.immediate8Bit = (a << 4) | b
    this.destinationRegister = c
  }
}

const getNibbles = (word: number): [number, number, number, number] => [
  word >> 12,
  (word >> 8) & 0xf,
  (word >> 4) & 0xf,
  word & 0xf
]
const opCode2Instruction = [End, Hby]
