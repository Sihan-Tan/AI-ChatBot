import express from 'express';
import { setCommonHeaders } from './utils.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { createMCPServer } from './mcp-server.js';

const app = express();
const transports = {};

app.use(express.json());

app.get('/mcp', async (req, res) => {
  setCommonHeaders(res);
  res.status(405).set('Allow', 'POST').send('当前服务器不支持GET方法，仅支持POST方法');
});

app.post('/mcp', async (req, res) => {
  setCommonHeaders(res);

  try {
    const body = req.body;
    const method = body?.body;
    const sId = req.headers['mcp-session-id'];
    const transport = sId && transports[sId];

    if (!transport && method === 'initialize') {
      //初始化需要创建新连接
      const newTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      newTransport.onclose = () => {
        if (newTransport.sessionId) {
          transports.delete(newTransport.sessionId);
        }
      };

      const mcpServer = createMCPServer();
      await mcpServer.connect(newTransport);
      await newTransport.handleRequest(req, res, body);
      if (newTransport.sessionId) {
        transports[newTransport.sessionId] = newTransport;
      }
      return;
    }

    if (transport) {
      await transport.handleRequest(req, res, body);
      return;
    }

    res.status(400).json({
      error: '非法请求',
      message: '非法的 sessionId 或非初始化请求',
    });
  } catch (err) {
    console.error(`出错了 -- ${err.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP Server 运行再 http://localhost:${PORT}/mcp`);
});
