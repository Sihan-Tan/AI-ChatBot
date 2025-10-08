import { loadConfig } from './loadServer.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import readline from 'readline/promises';
import { processQuery } from './process.js';

const { server } = await loadConfig();

const mcp = new Client({
  name: 'mcp-client',
  version: '0.1.0',
});

const transport = new StdioClientTransport({
  command: 'node',
  args: [server],
});
mcp.connect(transport);

const toolsResult = await mcp.listTools();
const tools = toolsResult.tools.map((t) => {
  return {
    type: 'function',
    function: {
      name: t.name,
      title: t.title,
      description: t.description,
      parameters: t.inputSchema,
    },
  };
});

let messages = [];

const rl = readline.createInterface({
  input: process.stdin,
  putput: process.stdout,
});

console.log(`MCP Client已经成功启动，输入 quit 退出聊天，输入 clear 清除聊天历史`);

function clearMessages() {
  messages = [];
}

while (true) {
  const input = await rl.question('请输入您的问题');
  if (input.toLocaleLowerCase() === 'quit') {
    break;
  }
  if (input.toLocaleLowerCase() === 'clear') {
    clearMessages();
    console.log('聊天记录已清空。');
    continue;
  }
  const output = await processQuery(input, messages, tools, mcp);
  console.log(output, '\n'); // 终端现实回答
}

// 退出后清理
await mcp.close();
rl.close;
process.exit(0);
