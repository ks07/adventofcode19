loadRamFromStream(process.stdin, (ram) => {
  console.error("\nStarting processing...");
  const cpu = new Intputer(ram);
  cpu.process();
});

function loadRamFromStream(inStream, cb) {
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

function opAdd(loc) {
  const oper1 = this.ram[loc + 1];
  const oper2 = this.ram[loc + 2];
  const oper3 = this.ram[loc + 3];
  this.ram[oper3] = this.vind(oper1) + this.vind(oper2);
}

function opMul(loc) {
  const oper1 = this.ram[loc + 1];
  const oper2 = this.ram[loc + 2];
  const oper3 = this.ram[loc + 3];
  this.ram[oper3] = this.vind(oper1) * this.vind(oper2);
}

class Intputer {
  #pc = 0;

  #opcodes = {
    1: opAdd,
    2: opMul,
  };

  constructor(ram) {
    this.ram = ram;
  }

  dumpMemory() {
    console.log(this.ram.join(','));
  }

  vind(i) {
    return this.ram[i];
  }

  process() {
    // 2a specific adjustments
    this.ram[1] = 12;
    this.ram[2] = 2;

    while (true) {
      const op = this.ram[this.#pc];

      if (op === 99) {
        break;
      }

      const opF = this.#opcodes[op];
      if (!opF) {
        throw new Error(`Unrecognised opcode ${this.#pc}: ${op}`);
      }
      opF.call(this, this.#pc);
      this.#pc += 4;
    }

    console.error('Halted');
    this.dumpMemory();
  }

}
