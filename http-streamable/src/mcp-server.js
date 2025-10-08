import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// 工厂函数：创建 MCP Server
export const createMCPServer = () => {
  const server = new McpServer({
    name: 'http-mcp-server',
    version: '0.1.0',
  });

  server.registerTool(
    '两数之和',
    {
      title: '数字加法计算器',
      description: '计算两个数字的和',
      inputSchema: {
        num1: z.number().describe('第一个数字'),
        num2: z.number().describe('第二个数字'),
      },
    },
    async ({ num1, num2 }) => {
      return {
        content: [
          {
            type: 'text',
            text: `计算结果: ${num1} + ${num2} = ${num1 + num2}!!!`,
          },
        ],
      };
    }
  );

  return server;
};
