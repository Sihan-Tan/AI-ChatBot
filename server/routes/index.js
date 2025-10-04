const express = require('express');
const router = express.Router();
const { getWeather } = require('../utils/weatherHandler');
const { translate } = require('../utils/translateHandler');
const { buildFunctionCallPrompt, buildAnswerPrompt } = require('../utils/promptTemplate');
const { callLLM, callLLMStream } = require('../utils/llm');

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

  // 判断是否需要调用工具
  const funCallPrompt = buildFunctionCallPrompt(question);
  const conversationList = [
    ...conversations,
    {
      role: 'user',
      content: funCallPrompt,
    },
  ];
  const funCallResult = await callLLM(conversationList);
  console.log('funCallResult: ', funCallResult);
  let finalResponse = '';

  if (funCallResult.trim() === '无函数调用') {
    const prompt = [
      ...conversations,
      {
        role: 'user',
        content: question,
      },
    ];
    finalResponse = await callLLMStream(prompt, (chunk) => {
      res.write(`${JSON.stringify({ response: chunk })}\n`);
    });
  } else {
    // 需要调用工具
    try {
      const toolCalls = JSON.parse(funCallResult);
      const toolsResult = [];
      for (const tool of toolCalls) {
        const { function: funcName, args } = tool;
        if (toolsMap[funcName]) {
          try {
            const result = await toolsMap[funcName](args);
            toolsResult.push({
              function: funcName,
              args,
              result,
            });
          } catch (err) {
            console.error(`${funcName}工具调用失败`, err);
            toolsResult.push({
              function: funcName,
              args,
              result: `${funcName}工具调用失败`,
            });
          }
        } else {
          console.error(`${funcName}工具不存在,调用失败`);
          toolsResult.push({
            function: funcName,
            args,
            result: `${funcName}工具不存在,调用失败`,
          });
        }
      }
      const answerPrompt = buildAnswerPrompt(question, toolsResult);
      const prompt = [
        ...conversations,
        {
          role: 'user',
          content: answerPrompt,
        },
      ];
      finalResponse = await callLLMStream(prompt, (chunk) => {
        res.write(`${JSON.stringify({ response: chunk })}\n`);
      });
    } catch (err) {
      console.error(`解析工具失败: `, err);
    }
  }
  // 记录到历史记录
  conversations.push(
    {
      role: 'user',
      content: question,
    },
    {
      role: 'assistant',
      content: finalResponse,
    }
  );

  if (conversations.length > 20) {
    conversations.splice(0, conversations.length - 20);
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
