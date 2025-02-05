import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import { t } from '@/locales'

export function useUsingContext() {
  const ms = useMessage()
  const usingContext = ref<boolean>(true)
  const VoiceControl = ref<boolean>(false)
  const isSpeak = ref<boolean>(false)

  function toggleUsingContext() {
    usingContext.value = !usingContext.value
    if (usingContext.value)
      ms.success(t('chat.turnOnContext'))
    else
      ms.warning(t('chat.turnOffContext'))
  }

  function useVoiceChat() {
    VoiceControl.value = !VoiceControl.value
    if (VoiceControl.value)
      ms.success('开启自动语音交互')
    else
      ms.warning('关闭自动语音交互')
    localStorage.VoiceControl = VoiceControl.value
  }

  function useSpeak() {
    isSpeak.value = !isSpeak.value;
    //(document as any).mute = isSpeak.value
    if (isSpeak.value)
      ms.success('开启语音朗读')
    else
      ms.warning('关闭语音朗读')
    localStorage.isSpeak = isSpeak.value
  }

  return {
    useSpeak,
    isSpeak,
    useVoiceChat,
    usingContext,
    toggleUsingContext,
    VoiceControl,
  }
}
