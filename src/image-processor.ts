import fs from "node:fs/promises";
import path from "node:path";
import { parentPort, workerData } from "node:worker_threads";
import sharp from "sharp";

// 1. Better Typing for Worker Data
interface WorkerPayload {
  input: string;
  output: string;
  fileName: string;
  quality: string;
}

const { input, output, fileName, quality } = workerData as WorkerPayload;

// 2. Fix: Correctly parse quality (The original RegExp was invalid)
const parsedQuality = parseInt(quality, 10);
const qualityArg =
  !isNaN(parsedQuality) && parsedQuality > 0 && parsedQuality <= 100
    ? parsedQuality
    : 80;

async function ensureDirectory(dirPath: string): Promise<void> {
  // 3. Optimization: mkdir with recursive is idempotent; no need to check access first
  await fs.mkdir(dirPath, { recursive: true });
}

async function compressImage(): Promise<void> {
  try {
    await ensureDirectory(output);

    // Validate input file exists
    try {
      await fs.access(input);
    } catch {
      throw new Error(`Input file not found: ${input}`);
    }

    const { name } = path.parse(fileName);
    const outputFileName = `${name}.webp`;
    const outputFilePath = path.join(output, outputFileName);

    // 4. Fix: Sharp Configuration
    // Removed 'lossless: true' because it conflicts with 'quality'.
    // If a user sets quality=50, they want lossy compression to save space.
    const result = await sharp(input)
      .webp({
        quality: qualityArg,
        effort: 4, // Trade-off between compression speed and size (0-6)
      })
      .toFile(outputFilePath);

    const originalStats = await fs.stat(input);

    const savedBytes = originalStats.size - result.size;

    // Convert bytes to Megabytes (1 MB = 1024 * 1024 bytes)
    const savedMB = (savedBytes / (1024 * 1024)).toFixed(2);
    const originalSize = (originalStats.size / (1024 * 1024)).toFixed(2);
    const currentSize = (result.size / (1024 * 1024)).toFixed(2);

    parentPort?.postMessage({
      status: "completed",
      data: {
        size: result.size,
        width: result.width,
        height: result.height,
        inputFile: fileName,
        outputFile: outputFileName,
        originalSize,
        currentSize,
        savedMB: `${savedMB} MB`,
      },
    });
  } catch (err) {
    const error = err as Error;
    parentPort?.postMessage({
      status: "error",
      err: {
        message: error.message,
        stack: error.stack,
        fileName,
        type: error.constructor.name,
      },
    });
  }
}

parentPort?.on("message", (message) => {
  if (message.type === "compress") {
    compressImage();
  }
});

// Global error handlers
process.on("uncaughtException", (err) => {
  parentPort?.postMessage({
    status: "error",
    err: {
      message: `Uncaught exception: ${err.message}`,
      stack: err.stack,
      fileName,
    },
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  parentPort?.postMessage({
    status: "error",
    err: {
      message: `Unhandled rejection: ${String(reason)}`,
      fileName,
    },
  });
  process.exit(1);
});
