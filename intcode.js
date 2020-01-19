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
  } else {
    console.log('Input value:');
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

const OpCJumpTrue = {
  opcode: 5,
  oplen: 3,
  exec: function(modes) {
    return this.operand(modes, 1) != 0 ? this.operand(modes, 2) : undefined;
  },
};

const OpCJumpFalse = {
  opcode: 6,
  oplen: 3,
  exec: function(modes) {
    return this.operand(modes, 1) == 0 ? this.operand(modes, 2) : undefined;
  },
};

const OpLessThan = {
  opcode: 7,
  oplen: 4,
  exec: function(modes) {
    this.ram[this.operand(modes, 3, true)] = this.operand(modes, 1) < this.operand(modes, 2) ? 1 : 0;
  },
};

const OpEquals = {
  opcode: 8,
  oplen: 4,
  exec: function(modes) {
    this.ram[this.operand(modes, 3, true)] = this.operand(modes, 1) == this.operand(modes, 2) ? 1 : 0;
  },
};

const ops = [
  OpAdd,
  OpMul,
  OpInput,
  OpOutput,
  OpCJumpTrue,
  OpCJumpFalse,
  OpLessThan,
  OpEquals,
];

class Intputer {
  #pc = 0;

  #opcodes = {};

  constructor(ram, opt = {}) {
    this.ram = ram;
    this.opt = opt;

    ops.forEach(op => {
      // Make this tolerant to changes in the decoder
      this.#opcodes[op.opcode] = op;
      this.#opcodes[op.opcode.toString()] = op;
      this.#opcodes[op.opcode.toString().padStart(2, '0')] = op;
    });
  }

  dumpMemory() {
    for (let i = 0; i < this.ram.length; i += 10) {
      console.log(`${i}:\t`, this.ram.slice(i, i + 10).join(',\t'));
    }
  }

  vind(i) {
    return this.ram[i];
  }

  operand(modes, i, write = false) {
    let ret;
    const val = this.ram[this.#pc + i];
    // write operands are special cased in the spec, and are described as only
    // using position mode, although the behaviour actually matches immediate mode
    switch (write ? '1' : modes.charAt(modes.length - i)) {
      case '':
      case '0':
        ret = this.vind(val);
        break;
      case '1':
        ret = val;
        break;
      default:
        throw new Error(`Invalid operand mode: ${modes}`);
    }
    // Ensure that values returned are ints
    const asInt = Number(ret);
    if (Number.isNaN(asInt)) {
      throw new Error(`Memory corrupted: ${ret}`);
    }
    return asInt;
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
        this.dumpMemory();
        throw new Error(`Unrecognised opcode ${this.#pc}: ${op}`);
      }

      if (this.opt.trace) {
        console.log(`${this.#pc}: ${this.ram.slice(this.#pc, this.#pc + opC.oplen).join(' ')}`);
      }
      if (this.opt.dump) {
        this.dumpMemory();
      }

      const modes = rawOp.slice(0, -2).padStart(opC.oplen - 1, '0');

      const jmp = await opC.exec.call(this, modes);
      if (jmp === undefined) {
        this.#pc += opC.oplen;
      } else {
        this.#pc = jmp;
      }
    }

    console.error('Halted');
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
  const args = require('yargs-parser')(process.argv.slice(2));

  console.dir(args);

  Intputer.loadRamFromStream(fs.createReadStream(args._[0]), (ram) => {
    const cpu = new Intputer(ram, { trace: !!args.t, dump: !!args.d });
    cpu.process();
  })
}
