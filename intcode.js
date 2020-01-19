const { once, EventEmitter } = require('events');
const readline = require('readline');

// Just treat all async intcode errors as fatal, as they're indicative of emulation bugs
process.on('unhandledRejection', (err, promise) => {
  console.error('Processing failed at:', promise, 'error:', err);
  process.exit(1);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Cache lines. Input command can simply listen to the inputEvents' line event
const inputCache = [];
const inputEvents = new EventEmitter();

rl.on('line', (line) => {
  if (inputEvents.listenerCount('input') > 0) {
    inputEvents.emit('input', line);
  } else {
    inputCache.push(line);
  }
});
inputEvents.on('newListener', (evName) => {
  const line = inputCache.shift();
  if (line !== undefined) {
    process.nextTick(() => {
      inputEvents.emit('input', line);
    });
  }
});


const OpAdd = {
  opcode: 1,
  oplen: 4,
  exec: function(modes) {
    this.ram[this.operand(modes, 3, true)] = this.operand(modes, 1) + this.operand(modes, 2);
  },
};

const OpMul = {
  opcode: 2,
  oplen: 4,
  exec: function(modes) {
    this.ram[this.operand(modes, 3, true)] = this.operand(modes, 1) * this.operand(modes, 2);
  },
};

const OpInput = {
  opcode: 3,
  oplen: 2,
  exec: async function(modes) {
    const [val] = await once(inputEvents, 'input');
    this.ram[this.operand(modes, 1, true)] = val;
  },
};

const OpOutput = {
  opcode: 4,
  oplen: 2,
  exec: function(modes) {
    console.log(this.operand(modes, 1));
  },
};

const ops = [
  OpAdd,
  OpMul,
  OpInput,
  OpOutput,
];

class Intputer {
  #pc = 0;

  #opcodes = {};

  constructor(ram) {
    this.ram = ram;

    ops.forEach(op => {
      // Make this tolerant to changes in the decoder
      this.#opcodes[op.opcode] = op;
      this.#opcodes[op.opcode.toString()] = op;
      this.#opcodes[op.opcode.toString().padStart(2, '0')] = op;
    });
  }

  dumpMemory() {
    console.log(this.ram.join(','));
  }

  vind(i) {
    return this.ram[i];
  }

  operand(modes, i, write = false) {
    const val = this.ram[this.#pc + i];
    // write operands are special cased in the spec, and are described as only
    // using position mode, although the behaviour actually matches immediate mode
    switch (write ? '1' : modes.charAt(modes.length - i)) {
      case '':
      case '0':
        return this.vind(val);
      case '1':
        return val;
    }
    throw new Error(`Invalid operand mode: ${modes}`);
  }

  async process() {
    while (true) {
      const rawOp = this.ram[this.#pc].toString();

      const op = rawOp.slice(-2);

      if (op == 99) {
        break;
      }

      const opC = this.#opcodes[op];
      if (!opC) {
        throw new Error(`Unrecognised opcode ${this.#pc}: ${op}`);
      }

      const modes = rawOp.slice(0, -2).padStart(opC.oplen - 1, '0');

      await opC.exec.call(this, modes);
      this.#pc += opC.oplen;
    }

    console.error('Halted');
    this.dumpMemory();
    rl.close();
  }

  static loadRamFromStream(inStream, cb) {
    const ram = [];
    let bufferedInput = '';

    inStream.setEncoding('utf8');


    function parseIntoRam(newInput, complete = false) {
        newInput = bufferedInput + newInput;
        let split = newInput.split(',');
        complete = complete || newInput.endsWith(',');
        for (let i = 0; i < (complete ? split.length : split.length - 1); i++) {
          ram.push(parseInt(split[i]));
        }
        if (complete) {
          bufferedInput = '';
        } else {
          bufferedInput = split[split.length - 1];
        }

    }

    inStream.on('readable', () => {
      let chunk;
      while ((chunk = inStream.read()) !== null) {
        parseIntoRam(chunk);
      }
    });

    inStream.on('end', () => {
      parseIntoRam('', true);
      console.error('Read all input');

      cb(ram);
    });
  }

}

module.exports = Intputer;

if (require.main === module) {
  const fs = require('fs');

  Intputer.loadRamFromStream(fs.createReadStream(process.argv[2]), (ram) => {
    const cpu = new Intputer(ram);
    cpu.process();
  })
}
