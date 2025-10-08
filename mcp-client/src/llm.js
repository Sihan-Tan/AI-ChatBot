import dotenv from 'dotenv';
dotenv.config();
const { DEEPSEEK_API_KEY, LLM_MODEL, LLM_ENDPOINT } = process.env;

/**
 *
 * @param {*} messages 会话历史
 * @param {*} tools 工具箱
 * @returns
 */
export async function callDeepseek(messages, tools) {
  const res = await fetch(LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      tools,
    }),
  });
  const json = await res.json();
  return json.choices?.[0].message;
}
