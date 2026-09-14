# Serial Monitor

浏览器里的串口调试器，功能对标 cutecom。基于 Web Serial API，需使用桌面版 Chrome / Edge，并通过 `localhost` 或 HTTPS 访问。

## 功能

- **连接**：Web Serial 串口；WebSocket 桥接（用于 `/dev/pts/N` 虚拟串口、TCP 串口服务器等）
- **多标签**：同时打开多个设备，刷新后恢复标签
- **按设备记住配置**：按 USB VID:PID 保存波特率、帧格式、行尾、发送/显示格式
- **热插拔**：已授权设备插拔自动刷新，断开后可自动重连
- **显示**：ANSI 颜色、`hexdump -C` 风格 Hex 视图、时间戳、收发区分颜色
- **搜索与高亮**：`Ctrl+F` 搜索（正则 / 区分大小写），关键字规则整行着色
- **发送**：历史记录（↑↓）、转义字符（`\r \n \t \e \xHH`）、Hex、定时 / 循环发送
- **控制信号**：DTR / RTS，CTS / DSR / DCD / RI 状态，Break，ESP32 复位与进入下载模式
- **日志**：导出当前内容，或持续写入本地文件（File System Access API）
- **其它**：中英文、深浅色主题、快捷键（按 `?` 查看）、PWA 可安装

## 开发

```bash
pnpm install
pnpm dev        # 开发服务器
pnpm test       # 单元测试（Vitest）
pnpm lint       # oxlint
pnpm build      # 类型检查 + 生产构建（含 Service Worker）
```

添加 Chakra UI 组件片段：`pnpm dlx @chakra-ui/cli snippet add <name> --tsx --outdir src/components/ui`

## 技术栈

React 19（React Compiler）· TypeScript 6 · Vite 8（Rolldown）· Chakra UI 3 · zustand 5 · TanStack Virtual · i18next · Vitest · vite-plugin-pwa

## 目录结构

```
src/
  features/serial/
    transport/   数据通道抽象：Web Serial / WebSocket
    engine/      会话引擎（连接、读循环、重连、定时发送、文件记录）与日志模型
    store/       偏好设置（持久化）、工作区（多标签 / 设备列表）、界面状态
    lib/         纯函数：编解码、ANSI 解析、搜索匹配、设备识别
    hooks/       会话上下文、快捷键
    components/  界面组件（terminal/ 为虚拟滚动终端，dialogs/ 为对话框）
  i18n/          多语言
  lib/           通用工具：Worker 定时器、文件写入
  components/ui/ Chakra CLI 生成的组件片段
```

## WebSocket 桥接示例

```bash
socat TCP-LISTEN:7000,reuseaddr,fork FILE:/dev/pts/3,raw,echo=0
websocat -b ws-l:127.0.0.1:8765 tcp:127.0.0.1:7000
```

然后在菜单「添加 WebSocket 连接…」中填写 `ws://127.0.0.1:8765`。
