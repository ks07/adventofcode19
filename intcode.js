const { once, EventEmitter } = require('events');
const readline = require('readline');

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
  exec: function(loc) {
    const oper1 = this.ram[loc + 1];
    const oper2 = this.ram[loc + 2];
    const oper3 = this.ram[loc + 3];
    this.ram[oper3] = this.vind(oper1) + this.vind(oper2);
  },
};

const OpMul = {
  opcode: 2,
  oplen: 4,
  exec: function(loc) {
    const oper1 = this.ram[loc + 1];
    const oper2 = this.ram[loc + 2];
    const oper3 = this.ram[loc + 3];
    this.ram[oper3] = this.vind(oper1) * this.vind(oper2);
  },
};

const OpInput = {
  opcode: 3,
  oplen: 2,
  exec: async function(loc) {
    const [val] = await once(inputEvents, 'input');
    const oper1 = this.ram[loc + 1];
    this.ram[oper1] = val;
  },
};

const OpOutput = {
  opcode: 4,
  oplen: 2,
  exec: function(loc) {
    const oper1 = this.ram[loc + 1];
    console.log(this.vind(oper1));
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
      this.#opcodes[op.opcode] = op;
    });
  }

  dumpMemory() {
    console.log(this.ram.join(','));
  }

  vind(i) {
    return this.ram[i];
  }

  async process() {
    while (true) {
      const op = this.ram[this.#pc];

      if (op === 99) {
        break;
      }

      const opC = this.#opcodes[op];
      if (!opC) {
        throw new Error(`Unrecognised opcode ${this.#pc}: ${op}`);
      }
      await opC.exec.call(this, this.#pc);
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
