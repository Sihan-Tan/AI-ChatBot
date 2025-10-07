// 导出工具描述
// 不同的模型 function calling格式不一致
module.exports = [
  {
    type: 'function',
    function: {
      name: 'getWeather',
      description: '获取制定城市和日期的天气信息',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称,如:北京、上海、广州',
          },
          date: {
            type: 'string',
            description: '日期，只能是：今天、明天、后天或者指定的某一天',
          },
        },
        required: ['city', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'translate',
      description: '将指定的文本从中文翻译到英文',
      parameters: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: '需要翻译的文本',
          },
        },
        required: ['input'],
      },
    },
  },
];
