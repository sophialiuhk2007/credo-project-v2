import * as net from "net";

/**
 * Checks if a port is available
 * @param port The port to check
 * @returns A promise that resolves to true if the port is available
 */
export const isPortAvailable = (port: number): Promise<boolean> => {
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

/**
 * Finds an available port starting from the given port
 * @param startPort The port to start checking from
 * @param maxAttempts Maximum number of ports to check
 * @returns A promise that resolves to an available port
 */
export const findAvailablePort = async (
  startPort: number,
  maxAttempts = 50
): Promise<number> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    const isAvailable = await isPortAvailable(port);

    if (isAvailable) {
      return port;
    }
  }

  throw new Error(
    `Could not find an available port after ${maxAttempts} attempts starting from ${startPort}`
  );
};
