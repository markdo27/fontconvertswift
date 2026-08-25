// @ts-ignore
import decompressCode from 'wawoff2/build/decompress_binding.js?raw';
// @ts-ignore
import compressCode from 'wawoff2/build/compress_binding.js?raw';

interface Woff2Module {
  decompress?: (buffer: Uint8Array) => Uint8Array | false;
  compress?: (buffer: Uint8Array) => Uint8Array | false;
  onRuntimeInitialized?: () => void;
}

let decompressPromise: Promise<Woff2Module> | null = null;
let compressPromise: Promise<Woff2Module> | null = null;

function initModule(code: string): Promise<Woff2Module> {
  return new Promise((resolve, reject) => {
    const mod: Woff2Module = {};
    const timeout = setTimeout(() => {
      reject(new Error('WOFF2 WebAssembly module initialization timed out.'));
    }, 10000);

    mod.onRuntimeInitialized = () => {
      clearTimeout(timeout);
      resolve(mod);
    };

    try {
      // Execute the Emscripten binding code with our module instance
      const win = typeof window !== 'undefined' ? window : {};
      const runner = new Function('Module', 'window', code);
      runner(mod, win);
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}

export async function decompressWoff2(buffer: Uint8Array): Promise<Uint8Array> {
  if (!decompressPromise) {
    decompressPromise = initModule(decompressCode);
  }
  const mod = await decompressPromise;
  if (!mod.decompress) {
    throw new Error('WOFF2 decompress function not available.');
  }

  const result = mod.decompress(buffer);
  if (!result || (typeof result === 'boolean' && result === false)) {
    throw new Error('Failed to decompress WOFF2 font: invalid or corrupted file.');
  }
  return result as Uint8Array;
}

export async function compressWoff2(buffer: Uint8Array): Promise<Uint8Array> {
  if (!compressPromise) {
    compressPromise = initModule(compressCode);
  }
  const mod = await compressPromise;
  if (!mod.compress) {
    throw new Error('WOFF2 compress function not available.');
  }

  const result = mod.compress(buffer);
  if (!result || (typeof result === 'boolean' && result === false)) {
    throw new Error('Failed to compress font to WOFF2.');
  }
  return result as Uint8Array;
}
