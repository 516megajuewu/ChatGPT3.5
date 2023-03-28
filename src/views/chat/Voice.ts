import Recorder from 'recorder-core'
import 'recorder-core/src/engine/wav'
import { fetchAudio } from '@/api'

class Voice {
  prompt: any
  recognition: any
  previousContent: string | undefined
  speakList: Array<any> = []
  isSpeak = false
  isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  recorder = new Recorder({ type: 'wav', sampleRate: 11025, bitRate: 16 })

  constructor() {
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
          fetchAudio({ audio: base64.toString().replace(/^data:audio\/\w+;base64,/, '') }).catch((data) => {
            // handle rejected promise
            // data.result ? (this.prompt.value = `${temp}${data.result},`) : (this.prompt.value = temp)
            this.prompt.value = `${this.prompt.value.replace(' 识别中...', data.result || '')},`
          })
        }
        this.recorder.close()
      })
    }
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
    text && this.speakList.push(new Audio(`https://aiapps.top/Voice?text=${encodeURI(text)}`))
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
}

export default new Voice()
