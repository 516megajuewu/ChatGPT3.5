import Recorder from 'recorder-core'
import 'recorder-core/src/engine/mp3'
import 'recorder-core/src/engine/mp3-engine'

// const SERVER = import.meta.env.VITE_GLOB_API_URL || 'https://chatserver.516megajuewu.repl.co'
const SERVER = 'https://xuanxuan.club:3002'

class Voice {
  prompt: any
  recognition: any
  previousContent: string | undefined
  speakList: Array<any> = []
  isSpeak = false
  recorder = new Recorder()
  get isMobile() {
    return /Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent)
  }

  constructor() {
    this.init()
  }

  init() {
    if ('webkitSpeechRecognition' in window && !this.isMobile) {
      // eslint-disable-next-line new-cap
      this.recognition = new (window as any).webkitSpeechRecognition()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.previousContent = ''
      this.recognition.addEventListener('result', (event: { results: string | any[] }) => {
        const transcript = event.results[event.results.length - 1][0].transcript
        if (event.results[event.results.length - 1].isFinal) {
          this.previousContent += `${transcript},`
          this.prompt.value = this.previousContent
        }
        else {
          this.prompt.value = this.previousContent + transcript
        }
      })
      this.recognition.addEventListener('end', () => {
        this.previousContent = this.prompt.value
      })

      // this.recognition.start()
    }
  }

  start() {
    if (this.isMobile) {
      return this.recorder.open(() => {
        this.recorder.start()
      })
    }
    this.recognition.continuous || this.init()
    this.recognition.start()
  }

  stop() {
    if (this.isMobile) {
      return this.recorder.stop((blob: any) => {
        const reader = new FileReader()
        reader.readAsDataURL(blob)
        reader.onload = () => {
          const base64 = (reader.result?.toString() || '').replace(/^data:audio\/\w+;base64,/, '')
          // 去掉base64头部
          this.prompt.value = `${this.prompt.value} 识别中...`
          fetch(`${SERVER}/audio`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audio: base64.toString(),
            }),
          }).then(async (response) => {
            const data = await response.json()
            this.prompt.value = `${this.prompt.value.replace(' 识别中...', data.result || '')}${data.result ? ',' : ''}`
          })

          // voiceRecognition(base64.toString()).then((data) => {
          //   this.prompt.value = `${this.prompt.value.replace(' 识别中...', data || '')}${data ? ',' : ''}`
          // })

          // fetchAudio({ audio: base64.toString() }).catch((data) => {
          //   // handle rejected promise
          //   // data.result ? (this.prompt.value = `${temp}${data.result},`) : (this.prompt.value = temp)
          //   this.prompt.value = `${this.prompt.value.replace(' 识别中...', data.result || '')}${data.result ? ',' : ''}`
          // })
        }
        this.recorder.close()
      })
    }
    this.recognition.continuous || this.init()
    this.recognition.stop()
  }

  parseSpeak(text: string) {
    const regex = /[^\u4E00-\u9FA5a-zA-Z0-9]/g
    const words = text.split(regex).filter((word) => {
      return word !== ''
    })
    return words
  }

  speak(text: string | undefined) {
    try {
      text && this.speakList.push(new Audio(`${SERVER}/voice?text=${encodeURI(text)}`))
      // text && this.speakList.push(new Audio(`https://tts.youdao.com/fanyivoice?word=${encodeURI(text)}&le=zh`))
      if (this.isSpeak)
        return
      const audio = this.speakList.shift()
      if (!audio) {
        this.isSpeak = false
        return
      }
      this.isSpeak = true
      // 需要换成缓存
      // const audio = new Audio(`https://aiapps.top/Voice?text=${encodeURI(words)}`)
      // const audio = new Audio(`https://tts.youdao.com/fanyivoice?word=${encodeURI(words)}&le=zh`)
      audio.onended = () => {
        this.isSpeak = false
        this.speak(undefined)
      }
      audio.play()
    }
    catch (error) {
      this.isSpeak = false
      this.speak(undefined)
    }
  }
}

function AutoVoiceRecognition(result = (text: string) => {}, api = 'https://xuanxuan.club:3002/audio') {
  const recorder = new Recorder({ debug: false })
  recorder.open()
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      const audioContext = new AudioContext()
      const sourceNode = audioContext.createMediaStreamSource(stream)
      const analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = 2048
      sourceNode.connect(analyserNode)
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount)
      let isRecording = 0
      // 定时更新音量值
      setInterval(() => {
      // 获取分析结果
        analyserNode.getByteFrequencyData(dataArray)
        // 计算音量值
        const volume = dataArray.reduce((acc, cur) => acc + cur) / dataArray.length
        if (volume > 25) {
          isRecording === 0 && recorder.start()
          isRecording = 1 // 但有个问题 如果有杂音 会一直录下去
        }
        if (volume < 25 && isRecording > 0 && isRecording++ > 50) {
          isRecording = 0
          recorder.stop((blob: any) => {
            const reader = new FileReader()
            reader.readAsDataURL(blob)
            reader.onload = () => {
              const base64 = (reader.result?.toString() || '').replace(/^data:audio\/\w+;base64,/, '')
              // 去掉base64头部
              fetch(api, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  audio: base64.toString(),
                }),
              }).then(async (response) => {
                const data = await response.json()
                data.result && result(data.result)
              })
            }
          })
        }
      }, 10)
    })
}

// AutoVoiceRecognition(console.log)
// async function voiceRecognition(base64: string) {
//   return new Promise((resolve) => {
//     const ws = new WebSocket('ws://49.232.160.92:3003')
//     ws.onopen = () => ws.send(base64)
//     ws.onmessage = data => resolve(data.data.toString())
//   })
// }

export default new Voice()
