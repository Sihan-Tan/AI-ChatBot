// 设置响应头的方法
export function setCommonHeaders(res) {
  // 允许哪些域（Origin）可以访问该服务
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 允许客户端在跨域请求中使用哪些 HTTP 方法
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  // 指定客户端请求时允许携带的自定义请求头
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  // 允许前端 JS 访问响应中的哪些自定义头
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
}
