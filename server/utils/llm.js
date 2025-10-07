const LLM_ENDPOINT = process.env.LLM_ENDPOINT;
const LLM_MODEL = process.env.LLM_MODEL;
const LLM_TIMEOUT_MS = process.env.LLM_TIMEOUT_MS;

// 带超时机制的 fetch 方法
async function fetchWithTimeout(url, options = {}, timeout = LLM_TIMEOUT_MS) {
  const control = new AbortController();
  const timerId = setTimeout(() => control.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: control.signal,
    });
    clearTimeout(timerId);
    return response;
  } catch (err) {
    clearTimeout(timerId);
    if (err.name === 'AbortError') {
      throw new Error('请求超时,请稍后重试');
    }
    throw err;
  }
}

/**
 *
 * @param {*} prompt 用户的问题
 * @param {*} tools 工具的数组
 * @param {*} callback 流式回调函数
 * @returns
 */
async function callLLM({ prompt, tools = null, callback }) {
  const messages = [...prompt];
  const requestBody = {
    model: LLM_MODEL,
    messages,
    stream: true,
  };

  if (tools?.length) {
    requestBody.tools = tools;
  }

  // 尝试连接到 Ollama 服务
  const response = await fetchWithTimeout(LLM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    throw new Error(`模型请求失败: ${response.status} : ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let fullResponse = '';
  let toolCalls = []; // 用于存储需要调用的工具

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter((line) => line.trim());
    for (const line of lines) {
      // 根据deepseek流式返回
      const jsonStr = line.slice(6);
      if (jsonStr.includes('[DONE]')) {
        continue;
      }
      try {
        const data = JSON.parse(jsonStr);
        const delta = data.choices?.[0]?.delta;
        if (delta) {
          const { content, tool_calls } = delta;
          if (content) {
            fullResponse = content;
            callback?.(fullResponse);
          }
          if (tool_calls) {
            for (const toolCall of tool_calls) {
              const exisit = toolCalls.find((tc) => tc.index === toolCall.index);
              if (exisit) {
                // 说明已经存在， 可能需要合并参数
                if (toolCall.function?.name) {
                  exisit.function.name = toolCall.function.name;
                }
                if (toolCall.function?.arguments) {
                  exisit.function.arguments += toolCall.function.arguments;
                }
              } else {
                // 不存在需要推进去
                toolCalls.push({ ...toolCall });
              }
            }
          }
        }
      } catch (e) {
        console.error('JSON解析失败: ', e.message);
      }
    }
  }

  if (toolCalls?.length) {
    return {
      content: fullResponse,
      tool_calls: toolCalls,
    };
  }

  return fullResponse;
}

module.exports = {
  callLLM: (prompt, tools, callback) => callLLM({ prompt, tools, callback }),
};
