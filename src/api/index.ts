import type { AxiosProgressEvent, GenericAbortSignal } from 'axios'
import { post } from '@/utils/request'

export function fetchChatAPI<T = any>(
  prompt: string,
  options?: { conversationId?: string; parentMessageId?: string },
  signal?: GenericAbortSignal,
) {
  return post<T>({
    url: '/chat',
    data: { prompt, options },
    signal,
  })
}

export function fetchChatConfig<T = any>() {
  return post<T>({
    url: '/config',
  })
}

export function fetchChatAPIProcess<T = any>(
  params: {
    system: string
    prompt: string
    options?: { conversationId?: string; parentMessageId?: string }
    signal?: GenericAbortSignal
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void },
) {
  return post<T>({
    url: '/chat-process',
    data: { system: params.system, prompt: params.prompt, options: params.options },
    signal: params.signal,
    onDownloadProgress: params.onDownloadProgress,
  })
}

export function fetchChatProcess<T = any>(
  params: {
    options: {}
    signal?: GenericAbortSignal
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void },
) {
  return post<T>({
    url: '/chat',
    data: params.options,
    signal: params.signal,
    onDownloadProgress: params.onDownloadProgress,
  })
}

// async function Vioce() {
//   const response = await fetch('http://localhost:3000/voice', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       text: '呜呜呜呜',
//     })
//   });
//   //写到桌面
//   const blob = await response.blob();
//   const audio = new Audio(URL.createObjectURL(blob));
//   audio.play();
// }

export function fetchBalance<T = any>() {
  return post<T>({
    url: '/balance',
  })
}

export function fetchVoice<T = any>(
  params: {
    text: string
    voice?: string
    style?: string
    rate?: number
    pitch?: number },
) {
  return post<T>({
    url: '/Voice',
    data: { text: params.text, voice: params.voice, style: params.style, rate: params.rate, pitch: params.pitch },
  })
}

export function fetchAudio<T = any>(
  params: {
    audio: String
  },
) {
  return post<T>({
    url: '/audio',
    data: { audio: params.audio },
  })
}
// export function fetchSession<T>() {
//   return post<T>({
//     url: '/session',
//   })
// }

// export function fetchVerify<T>(token: string) {
//   return post<T>({
//     url: '/verify',
//     data: { token },
//   })
// }
