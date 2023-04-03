import Recorder from 'recorder-core'
import 'recorder-core/src/engine/wav'

// const SERVER = import.meta.env.VITE_GLOB_API_URL || 'https://chatserver.516megajuewu.repl.co'
const SERVER = 'https://49.232.160.92:3002'

class Voice {
  prompt: any
  recognition: any
  previousContent: string | undefined
  speakList: Array<any> = []
  isSpeak = false
  recorder = new Recorder({ type: 'wav', sampleRate: 11025, bitRate: 16 })
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
      return this.recorder.stop((blob: Blob) => {
        const reader = new FileReader()
        reader.readAsDataURL(blob)
        reader.onload = () => {
          const base64 = reader.result || ''
          // 去掉base64头部
          this.prompt.value = `${this.prompt.value} 识别中...`
          fetch('https://49.232.160.92:3002/audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audio: base64.toString().replace(/^data:audio\/\w+;base64,/, ''),
            }),
          }).then(async (response) => {
            const data = await response.json()
            this.prompt.value = `${this.prompt.value.replace(' 识别中...', data.result || '')}${data.result ? ',' : ''}`
          })
          // fetchAudio({ audio: base64.toString().replace(/^data:audio\/\w+;base64,/, '') }).catch((data) => {
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

export default new Voice()
