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
      const instructionConstructor = opCode2Instruction[getOpCode(word)]
      return new instructionConstructor(word)
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

  constructor(_instructionWord: number) {}
}
/* tslint:enable */

class Hby {
  public readonly name: 'hby' = 'hby'
  public readonly immediate8Bit: number
  public readonly destinationRegister: number

  constructor(instructionWord: number) {
    this.immediate8Bit = getImmediate8Bit(instructionWord)
    this.destinationRegister = getNibble3(instructionWord)
  }
}

const getImmediate8Bit = (word: number): number => (word >> 4) & 0xff
const getOpCode = (word: number): number => (word >> 12) & 0xf
const getNibble3 = (word: number): number => word & 0xf
const opCode2Instruction = [End, Hby]
