process.stdin.setEncoding('utf8');

let bufferedInput = '';
const ram = [];

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

process.stdin.on('readable', () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    parseIntoRam(chunk);
  }
});

process.stdin.on('end', () => {
  parseIntoRam('', true);
  console.log('Read all input');
  console.dir(ram);

  console.log("\nStarting processing...\n");
  const cpu = new Intputer();
  cpu.process();
});

function vind(i) {
  return ram[i];
}

function opAdd(loc) {
  const oper1 = ram[loc + 1];
  const oper2 = ram[loc + 2];
  const oper3 = ram[loc + 3];
  ram[oper3] = vind(oper1) + vind(oper2);
}

function opMul(loc) {
  const oper1 = ram[loc + 1];
  const oper2 = ram[loc + 2];
  const oper3 = ram[loc + 3];
  ram[oper3] = vind(oper1) * vind(oper2);
}

class Intputer {
  #pc = 0;

  #opcodes = {
    1: opAdd,
    2: opMul,
  };

  process() {
    // 2a specific adjustments
    ram[1] = 12;
    ram[2] = 2;

    while (true) {
      const op = ram[this.#pc];

      if (op === 99) {
        break;
      }

      const opF = this.#opcodes[op];
      if (!opF) {
        throw new Error(`Unrecognised opcode ${this.#pc}: ${op}`);
      }
      opF(this.#pc);
      this.#pc += 4;
    }

    console.log('Halted');
    console.dir(ram);
  }

}
