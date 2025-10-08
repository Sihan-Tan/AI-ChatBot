import { z } from 'zod';
export const sum = ({ a, b }) => {
  return {
    content: [
      {
        type: 'text',
        text: `两个数的和为${a + b}`,
      },
    ],
  };
};

export const sumDescription = {
  title: '两数求和',
  description: '得到两个数的和',
  inputSchema: {
    a: z.number().describe('第一个数'),
    b: z.number().describe('第二个数'),
  },
};
