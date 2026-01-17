# NexPress - TypeScript Image Batch Processor CLI

A high-performance, multi-threaded command-line tool built with Node.js and TypeScript. It converts and compresses batches of images into efficient **WebP** format using worker threads for maximum speed.

<div align="center">
  <img src="https://github.com/codernex/nexpress/blob/main/screenshot.png" alt="NexPress CLI Demo" width="800" />
  <p><em>Proof of Work: Reduced a 7.4MB raw image to just 0.19MB (~97% reduction)</em></p>
</div>

## 🚀 Features

- **Multi-threaded Processing:** Uses Node.js `worker_threads` to process images in parallel, utilizing all available CPU cores.
- **Format Conversion:** Automatically converts `.jpg`, `.jpeg`, and `.png` files to optimized `.webp`.
- **Smart Path Handling:** Supports both absolute system paths and paths relative to your home directory.
- **Space Savings:** Calculates and displays the amount of disk space saved per image in MB.
- **Custom Quality:** User-definable compression quality (1-100).
- **Robust Error Handling:** Graceful shutdowns and detailed error logging.

## 📦 Installation

You can use NexPress in three ways:

### 1. Global Installation (Recommended)

This installs the `@codernex/nexpress` command system-wide.

```bash
npm install -g @codernex/nexpress

```

### 2. Run Once with npx

Use it immediately without installing.

```bash
npx @codernex/nexpress --input=Desktop/photos --output=Desktop/compressed

```

### 3. Local Development / Building from Source

```bash
# Clone the repository
git clone https://github.com/codernex/nexpress
cd nexpress

# Install dependencies
npm install

# Build the project
npm run build

# Link globally for testing
npm link

```

## 🛠 Usage

If installed globally or linked, simply run `nexpress`:

```bash
nexpress --input=<path> --output=<path> [options]

```

### 📂 Path Flexibility

NexPress is smart about file paths. You can provide:

1. **Relative Paths (from User Home):**
   If you type `Desktop/images`, the tool looks in `~/Desktop/images` (Linux/Mac) or `C:\Users\You\Desktop\images` (Windows).

```bash
nexpress --input=Desktop/raw --output=Desktop/processed

```

2. **Absolute Paths:**
   You can also provide the full system path.

```bash
nexpress --input=/home/user/Downloads/pics --output=/var/www/html/assets

```

### Options

| Option      | Required | Description                                        | Default |
| ----------- | -------- | -------------------------------------------------- | ------- |
| `--input`   | ✅       | Source folder path (Absolute or relative to Home). | N/A     |
| `--output`  | ✅       | Destination folder path.                           | N/A     |
| `--quality` | ❌       | Compression quality (1-100).                       | `80`    |
| `--help`    | ❌       | Displays the help menu.                            | N/A     |

### Examples

**Standard Compression (Default Quality: 80)**

```bash
nexpress --input=Photos --output=CompressedPhotos

```

**High Compression (Maximum Space Saving)**

```bash
nexpress --input=Desktop/Wallpapers --output=Desktop/WebP_Small --quality=50

```

**High Quality (Near Lossless)**

```bash
nexpress --input=/mnt/data/raw --output=/mnt/data/optimized --quality=95

```

## 💻 Development

If you want to contribute or modify the code:

1. **Clone and Install:**

```bash
git clone https://github.com/codernex/nexpress
npm install

```

2. **Run in Development Mode:**
   You can run the script directly using `ts-node`.

```bash
# Run directly without building
npx ts-node src/index.ts --input=TestIn --output=TestOut

```

## 🏗 Architecture

The tool uses a **Main Thread** -> **Worker Pool** architecture:

1. **Main Thread:** Scans the input directory and creates a queue of image processing jobs.
2. **Worker Threads:** Each CPU core gets a worker. The main thread distributes jobs to workers dynamically.
3. **Sharp:** Inside the worker, the `sharp` library handles the actual image buffer manipulation and WebP conversion.

## 📝 License

This project is licensed under the MIT License.
