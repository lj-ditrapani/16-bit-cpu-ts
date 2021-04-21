/**
 * A 16-bit LJD cpu
 */
export interface ICpu {
  /**
   * Runs the cpu for n clocks.  Executes one instruction per clock tick.
   *
   * @param n The number of clock cycles to execute.
   * @return The ioRam buffer that was updated.
   */
  run(n: number): Uint16Array
}

/**
 * Contains both CPU and ioRam.
 */
export interface ICpuWithIoRam {
  readonly cpu: ICpu
  /**
   * The system ioRam for the first frame
   * (the cpu is using the other ioRam during the first frame)
   */
  readonly ioRam: Uint16Array
}

/**
 * Used for debugging
 */
export class CpuWithIoRam implements ICpuWithIoRam {
  constructor(public readonly cpu: Cpu, public readonly ioRam: Uint16Array) {}
}

/**
 * Returns an ICpu suitable for emulating an ljd 16-bit cpu
 *
 * @param programRom Array of 16-bit numbers, up to 64 * 1024 elements in array
 * @param dataRom Array of 16-bit numbers, up to 32 * 1024 elements in array
 */
export const makeCpu = (programRom: number[], dataRom: number[]): ICpuWithIoRam =>
  makeDebugCpu(programRom, dataRom)

/**
 * Returns an ICpu suitable for debugging a programs.
 *
 * @param programRom Array of 16-bit numbers, up to 64 * 1024 elements in array
 * @param dataRom Array of 16-bit numbers, up to 32 * 1024 elements in array
 */
export const makeDebugCpu = (programRom: number[], dataRom: number[]): CpuWithIoRam => {
  ensureMaxLength(programRom, 64 * 1024, 'programRom')
  ensureMaxLength(dataRom, 32 * 1024, 'dataRom')
  const pRom = new Uint16Array(64 * 1024)
  pRom.set(programRom)
  const dRom = new Uint16Array(32 * 1024)
  dRom.set(dataRom)
  const ioRam1: Uint16Array = new Uint16Array(1 * 1024)
  const ioRam2: Uint16Array = new Uint16Array(1 * 1024)
  return new CpuWithIoRam(new Cpu(pRom, dRom, ioRam1, ioRam2), ioRam2)
}

export class Cpu implements ICpu {
  public overflowFlag = false
  public carryFlag = false
  public instructionCounter = 0
  public readonly registers = new Uint16Array(16)
  public readonly dataRam = new Uint16Array(30 * 1024)
  public ioRam: Uint16Array
  private readonly instructions: Instruction[]
  private activeBuffer: 1 | 2 = 1

  constructor(
    programRom: Uint16Array,
    private readonly dataRom: Uint16Array,
    private readonly ioRam1: Uint16Array,
    private readonly ioRam2: Uint16Array,
  ) {
    ensureLength(programRom, 64 * 1024, 'programRom')
    ensureLength(dataRom, 32 * 1024, 'dataRom')
    this.instructions = Array.from(programRom).map((word) => {
      const [opCode, a, b, c] = getNibbles(word)
      return opCode2Instruction[opCode](a, b, c)
    })
    this.ioRam = ioRam1
  }

  public run(n: number): Uint16Array {
    this.instructionCounter = this.ioRam[0]
    while (n > 0) {
      --n
      const done = this.step()
      if (done) {
        break
      }
    }
    if (this.activeBuffer === 1) {
      this.ioRam2[0] = this.ioRam1[0]
      this.activeBuffer = 2
      this.ioRam = this.ioRam2
      return this.ioRam1
    } else {
      this.ioRam1[0] = this.ioRam2[0]
      this.activeBuffer = 1
      this.ioRam = this.ioRam1
      return this.ioRam2
    }
  }

