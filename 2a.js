const fs = require('fs');

const Intputer = require('./intcode.js');

Intputer.loadRamFromStream(fs.createReadStream('2_input'), (ram) => {
  // 2a specific adjustments
  ram[1] = 12;
  ram[2] = 2;

  console.error("\nStarting processing...");
  const cpu = new Intputer(ram);
  cpu.dumpMemory();
  cpu.process();
});
