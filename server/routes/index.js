var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/**
 * 处理用户问题的 API 端点
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
router.post('/ask', async function (req, res, next) {
  try {
    const requestion = req.body.question || '';
    
    // 如果没有问题，返回错误
    if (!requestion.trim()) {
      return res.status(400).json({
        error: '问题不能为空'
      });
    }

    const prompt = `
      你是一个中文智能助手,请使用中文回答用户的问题.
      问题: ${requestion}
    `;

    // 尝试连接到 Ollama 服务
    const response = await fetch("http://127.0.0.1:11434/api/generate",{
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        model: "llama3",
        prompt,
        stream: true // 是否开启流式，暂时先关闭
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API 响应错误: ${response.status}`);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8')
    while(true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value, {stream: true})
      const lines = chunk.split('\n').filter((line) => line.trim())
      for(const line of lines) {
        try{
          const data = JSON.parse(line);
          if (data.response) {
            res.write(`${JSON.stringify({response: data.response})}\n`)
          }
        }catch(e) {
          console.error('JSON解析失败: ', e.message)
        }
      }
    }
    res.end();

  } catch (error) {
    console.error('处理请求时出错:', error);
    
    // 如果是连接错误，返回友好的错误信息
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'AI 服务暂时不可用，请确保 Ollama 服务正在运行',
        details: '请先启动 Ollama 服务并确保 llama3 模型已安装'
      });
    }
    
    // 其他错误
    res.status(500).json({
      error: '服务器内部错误',
      details: error.message
    });
  }
});

module.exports = router;
