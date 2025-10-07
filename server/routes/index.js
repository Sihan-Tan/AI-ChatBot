const express = require('express');
const router = express.Router();
const { getWeather } = require('../utils/weatherHandler');
const { translate } = require('../utils/translateHandler');
const { callLLM } = require('../utils/llm');
const toolList = require('../utils/tools');

// {role: '', content: ''}
const conversations = [];

const toolsMap = {
  getWeather,
  translate,
};

/**
 * 处理用户问题的 API 端点
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
router.post('/ask', async function (req, res, next) {
  const question = req.body.question || '';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const messages = [
    ...conversations,
    {
      role: 'user',
      content: question,
    },
  ];

  try {
    const response = await callLLM(messages, toolList, (chunk) => {
      res.write(`${JSON.stringify({ response: chunk })}\n`);
    });
    if (response.tool_calls) {
      // 需要调用工具
      const toolResults = [];
      for (const toolCall of response.tool_calls) {
        try {
          const { name, arguments } = toolCall.function;
          const args = JSON.parse(arguments);
          if (toolsMap[name]) {
            const result = await toolsMap[name](args);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: result,
            });
          } else {
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: `未知工具调用${name}`,
            });
          }
        } catch (error) {
          console.error('工具调用失败： ', error);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: `工具调用失败${error.message}`,
          });
        }
      }

      messages.push(
        {
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls,
        },
        ...toolResults
      );

      const finalResponse = await callLLM(messages, toolList, (chunk) => {
        res.write(`${JSON.stringify({ response: chunk })}\n`);
      });
      console.log('final: ', finalResponse);
      // 同步工具调用结果
      conversations.push(
        {
          role: 'user',
          content: 'question',
        },
        {
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls,
        },
        ...toolResults,
        {
          role: 'assistant',
          content: finalResponse,
        }
      );
    } else {
      conversations.push([
        { role: 'user', content: question },
        { role: 'assistant', content: response },
      ]);
    }
    if (conversations.length > 20) {
      conversations.splice(0, conversations.length - 20);
    }
  } catch (err) {
    console.error(err);
  }

  res.end();
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