  public step(): boolean {
    const instruction = this.instructions[this.instructionCounter]
    switch (instruction.name) {
      case 'end':
        return true
      case 'hby': {
        const value = this.registers[instruction.destinationRegister]
        this.registers[instruction.destinationRegister] =
          (instruction.immediate8Bit << 8) | (value & 0x00ff)
        this.incInstructionCounter()
        return false
      }
      case 'lby': {
        const value = this.registers[instruction.destinationRegister]
        this.registers[instruction.destinationRegister] =
          (value & 0xff00) | instruction.immediate8Bit
        this.incInstructionCounter()
        return false
      }
      case 'lod': {
        const address = this.registers[instruction.sourceRegister1]
        this.registers[instruction.destinationRegister] = this.read(address)
        this.incInstructionCounter()
        return false
      }
      case 'str': {
        const address = this.registers[instruction.sourceRegister1]
        this.write(address, this.registers[instruction.sourceRegister2])
        this.incInstructionCounter()
        return false
      }
      case 'add':
        this.basicAdd(
          this.registers[instruction.sourceRegister1],
          this.registers[instruction.sourceRegister2],
          0,
          instruction.destinationRegister,
        )
        this.incInstructionCounter()
        return false
      case 'sub':
        this.basicAdd(
          this.registers[instruction.sourceRegister1],
          ~this.registers[instruction.sourceRegister2],
          1,
          instruction.destinationRegister,
        )
        this.incInstructionCounter()
        return false
      case 'adi':
        this.basicAdd(
          this.registers[instruction.sourceRegister1],
          instruction.sourceRegister2,
          0,
          instruction.destinationRegister,
        )
        this.incInstructionCounter()
        return false
      case 'sbi':
        this.basicAdd(
          this.registers[instruction.sourceRegister1],
          ~instruction.sourceRegister2,
          1,
          instruction.destinationRegister,
        )
        this.incInstructionCounter()
        return false
      case 'and':
        this.registers[instruction.destinationRegister] =
          this.registers[instruction.sourceRegister1] &
          this.registers[instruction.sourceRegister2]
        this.incInstructionCounter()
        return false
      case 'orr':
        this.registers[instruction.destinationRegister] =
          this.registers[instruction.sourceRegister1] |
          this.registers[instruction.sourceRegister2]
        this.incInstructionCounter()
        return false
      case 'xor':
        this.registers[instruction.destinationRegister] =
          this.registers[instruction.sourceRegister1] ^
          this.registers[instruction.sourceRegister2]
        this.incInstructionCounter()
        return false
      case 'not':
        this.registers[instruction.destinationRegister] = ~this.registers[
          instruction.sourceRegister1
        ]
        this.incInstructionCounter()
        return false
      case 'shf': {
        const value = this.registers[instruction.sourceRegister1]
        this.carryFlag = getShiftCarry(value, instruction.direction, instruction.amount)
        this.registers[instruction.destinationRegister] =
          instruction.direction === 'left'
            ? (value << instruction.amount) & 0xffff
            : value >> instruction.amount
        this.incInstructionCounter()
        return false
      }
      case 'brv': {
        const value = this.registers[instruction.sourceRegister1]
        let jump = false
        if (instruction.negative && isNegative(value)) {
          jump = true
        } else if (instruction.zero && value === 0) {
          jump = true
        } else if (instruction.positive && value !== 0 && isPositiveOrZero(value)) {
          jump = true
        } else {
          jump = false
        }
        if (jump) {
          this.instructionCounter = this.registers[instruction.sourceRegister2]
        } else {
          this.incInstructionCounter()
        }
        return false
      }
      case 'brf': {
        let jump = false
        if (instruction.overflow && this.overflowFlag) {
          jump = true
        } else if (instruction.carry && this.carryFlag) {
          jump = true
        } else {
          jump = false
        }
        if (jump) {
          this.instructionCounter = this.registers[instruction.sourceRegister2]
        } else {
          this.incInstructionCounter()
        }
        return false
      }
    }
  }

  private read(address: number): number {
    if (address < 0x8000) {
      return this.dataRom[address]
    } else if (address < 0xf800) {
      return this.dataRam[address & 0x7fff]
    } else if (address < 0xfc00) {
      return this.ioRam[address & 0x03ff]
    } else {
      throw new Error(
        'LJD Cpu: Tried to read from a memory address out of bounds ' + address,
      )
    }
  }

  private write(address: number, value: number): void {
    if (address < 0x8000) {
      throw new Error('LJD Cpu: Tried to write into data ROM @ ' + address)
    } else if (address < 0xf800) {
      this.dataRam[address & 0x7fff] = value
    } else if (address < 0xfc00) {
      this.ioRam[address & 0x03ff] = value
    } else {
      throw new Error(
        'LJD Cpu: Tried to write to a memory address out of bounds ' + address,
      )
    }
  }

