interface SaveFilePickerOptions {
  suggestedName?: string
  types?: { description?: string; accept: Record<string, string[]> }[]
}

declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>
  }
}

export const isFileSinkSupported = typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function'

const FLUSH_INTERVAL_MS = 1000

/**
 * 持续写入本地文件（File System Access API）。
 * 写入按秒批量进行；注意 Chromium 只有在 close() 后才会把内容真正落盘。
 */
export class FileSink {
  bytesWritten = 0
  private buffer: string[] = []
  private timer: ReturnType<typeof setInterval>
  private writing: Promise<void> = Promise.resolve()
  private readonly encoder = new TextEncoder()

  readonly name: string
  private readonly writable: FileSystemWritableFileStream

  private constructor(name: string, writable: FileSystemWritableFileStream) {
    this.name = name
    this.writable = writable
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS)
  }

  /** 弹出保存对话框；用户取消时返回 null */
  static async pick(suggestedName: string): Promise<FileSink | null> {
    if (!window.showSaveFilePicker) throw new Error('File System Access API is not supported')
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'Log', accept: { 'text/plain': ['.log', '.txt'] } }],
      })
      return new FileSink(handle.name, await handle.createWritable())
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null
      throw error
    }
  }

  write(line: string) {
    this.buffer.push(line)
  }

  private flush() {
    if (this.buffer.length === 0) return this.writing
    const chunk = this.buffer.join('\n') + '\n'
    this.buffer = []
    this.bytesWritten += this.encoder.encode(chunk).length
    this.writing = this.writing.then(() => this.writable.write(chunk))
    return this.writing
  }

  async close() {
    clearInterval(this.timer)
    await this.flush()
    await this.writable.close()
  }
}
