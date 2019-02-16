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
      return opCode2Instruction[opCode](a, b, c)
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

type Instruction = End | LoadByteInstruction | Lod | Str | Nibbles3Instruction

/* tslint:disable */
class End {
  public readonly name: 'end' = 'end'

  constructor(_a: number, _b: number, _c: number) {}
}
/* tslint:enable */

class LoadByteInstruction {
  public readonly immediate8Bit: number
  public readonly destinationRegister: number

  constructor(public readonly name: 'hby' | 'lby', a: number, b: number, c: number) {
    this.immediate8Bit = (a << 4) | b
    this.destinationRegister = c
  }
}

class Lod {
  public readonly name: 'lod' = 'lod'
  public readonly sourceRegister1: number
  public readonly destinationRegister: number

  constructor(a: number, _b: number, c: number) {
    this.sourceRegister1 = a
    this.destinationRegister = c
  }
}

class Str {
  public readonly name: 'str' = 'str'
  public readonly sourceRegister1: number
  public readonly sourceRegister2: number

  constructor(a: number, b: number, _c: number) {
    this.sourceRegister1 = a
    this.sourceRegister2 = b
  }
}

type instructionsWith3Nibbles = 'add' | 'sub' | 'adi' | 'sbi' | 'and' | 'orr' | 'xor'

class Nibbles3Instruction {
  public readonly sourceRegister1: number
  public readonly sourceRegister2: number
  public readonly destinationRegister: number

  constructor(
    public readonly name: instructionsWith3Nibbles,
    a: number,
    b: number,
    c: number
  ) {
    this.sourceRegister1 = a
    this.sourceRegister2 = b
    this.destinationRegister = c
  }
}

const getNibbles = (word: number): [number, number, number, number] => [
  word >> 12,
  (word >> 8) & 0xf,
  (word >> 4) & 0xf,
  word & 0xf
]
const opCode2Instruction: Array<(a: number, b: number, c: number) => Instruction> = [
  (a, b, c) => new End(a, b, c),
  (a, b, c) => new LoadByteInstruction('hby', a, b, c),
  (a, b, c) => new LoadByteInstruction('lby', a, b, c),
  (a, b, c) => new Lod(a, b, c),
  (a, b, c) => new Str(a, b, c),
  (a, b, c) => new Nibbles3Instruction('add', a, b, c),
  (a, b, c) => new Nibbles3Instruction('sub', a, b, c),
  (a, b, c) => new Nibbles3Instruction('adi', a, b, c),
  (a, b, c) => new Nibbles3Instruction('sbi', a, b, c),
  (a, b, c) => new Nibbles3Instruction('and', a, b, c),
  (a, b, c) => new Nibbles3Instruction('orr', a, b, c),
  (a, b, c) => new Nibbles3Instruction('xor', a, b, c)
]
