var express = require('express');
var router = express.Router();

// {role: '', content: ''}
const conversations = [];

/**
 * 处理用户问题的 API 端点
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
router.post('/ask', async function (req, res, next) {
  try {
    const question = req.body.question || '';

    // 如果没有问题，返回错误
    if (!question.trim()) {
      return res.status(400).json({
        error: '问题不能为空',
      });
    }

    const prompt = [
      '你是一个中文智能助手,请使用中文回答用户的问题',
      ...conversations.map((item) => `${item.role === 'user' ? '用户' : '助手'} : ${item.content}`),
      `用户的问题: ${question}`,
    ].join('\n');

    // 尝试连接到 Ollama 服务
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt,
        stream: true, // 是否开启流式，暂时先关闭
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API 响应错误: ${response.status}`);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim());
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            fullResponse += data.response;
            res.write(`${JSON.stringify({ response: data.response })}\n`);
          }
        } catch (e) {
          console.error('JSON解析失败: ', e.message);
        }
      }
    }
    // 记录到数组
    conversations.push(
      {
        role: 'user',
        content: question,
      },
      {
        role: 'assistant',
        content: fullResponse,
      }
    );
    // 先做一个简单裁剪, 正常应该是把 裁剪的记录做总结
    if (conversations.length > 20) {
      conversations.splice(0, conversations.length - 20);
    }
    res.end();
  } catch (error) {
    console.error('处理请求时出错:', error);

    // 如果是连接错误，返回友好的错误信息
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'AI 服务暂时不可用，请确保 Ollama 服务正在运行',
        details: '请先启动 Ollama 服务并确保 llama3 模型已安装',
      });
    }

    // 其他错误
    res.status(500).json({
      error: '服务器内部错误',
      details: error.message,
    });
  }
});

router.get('/history', function (req, res) {
  res.json({
    conversations,
  });
});

router.post('/clean', function (req, res) {
  conversations.length = 0;
  res.json({
    message: '对话历史已经清空',
  });
});

module.exports = router;
