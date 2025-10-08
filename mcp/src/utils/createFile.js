import { z } from 'zod';
import fs from 'fs';

export function createFile({ filename, content }) {
  try {
    fs.writeFileSync(filename, content);
    return {
      content: [
        {
          type: 'text',
          text: '文件创建成功',
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: err.message || '文件创建失败',
        },
      ],
    };
  }
}

export const createFileDescription = {
  title: '创建文件',
  description: '创建一个指定内容的文件',
  inputSchema: {
    filename: z.string().describe('文件名'),
    content: z.string().describe('文件内容'),
  },
};
