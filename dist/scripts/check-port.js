"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const port_utils_1 = require("../utils/port-utils");
const main = async () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("Please provide a port number to check");
        process.exit(1);
    }
    const port = parseInt(args[0], 10);
    if (isNaN(port)) {
        console.error("Port must be a number");
        process.exit(1);
    }
    try {
        const available = await (0, port_utils_1.isPortAvailable)(port);
        if (available) {
            console.log(`✅ Port ${port} is available`);
            process.exit(0);
        }
        else {
            console.log(`❌ Port ${port} is in use`);
            process.exit(1);
        }
    }
    catch (error) {
        console.error(`Error checking port ${port}:`, error);
        process.exit(1);
    }
};
main();