  private basicAdd(a: number, b: number, c: number, rd: number): void {
    const sum = a + b + c
    this.carryFlag = sum >= 65536
    const sum16Bit = sum & 0xffff
    this.overflowFlag =
      (isNegative(a) && isNegative(b) && isPositiveOrZero(sum16Bit)) ||
      (isPositiveOrZero(a) && isPositiveOrZero(b) && isNegative(sum16Bit))
    this.registers[rd] = sum16Bit
  }

  private incInstructionCounter(): void {
    this.instructionCounter = (this.instructionCounter + 1) & 0xffff
  }
}

type Instruction =
  | End
  | LoadByteInstruction
  | Lod
  | Str
  | Nibbles3Instruction
  | Not
  | Shf
  | Brv
  | Brf

type instructionsWith3Nibbles = 'add' | 'sub' | 'adi' | 'sbi' | 'and' | 'orr' | 'xor'

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
    public readonly destinationRegister: number,
  ) {
    this.immediate8Bit = (a << 4) | b
  }
}

class Lod {
  public readonly name: 'lod' = 'lod'

  constructor(
    public readonly sourceRegister1: number,
    public readonly destinationRegister: number,
  ) {}
}

class Str {
  public readonly name: 'str' = 'str'

  constructor(
    public readonly sourceRegister1: number,
    public readonly sourceRegister2: number,
  ) {}
}

class Nibbles3Instruction {
  constructor(
    public readonly name: instructionsWith3Nibbles,
    public readonly sourceRegister1: number,
    public readonly sourceRegister2: number,
    public readonly destinationRegister: number,
  ) {}
}

class Not {
  public readonly name: 'not' = 'not'

  constructor(
    public readonly sourceRegister1: number,
    public readonly destinationRegister: number,
  ) {}
}

class Shf {
  public readonly name: 'shf' = 'shf'
  public readonly direction: 'left' | 'right'
  public readonly amount: number

  constructor(
    public readonly sourceRegister1: number,
    sourceRegister2: number,
    public readonly destinationRegister: number,
  ) {
    this.direction = sourceRegister2 & 0x8 ? 'right' : 'left'
    this.amount = (sourceRegister2 & 0x7) + 1
  }
}

class Brv {
  public readonly name: 'brv' = 'brv'
  public readonly negative: boolean
  public readonly zero: boolean
  public readonly positive: boolean

  constructor(
    public readonly sourceRegister1: number,
    public readonly sourceRegister2: number,
    conditions: number,
  ) {
    this.negative = (conditions & 4) === 4
    this.zero = (conditions & 2) === 2
    this.positive = (conditions & 1) === 1
  }
}

class Brf {
  public readonly name: 'brf' = 'brf'
  public readonly overflow: boolean
  public readonly carry: boolean

  constructor(public readonly sourceRegister2: number, conditions: number) {
    this.overflow = (conditions & 2) === 2
    this.carry = (conditions & 1) === 1
  }
}

const opCode2Instruction: ((a: number, b: number, c: number) => Instruction)[] = [
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
  (a, b, c) => new Shf(a, b, c),
  (a, b, c) => new Brv(a, b, c),
  (_a, b, c) => new Brf(b, c),
]

const ensure = (flag: boolean, message: string): void => {
  if (!flag) {
    throw new Error('Invalid argument: ' + message)
  }
}

const ensureLength = (array: Uint16Array, length: number, name: string): void => {
  ensure(array.length === length, `${name} length must be ${length}`)
}

const ensureMaxLength = (array: number[], length: number, name: string): void => {
  ensure(array.length <= length, `${name} length must be <= ${length}`)
}

const getShiftCarry = (
  value: number,
  direction: 'left' | 'right',
  amount: number,
): boolean => {
  const position = direction === 'left' ? 16 - amount : amount - 1
  const mask = 1 << position
  return (value & mask) > 0
}

const isPositiveOrZero = (word: number): boolean => word < 32768

const isNegative = (word: number): boolean => word >= 32768

const getNibbles = (word: number): [number, number, number, number] => [
  word >> 12,
  (word >> 8) & 0xf,
  (word >> 4) & 0xf,
  word & 0xf,
]
