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

async function callLLM({ prompt, stream = false, callback }) {
  // 尝试连接到 Ollama 服务
  const response = await fetchWithTimeout(LLM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      prompt,
      stream, // 是否开启流式，暂时先关闭
    }),
  });
  if (!response.ok) {
    throw new Error(`模型请求失败: ${response.status} : ${response.statusText}`);
  }

  // 非流式
  if (!stream) {
    const data = await response.json();
    return data.response;
  }

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
          callback?.(data.response);
        }
      } catch (e) {
        console.error('JSON解析失败: ', e.message);
      }
    }
  }
  return fullResponse;
}

module.exports = {
  callLLM: (prompt) => callLLM({ prompt }),
  callLLMStream: (prompt, callback) =>
    callLLM({
      prompt,
      stream: true,
      callback,
    }),
};
