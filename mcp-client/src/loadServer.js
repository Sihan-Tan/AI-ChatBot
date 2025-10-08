import { readFile } from 'fs/promises';
import path from 'path';

/**
 * 负责从 MCP Server 配置文件中加载所有得 MCP Server
 * @returns
 */
export async function loadConfig() {
  const configPath = path.resolve(process.cwd(), '.mcpconfig.json');
  const raw = await readFile(configPath, 'utf8');

  if (!raw) {
    throw new Error('.mcpconfig.json 文件缺失');
  }

  const config = JSON.parse(raw);
  return config;
}
