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
[ISA.md](https://github.com/lj-ditrapani/16-bit-computer-specification/blob/master/ISA.md).


npm package
-----------

<https://www.npmjs.com/package/ljd-16-bit-cpu>

    npm install --save ljd-16-bit-cpu


Usage
-----

From browser:

```html
<script type="module">
import { makeCpu, makeDebugCpu } from "/lib/ljd_16_bit_cpu.js"
// do stuff
</script>
```

From node.js:

```js
import { makeCpu, makeDebugCpu } from 'ljd-16-bit-cpu'
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


API Documentation
-----------------

<https://lj-ditrapani.github.io/16-bit-cpu-ts/>


Developing
----------


### Setup ###

Install node with [https://github.com/nvm-sh/nvm](nvm).

    nvm install     # one-time install
    nvm use         # each time you enter the project directory

Install npm packages.

    npm install


### Format, lint, test, build ###


    npm run all

This produces a single ljd_16_bit_cpu.js esm module for both node and
browser environments.


### Test coverage ###

    # Run the tests with `npm run all` or
    npm test
    # This will generate the test coverage report
    # Then open the test coverage report
    firefox coverage/lcov-report/index.html


### Manual browser test ###

Run manual test in browser; prints 100 to dev console.

    npm run browser-test

Then open <localhost:8000/manual-test.html> in your browser.
Open the developer console to see the 100.

    firefox localhost:8000/manual-test.html


### Manual node test ###

Run manual test on node; prints 100.

    node manual-test.js


### Generate documentation ###

    npm run doc
    firefox docs/index.html &


### Update dependencies ###

    npm run ncu


### Publish ###

    rm -fr lib
    npm run all
    npm version patch/minor/major
    npm login
    npm publish


Author:  Lyall Jonathan Di Trapani
