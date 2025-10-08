import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'weather-server',
  version: '1.0.0',
});

server.registerTool(
  'get_weather',
  {
    title: '天气查询工具',
    description: '根据城市名称查询当前天气',
    inputSchema: {
      location: z.string().describe('城市名称，例如 Hangzhou， 上海'),
    },
  },
  async ({ location }) => {
    console.info('调用了MCP Server 上的 get_weather 工具');
    return {
      content: [
        {
          type: 'text',
          text: `📍 ${location} 天气晴，气温 26℃ ~ 32℃`,
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
server.connect(transport);
