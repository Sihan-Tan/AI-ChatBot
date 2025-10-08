import { callDeepseek } from './llm.js';
/**
 *
 * @param {*} input 用户输入
 * @param {*} messages 会话历史
 * @param {*} tools 工具箱
 * @param {*} mcp
 * @returns
 */
export async function processQuery(input, messages, tools, mcp) {
  try {
    messages.push({
      role: 'user',
      content: input,
    });
    const message = await callDeepseek(messages, tools);
    console.info('message --- ', message);
    // 加入会话历史
    messages.push(message);

    if (message.tool_calls?.length > 0) {
      // 需要调用工具
      for (const call of message.tool_calls) {
        let args = call.function.arguments;
        args = args && JSON.parse(call.function.arguments);
        if (!args) {
          continue;
        }
        const result = await mcp.callTool({
          name: call.function.name,
          arguments: args,
        });
        const { content: resContent } = result;
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: typeof resContent === 'string' ? resContent : JSON.stringify(resContent),
        });
      }
      const final = await callDeepseek(messages, tools);
      messages.push(final);
      return final.content;
    }

    return message.content;
  } catch (err) {
    console.error(`处理消息时出错，错误信息为：${err.message}`);
  }
}
