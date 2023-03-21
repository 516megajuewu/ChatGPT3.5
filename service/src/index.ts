import express from 'express'
import cors from 'cors'
import type { ChatContext, ChatMessage } from './chatgpt'
import { chatConfig, chatReplyProcess } from './chatgpt'
import { auth } from './middleware/auth'
import Request from './Request'
import Voice from './Voice/index'

const app = express()
const router = express.Router()
const KEY = process.env.OPENAI_API_KEY

app.use(express.static('public'))
app.use(express.json())
app.use(cors())

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

router.post('/chat-process', auth, async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')

  try {
    const { system, prompt, options = {} } = req.body as { system: string; prompt: string; options?: ChatContext }
    let firstChunk = true
    // 需要修改这种传输方式
    await chatReplyProcess(system, prompt, options, (chat: ChatMessage) => {
      res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
      firstChunk = false
    })
  }
  catch (error) {
    res.write(JSON.stringify(error))
  }
  finally {
    res.end()
  }
})

router.post('/chat', auth, async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')
  try {
    const data = await openai(req.body, (t) => { res.write(t) })
    data.length < 3 && res.end('调用错误')
  }
  catch (error) {
    res.write(`调用错误: ${error.message}`)
  }
  finally {
    res.end()
  }
})

router.post('/config', async (req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

router.post('/balance', async (req, res) => {
  try {
    const response = await balance(req.body.key)// fetchBalance()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

router.post('/session', async (req, res) => {
  try {
    const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    const hasAuth = typeof AUTH_SECRET_KEY === 'string' && AUTH_SECRET_KEY.length > 0
    res.send({ status: 'Success', message: '', data: { auth: hasAuth } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    if (process.env.AUTH_SECRET_KEY !== token)
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/voice', async (req, res) => {
  // 返回mp3 数据流
  res.setHeader('Content-type', 'audio/mp3')
  try {
    const { text, voice, style, rate, pitch } = req.body
    res.end(await Voice(text, voice, style, rate, pitch))
  }
  catch (error) {
    res.end(`调用错误: ${error.message}`)
  }
})

app.use('', router)
app.use('/api', router)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))

async function openai(options, process = () => { }) {
  const req = await Request(options.url ?? 'https://api.openai.com/v1/chat/completions', {
    // agent: new ProxyAgent(Agent),
    method: options.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.key ?? KEY}`,
    },
    data: JSON.stringify({
      model: options.model ?? 'gpt-3.5-turbo',
      messages: options.messages ?? [],
      temperature: options.temperature ?? 0.6,
      stream: true,
      ...options,
    }),
  }, (d) => {
    try {
      const p = JSON.parse(d.toString().slice(5))
      const c = p.choices[0].delta.content
      c && process(c)
    }
    catch (error) {
      // console.log(error);
    }
  })
  return req.text
}

async function balance(key) {
  const req = await openai({ key, url: 'https://api.openai.com/dashboard/billing/credit_grants', method: 'GET' })
  try {
    const json = JSON.parse(req)
    const now = new Date().getTime() / 1000
    const days = (json.grants.data[0].expires_at - now) / 86400
    return `${json.total_available.toFixed(2)}/${json.total_granted}.00 ${days.toFixed(0)}天`
  }
  catch (error) {
    return '--/-- --天'
  }
}
