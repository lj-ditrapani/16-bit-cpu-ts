/* eslint @typescript-eslint/no-var-requires: "off" */

// The example code in the README

import { makeCpu } from './lib/ljd_16_bit_cpu.js'
// const { makeCpu, makeDebugCpu } = require('ljd_16_bit_cpu');
// This program adds the values in dataRom[0] and dataRom[1]
// then stores the result in ioRam[512]
// 27 + 73 = 100
// Address $FA00 is the beginning of screen RAM == ioRam[512]

const programRom = [
  0x100a, // HBY 0x00 RA
  0x200a, // LBY 0x00 RA
  0x3a01, // LOD RA R1
  0x201a, // LBY 0x01 RA
  0x3a02, // LOD RA R2
  0x5123, // ADD R1 R2 R3
  0x1faa, // HBY 0xFA RA
  0x200a, // LBY 0x00 RA
  0x4a30, // STR RA R3
  0x0000, // END
]

const dataRom = [27, 73, 0]
const cpuWithIoRam = makeCpu(programRom, dataRom)
const cpu = cpuWithIoRam.cpu
const ioRam = cpu.run(1000)
console.log(ioRam[512]) // prints 100
