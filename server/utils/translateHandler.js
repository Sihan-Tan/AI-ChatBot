// 对接百度翻译API

const crypto = require('crypto');
const ID = process.env.BAIDU_APP_ID;
const KEY = process.env.BAIDU_SECRET_KEY;
const translateUrl = 'https://fanyi-api.baidu.com/api/trans/vip/translate';

async function translate({ input }) {
  const text = input.replace(/.*翻译.*?[：:]?\s*/, '').trim();
  const salt = Date.now();
  const sign = crypto
    .createHash('md5')
    .update(ID + text + salt + KEY)
    .digest('hex');
  const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(
    text
  )}&from=zh&to=en&appid=${ID}&salt=${salt}&sign=${sign}`;

  const res = await fetch(url);
  const data = await res.json();
  console.log('远程获取翻译数据: ', data);
  if (data.trans_result?.length > 0) {
    return `翻译结果：${data.trans_result[0].dst}`;
  } else {
    return `翻译失败：${JSON.stringify(data)}`;
  }
}

module.exports = {
  translate,
};
