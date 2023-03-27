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
      })
      // this.recognition.start()
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
    if (this.isSpeak)
      return text && this.speakList.push(text)
    this.isSpeak = true
    const words = text ?? this.speakList.shift()
    if (!words) {
      this.isSpeak = false
      return
    }
    const audio = new Audio(`https://tts.youdao.com/fanyivoice?word=${encodeURI(words)}&le=zh`)
    audio.onended = () => {
      this.isSpeak = false
      this.speak(this.speakList.shift())
    }
    audio.play()
  }
}

export default new Voice()
