"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAvailablePort = exports.isPortAvailable = void 0;
const net = __importStar(require("net"));
/**
 * Checks if a port is available
 * @param port The port to check
 * @returns A promise that resolves to true if the port is available
 */
const isPortAvailable = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => {
            resolve(false);
        });
        server.once("listening", () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
};
exports.isPortAvailable = isPortAvailable;
/**
 * Finds an available port starting from the given port
 * @param startPort The port to start checking from
 * @param maxAttempts Maximum number of ports to check
 * @returns A promise that resolves to an available port
 */
const findAvailablePort = async (startPort, maxAttempts = 50) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const port = startPort + attempt;
        const isAvailable = await (0, exports.isPortAvailable)(port);
        if (isAvailable) {
            return port;
        }
    }
    throw new Error(`Could not find an available port after ${maxAttempts} attempts starting from ${startPort}`);
};
exports.findAvailablePort = findAvailablePort;
