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
        return true
        break
      case 'hby':
        return false
        break
      case 'lby':
        return false
        break
      case 'lod':
        return false
        break
      case 'str':
        return false
        break
      case 'add':
        return false
        break
      case 'sub':
        return false
        break
      case 'adi':
        return false
        break
      case 'sbi':
        return false
        break
      case 'and':
        return false
        break
      case 'orr':
        return false
        break
      case 'xor':
        return false
        break
      case 'not':
        return false
        break
      case 'shf':
        return false
        break
      case 'brv':
        return false
        break
      case 'brf':
        return false
        break
    }
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

type Instruction = End | LoadByteInstruction | Lod | Str | Nibbles3Instruction | Not

class End {
  public readonly name: 'end' = 'end'
}

const end = new End()

class LoadByteInstruction {
  public readonly immediate8Bit: number

  constructor(
    public readonly name: 'hby' | 'lby',
    a: number,
    b: number,
    public readonly destinationRegister: number
  ) {
    this.immediate8Bit = (a << 4) | b
  }
}

class Lod {
  public readonly name: 'lod' = 'lod'

  constructor(
    public readonly sourceRegister1: number,
    public readonly destinationRegister: number
  ) {}
}

class Str {
  public readonly name: 'str' = 'str'

  constructor(
    public readonly sourceRegister1: number,
    public readonly sourceRegister2: number
  ) {}
}

type instructionsWith3Nibbles =
  | 'add'
  | 'sub'
  | 'adi'
  | 'sbi'
  | 'and'
  | 'orr'
  | 'xor'
  | 'shf'
  | 'brv'
  | 'brf'

class Nibbles3Instruction {
  constructor(
    public readonly name: instructionsWith3Nibbles,
    public readonly sourceRegister1: number,
    public readonly sourceRegister2: number,
    public readonly destinationRegister: number
  ) {}
}

class Not {
  public readonly name: 'not' = 'not'

  constructor(
    public readonly sourceRegister1: number,
    public readonly destinationRegister: number
  ) {}
}

const getNibbles = (word: number): [number, number, number, number] => [
  word >> 12,
  (word >> 8) & 0xf,
  (word >> 4) & 0xf,
  word & 0xf
]
const opCode2Instruction: Array<(a: number, b: number, c: number) => Instruction> = [
  (_a, _b, _c) => end,
  (a, b, c) => new LoadByteInstruction('hby', a, b, c),
  (a, b, c) => new LoadByteInstruction('lby', a, b, c),
  (a, _b, c) => new Lod(a, c),
  (a, b, _c) => new Str(a, b),
  (a, b, c) => new Nibbles3Instruction('add', a, b, c),
  (a, b, c) => new Nibbles3Instruction('sub', a, b, c),
  (a, b, c) => new Nibbles3Instruction('adi', a, b, c),
  (a, b, c) => new Nibbles3Instruction('sbi', a, b, c),
  (a, b, c) => new Nibbles3Instruction('and', a, b, c),
  (a, b, c) => new Nibbles3Instruction('orr', a, b, c),
  (a, b, c) => new Nibbles3Instruction('xor', a, b, c),
  (a, _b, c) => new Not(a, c),
  (a, b, c) => new Nibbles3Instruction('shf', a, b, c),
  (a, b, c) => new Nibbles3Instruction('brv', a, b, c),
  (a, b, c) => new Nibbles3Instruction('brf', a, b, c)
]
