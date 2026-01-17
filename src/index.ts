#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import { v4 as uuidV4 } from "uuid";

/**
 * Constants
 */
const MAX_WORKERS = Math.max(1, os.cpus().length - 2);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const homeDir = os.homedir();
const acceptableArgs = ["--input", "--output", "--quality", "--help"];
const workerFileName = `image-processor${path.extname(__filename)}`;
const workerPath = path.join(__dirname, workerFileName);

const args = process.argv.slice(2); // Use slice instead of splice

const filteredArgs = args.filter((p) => {
  const [key] = p.split("=");
  return acceptableArgs.includes(key);
});

if (filteredArgs.length === 1) {
  console.log(
    `
    Usage: compressts [options]

Description:
  A multi-threaded image batch processor. Reads images from a source directory 
  (relative to user home), processes them using worker threads, and saves 
  them to an output directory.

Options:
  --input=<path>     (Required) Name of the folder containing source images. 
                     NOTE: This path is relative to your Home Directory.
                     Supported formats: .jpg, .jpeg, .png, .webp

  --output=<path>    (Required) Destination path for processed images. 
                     Can be an absolute path or relative to your Home Directory.

  --quality=<number> (Optional) The quality of the output image (0-100).
                     Default: defined by processor if omitted.

  --help             Show this help message.

Examples:
  # Process images from MyImages to MyImages/Compressed
  node image-processor.js --input=MyImages --output=MyImages/Compressed

  # Process with specific quality
  node image-processor.js --input=RawPhotos --output=/tmp/Processed --quality=80

  # Relative path to users like /home/users/Desktop pass Desktop otherwise pass /tmp/Processed
    `,
  );
  process.exit(0);
}

if (filteredArgs.length < 2) {
  throw new Error("Both --input and --output paths are required");
}

const workers: Map<
  string,
  { worker: Worker; status: "pending" | "completed"; workerId: string }
> = new Map();

const keyValues = filteredArgs.map((arg) => {
  const [key, value] = arg.split("=");
  return { key, value };
});

const input = keyValues.find((k) => k.key === "--input")?.value;
const output = keyValues.find((k) => k.key === "--output")?.value;
const quality = keyValues.find((k) => k.key === "--quality")?.value ?? "";

if (!input || !output) throw new Error("Input or Output is missing");
if (quality && Number.isNaN(quality)) throw new Error("Quality Must be number");

const inputPath = input.startsWith("/") ? input : path.join(homeDir, input);
const outputPath = output.startsWith("/") ? output : path.join(homeDir, output);

// Ensure output directory exists

const allImages = fs.readdirSync(inputPath).filter((file) => {
  const ext = path.extname(file);
  return ext && [".jpg", ".jpeg", ".png", ".webp"].includes(ext.toLowerCase());
});

// Create workers
allImages.forEach((fileName) => {
  console.log("Processing:", fileName);

  const workerId = uuidV4();
  const worker = new Worker(workerPath, {
    // Use .js file
    execArgv: process.execArgv,
    workerData: {
      input: path.join(inputPath, fileName),
      output: outputPath,
      fileName,
      quality,
    },
  });

  workers.set(workerId, {
    status: "pending",
    worker,
    workerId,
  });

  // Register event listeners immediately
  worker.on("message", (value) => {
    if (value.status === "error") {
      console.error(`Error processing ${fileName}:`, value.err);
    }

    if (value.status === "completed") {
      console.log("============================\n");
      console.log(
        `Image processing completed: ${fileName}`,
        `WorkerId: ${workerId}`,
        `ThreadId: ${worker.threadId}`,
      );
      console.log("Result: ", value.data);
      console.log("============================\n\n");
      workers.get(workerId)!.status = "completed";
    }

    worker.terminate();
    workers.delete(workerId);
  });

  worker.on("error", (err) => {
    console.error(`Worker error for ${fileName}:`, err);
    worker.terminate();
    workers.delete(workerId);
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Worker stopped with exit code ${code} for ${fileName}`);
    }
  });
});

const workerQueue = Array.from(workers.values()).filter(
  (c) => c.status === "pending",
);
let active = 0;

function runNext() {
  while (workerQueue.length > 0 && active < MAX_WORKERS) {
    active++;
    const job = workerQueue.shift();

    if (job) {
      runWorker(job.worker).finally(() => {
        active--;
        runNext();
      });
    }
  }
}

async function runWorker(worker: Worker): Promise<void> {
  worker.postMessage({
    type: "compress",
  });
}

// Start processing
runNext();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down workers...");
  workers.forEach(({ worker }) => {
    worker.terminate();
  });
  process.exit(0);
});
