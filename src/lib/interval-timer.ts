const WORKER_SOURCE = `
let timer
onmessage = (event) => {
  clearInterval(timer)
  if (event.data > 0) timer = setInterval(() => postMessage(0), event.data)
}
`

/**
 * 周期定时器。优先在 Web Worker 中计时：页面切到后台时主线程的 setInterval
 * 会被节流到 1 秒甚至 1 分钟一次，而 Worker 中的定时器基本不受影响。
 * 返回停止函数。
 */
export function startInterval(intervalMs: number, callback: () => void): () => void {
  try {
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }))
    const worker = new Worker(url)
    URL.revokeObjectURL(url)
    worker.onmessage = callback
    worker.postMessage(intervalMs)
    return () => worker.terminate()
  } catch {
    const timer = setInterval(callback, intervalMs)
    return () => clearInterval(timer)
  }
}
