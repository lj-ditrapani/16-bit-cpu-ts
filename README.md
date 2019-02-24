LJD 16-bit processor
====================

For other implementations, see <https://github.com/lj-ditrapani/16-bit-computer-specification>.

Design:
-------

- 16-bit CPU
- 16 X 16-bit registers and program counter (PC)
- Harvard architecture
- 2^16 = 65,536 Program memory addresses (16-bit resolution)
- 2^16 = 65,536 Data memory addresses (16-bit resolution)
- Program & data memory are word-addressable
- A word is 16 bits (2 bytes)
- All instructions are 16 bits long
- 16 instructions (4-bit op-code)

The processor instruction set architecture (ISA) can be found in
[doc/ISA.md](doc/ISA.md).


Usage
-----

```bash
npm install ljd-16-bit-cpu
```

From browser:

```html
<script type="module">
import { makeCpu, makeDebugCpu } from "/browser/ljd_16_bit_cpu.js"
// do stuff
</script>
```

From node.js:

```js
const { makeCpu, makeDebugCpu } = require('ljd_16_bit_cpu')
// do stuff
```

Run a program

```js
// programRom is a array of 16-bit integers with length <= 65,536
const cpuWithIoRam = makeCpu(programRom, dataRom)
const cpu = cpuWithIoRam.cpu
const ioRam = cpu.run(1000)
```

Step through a program

```js
const cpuWithIoRam = makeDebugCpu(programRom, dataRom)
const cpu = cpuWithIoRam.cpu
cpu.step()
cpu.step()
// ...
```

Example program in hex

```js
// This program adds the values in dataRom[0] and dataRom[1]
// then stores the result in ioRam[512]
// 27 + 73 = 100
// Address $FA00 is the beginning of screen RAM == ioRam[512]

const programRom = [
  0x100A,       // HBY 0x00 RA
  0x200A,       // LBY 0x00 RA
  0x3A01,       // LOD RA R1
  0x201A,       // LBY 0x01 RA
  0x3A02,       // LOD RA R2
  0x5123,       // ADD R1 R2 R3
  0x1FAA,       // HBY 0xFA RA
  0x200A,       // LBY 0x00 RA
  0x4A30,       // STR RA R3
  0x0000        // END
]

const dataRom = [27, 73, 0]
const cpuWithIoRam = makeCpu(programRom, dataRom)
const cpu = cpuWithIoRam.cpu
const ioRam = cpu.run(1000)
console.log(ioRam[512])      // prints 100
```


Developing
----------

Lint, run tests and build on node with:

```bash
npm run all
```

This produces lib/ljd_16_bit_cpu.js for node and browser/ljd_16_bit_cpu.js
for node and browser environments respectively.

Run manual test in browser; prints 100 to dev console.

```bash
npm run browser-test
```

Then open localhost:8000 in your browser.
Open the developer console to see the 100.

Run manual test on node; prints 100.

```bash
node test.js
```


Author:  Lyall Jonathan Di Trapani
