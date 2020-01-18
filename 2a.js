const assert = require('assert').strict;
const fs = require('fs');

const Intputer = require('./intcode.js');

Intputer.loadRamFromStream(fs.createReadStream('2_input'), async (ram) => {
  // 2a specific adjustments
  ram[1] = 12;
  ram[2] = 2;

  console.error("\nStarting processing...");
  const cpu = new Intputer(ram);
  cpu.dumpMemory();
  await cpu.process();

  // Repurpose 2a as a test to ensure backwards compat
  assert.equal(cpu.ram[0], 3101878, "Intputer no longer calculates the correct 2a solution");
});
