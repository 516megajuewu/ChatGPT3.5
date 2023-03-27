import { fetchVoice } from '@/api'

class Voice {
  prompt: any
  recognition: any
  previousContent: string | undefined
  speakList: Array<string | undefined> = []
  isSpeak = false
  constructor() {
    if ('webkitSpeechRecognition' in window) {
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
        document.visibilityState === 'visible' && this.recognition.start()
      })
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible')
          this.recognition.start()
        else
          this.recognition.stop()
      })
      this.recognition.start()
    }
  }

  parseSpeak(text: string) {
    const regex = /[^\u4E00-\u9FA5a-zA-Z0-9]/g
    const words = text.split(regex).filter((word) => {
      return word !== ''
    })
    return words
  }

  speak(text: string | undefined) {
    // 如果参数为空，或者正在播放，就不播放 把 text 加入到播放列表
    if (!text || this.speakList.length > 0) {
      this.speakList.push(...this.parseSpeak(text || '')) // 把 text 拆分成单个的词，加入到播放列表
      return
    }

    fetchVoice({ text }).then((response: any) => {
      const blob = new Blob([response.data], { type: 'audio/mp3' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.addEventListener('ended', () => {
        this.isSpeak = false
        this.speakList.shift()
        this.speak(this.speakList[0])
      })
      audio.play()
      this.isSpeak = true
    })
  }
}

export default new Voice()
