import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { getWeather, getWeatherDescription } from './utils/weatherHandler.js';
import { createFile, createFileDescription } from './utils/createFile.js';
import { sum, sumDescription } from './utils/sum.js';
import { translate, translateDescription } from './utils/translateHandler.js';

dotenv.config();
const server = new McpServer({
  name: 'my mcp server',
  version: '0.1.0',
});

server.registerTool('sum', sumDescription, sum);

server.registerTool('createFile', createFileDescription, createFile);

server.registerTool('getWeather', getWeatherDescription, getWeather);

server.registerTool('translate', translateDescription, translate);

const transport = new StdioServerTransport();
server.connect(transport);
