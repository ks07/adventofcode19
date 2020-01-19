const fs = require('fs');

const Intputer = require('./intcode.js');

Intputer.loadRamFromStream(fs.createReadStream('5_input'), (ram) => {
  console.error("\nStarting processing...");
  const cpu = new Intputer(ram);
  cpu.dumpMemory();
  cpu.process();
});
