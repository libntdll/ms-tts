import { Request, Response } from 'express'
import { retry } from '../retry'
import { service, FORMAT_CONTENT_TYPE } from '../service/edge'

module.exports = async (request: Request, response: Response) => {
  DEBUG && console.debug(`请求正文：${request.body}`)
  let voiceName = request.query['voiceName'] ?? 'zh-CN-YunxiNeural'
  let format = request.query['voiceFormat'] ?? 'audio-24khz-48kbitrate-mono-mp3'
  let text = request.query["text"] ?? ""
  let rate = request.query["rate"] ?? "0%"
  let pitch = request.query["pitch"] ?? "0%"
  let token = process.env.TOKEN
  if (token) {
    let authorization = request.headers['authorization']
    if (authorization != `Bearer ${token}`) {
      DEBUG && console.error('无效的TOKEN')
      response.status(401).json('无效的TOKEN')
      return
    }
  }

  try {
    // 处理 format 参数
    if (Array.isArray(format)) {
      throw `无效的音频格式：${format}`
    }
    format = String(format).trim()
    if (!FORMAT_CONTENT_TYPE.has(format)) {
      throw `无效的音频格式：${format}`
    }

    /*
    微软关于rate的说明：https://learn.microsoft.com/zh-cn/azure/ai-services/speech-service/speech-synthesis-markup-voice
    rate 指示文本的讲出速率。 可在字词或句子层面应用语速。速率变化应为原始音频的 0.5 到 2 倍。
    可将 rate 表述为：
      - 以相对数字表示：以充当默认值乘数的数字表示。 默认值为1，表示原始速率。
        例如，如果值为 1，则原始速率不会变化。 如果值为 0.5，则速率为原始速率的一半。 如果值为 2，则速率为原始速率的 2 倍。
      - 以百分比表示：以“+”（可选）或“-”开头且后跟“%”的数字表示，指示相对变化。默认值为0%，表示原始速率。
        例如 <prosody rate="50%">some text</prosody> 或 <prosody rate="-50%">some text</prosody>。
    */
    // 处理 rate 参数
    if (typeof rate !== 'string' || rate.trim() === '') { // 非字符串或空字符串，设置为默认值
      rate = '0%'
    } else {
      let rateValue = parseFloat(rate);
      if (isNaN(rateValue)) {
        rate = '0%'
      } else if (rate.includes('%')) { // 百分比的情况，取值范围为-50%到100%
        if (rateValue < -50 || rateValue > 100) {
          rate = '0%';
        }
      } else { // 相对数字的情况，取值范围为0.5到2
        if (rateValue < 0.5 || rateValue > 2) {
          rate = '0%';
        } else {
          rate = (rateValue * 100 - 100) + '%';
        }
      }
    }

    /*
    pitch 指示文本的基线音节。可在句子层面应用音节的变化。音调变化应为原始音频的 0.5 到 1.5 倍。
    可将音调表述为：
      - 绝对值：
          - 以某个数字后接“Hz”（赫兹）表示。 
            例如 <prosody pitch="600Hz">some text</prosody>。
      - 相对值：
          - 以相对数字表示：以前面带有“+”或“-”且后接“Hz”或“st”（用于指定音节的变化量）的数字表示。 
            例如 <prosody pitch="+80Hz">some text</prosody> 或 <prosody pitch="-2st">some text</prosody>。 “st”表示变化单位为半音，即，标准全音阶中的半调（半步）。
          - 以百分比表示：以“+”（可选）或“-”开头且后跟“%”的数字表示，指示相对变化。0% 表示原始基线音节。
            例如 <prosody pitch="50%">some text</prosody> 或 <prosody pitch="-50%">some text</prosody>。
    */
    // 处理 pitch 参数
    if (typeof pitch !== 'string' || pitch.trim() === '') {
      pitch = '0%';
    } else if (!pitch.includes('Hz') && !pitch.includes('st') && !pitch.includes('%')) {
      let pitchValue = parseFloat(pitch);
      if (isNaN(pitchValue)) {
        pitchValue = 0;
      } else if (pitchValue < -0.5) {
        pitchValue = -0.5;
      } else if (pitchValue > 0.5) {
        pitchValue = 0.5;
      }
      pitch = (pitchValue * 100) + '%';
    }

    let ssml =
      `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="zh-CN">` +
      `<voice name="${voiceName}">` +
      `<prosody rate="${rate}" pitch="${pitch}">` +
      text +
      `</prosody>` +
      `</voice>` +
      `</speak>`
    let result = await retry(
      async () => {
        let result = await service.convert(ssml, format as string)
        return result
      },
      3,
      (index, error) => {
        DEBUG && console.warn(`第${index}次转换失败：${error}`)
      },
      '服务器多次尝试后转换失败',
    )
    response.sendDate = true
    response
      .status(200)
      .setHeader('Content-Type', FORMAT_CONTENT_TYPE.get(format))
    response.end(result)
  } catch (error) {
    DEBUG && console.error(`发生错误, ${error.message}`)
    response.status(503).json(error)
  }
}
