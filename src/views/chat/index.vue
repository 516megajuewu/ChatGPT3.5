<script setup lang='ts'>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NAutoComplete, NButton, NInput, NPopconfirm, NTag, useDialog, useMessage } from 'naive-ui'
import html2canvas from 'html2canvas'
import { Message } from './components'
import { useScroll } from './hooks/useScroll'
import { useChat } from './hooks/useChat'
import { useCopyCode } from './hooks/useCopyCode'
import { useUsingContext } from './hooks/useUsingContext'
import HeaderComponent from './components/Header/index.vue'
import { AutoVoiceRecognition, Voice } from './Voice'
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useChatStore, usePromptStore, useUserStore } from '@/store'
import { fetchChatProcess } from '@/api'
import { t } from '@/locales'

let controller = new AbortController()

// const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

const route = useRoute()
const dialog = useDialog()

const ms = useMessage()
const appStore = useAppStore()
const chatStore = useChatStore()
const userStore = useUserStore()

useCopyCode()

const { isMobile } = useBasicLayout()
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
const { scrollRef, scrollToBottom } = useScroll()
const { usingContext, toggleUsingContext, useVoiceChat, VoiceControl, isSpeak, useSpeak } = useUsingContext()

const { uuid } = route.params as { uuid: string }

const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
const conversationList = computed(() => dataSources.value.filter(item => (!item.inversion && !item.error)))

const prompt = ref<string>('')
const loading = ref<boolean>(false)
const isRecording = ref<boolean>(false)

// 添加PromptStore
const promptStore = usePromptStore()
// 使用storeToRefs，保证store修改后，联想部分能够重新渲染
const { promptList: promptTemplate } = storeToRefs<any>(promptStore)

Voice.prompt = prompt

let speechTimeoutId: any

let speechArray: Array<string> = []
let speechText: string
const touch = {
  SX: 0,
  SY: 0,
  EX: 0,
  EY: 0,
}

function speechHandle(text?: any) {
  speechText = text === undefined ? speechText : text
  // 过滤掉文本 ```    ``` 之间的内容
  const len = speechText.split('```').length - 1
  if (len % 2 === 1)
    return
  if (len % 2 === 0)
    speechText = speechText.replace(/```[\s\S]*?```/g, '')

  const end = typeof text === 'undefined'
  const a = speechText.split(/[。！？；\n]/g).filter((item: any) => item)
  for (let i = speechArray.length; i < a.length - (end ? 0 : 1); i++) {
    const tmp = a[i].trim()
    if (tmp.length < 2)
      continue
    speechArray.push(tmp)
    isSpeak.value && Voice.speak(tmp, chatStore.getHistory(+uuid)?.voice)
  }
  end && (speechArray = [])
}

document.body.ontouchstart = (event: any) => {
  try {
    touch.SX = event.touches[0].clientX
    touch.SY = event.touches[0].clientY
  }
  catch (error) {}
}

document.body.ontouchend = (event: any) => {
  try {
    touch.EY = event.changedTouches[0].clientY
    touch.EX = event.changedTouches[0].clientX

    if (touch.EX - touch.SX > 135) // 向右滑动 划出侧边栏
      appStore.setSiderCollapsed(false)
    if (touch.SX - touch.EX > 135) // 向右滑动 划出侧边栏
      appStore.setSiderCollapsed(true)
    if (touch.SY - touch.EY > 135 && !prompt.value.includes('识别中...')) // 向上滑动
      handleSubmit()
  }
  catch (error) {}
}

// AutoVoiceRecognition.start((text: any) => {
//   switch (text) {
//     case '助手':
//       prompt.value = ''
//       AutoVoiceRecognition.isActivation = true
//       // 随机回应
//       Voice.speak(['我在', '来啦'][Math.floor(Math.random() * 2)], chatStore.getHistory(+uuid)?.voice)
//       break
//     case '发送':
//       handleSubmit()
//       break
//     case '重新输入':
//       prompt.value = ''
//       break
//     case '清空聊天记录':
//       handleClear()
//       break
//     default:
//       prompt.value += `${text}`
//       AutoVoiceRecognition.isActivation && prompt.value.length > 1 && handleSubmit()
//       break
//   }

//   setInterval(() => {
//     // 语音播放的时候，不允许再次触发语音识别
//     const isPlay = Voice.speakList.length > 0
//     if (isPlay === !AutoVoiceRecognition.isRunning)
//       AutoVoiceRecognition.speakLastTime = Date.now()
//     else
//       AutoVoiceRecognition.isActivation = true // 语音播放结束的时候，自动开启语音识别

//     AutoVoiceRecognition.isRunning = !isPlay
//     // isPlay && (AutoVoiceRecognition.speakLastTime = Date.now())
//     // // 语音播放结束后，自动关闭语音识别
//     // Voice.speakList.length === 0 && (AutoVoiceRecognition.isActivation = false)
//   }, 1000)
// })

function handleVoiceChat() {
  useVoiceChat()
  AutoVoiceRecognition.isRunning = VoiceControl.value
}

function handleisRecording() {
  if (AutoVoiceRecognition.isActivation)
    return 'text-[#7dc8f7]'
  return (VoiceControl.value ? AutoVoiceRecognition.onRecorder.value : isRecording.value) ? 'text-[#4b9e5f]' : 'text-[#aaaaaa]'
}

const startSpeechRecognition = (event: any) => {
  let startTime = 135
  try {
    // if (isMobile.value && event.target.tagName !== 'IMG')
    //   return
    if (event.target.tagName === 'IMG') {
      startTime = 1
      event.preventDefault()
    }
  }
  catch (error) {}

  // 鼠标中键 提交 || 清空
  if (event.button === 1) {
    if (event.target.tagName === 'TEXTAREA') {
      Voice.previousContent = ''
      return prompt.value = ''
    }
    handleSubmit()
  }

  if (VoiceControl.value || isRecording.value)
    return

  // Voice.prompt = (/INPUT|TEXTAREA/.test(event.target.tagName)) ? event.target : prompt

  clearTimeout(speechTimeoutId)
  speechTimeoutId = setTimeout(() => {
    isRecording.value = true
    Voice.start()
  }, startTime)
  return false
}

const stopSpeechRecognition = () => {
  if (VoiceControl.value)
    return
  clearTimeout(speechTimeoutId)
  isRecording.value && Voice.stop()
  isRecording.value = false
}

// if (Voice.isInitEvent === false) {
//   document.body.addEventListener('mousedown', startSpeechRecognition)
//   document.body.addEventListener('mouseup', stopSpeechRecognition)
//   document.body.addEventListener('touchstart', startSpeechRecognition)
//   document.body.addEventListener('touchend', stopSpeechRecognition)
//   Voice.isInitEvent = true
// }

function handleSubmit() {
  onConversation()
  prompt.value = ''
  Voice.previousContent = ''
}

// !!有两个问题 index 和 不带聊天按钮
function buildMessage(message: String, index: number) {
  // 构建消息请求 读取数组从后往前读取 大于35分钟的不读取和 总长度大于4000删除两个
  const system = (chatStore.getHistory(+uuid) || { system: '' }).system
  const messages = [{ role: 'system', content: system }]
  if (!message)
    return messages

  // 消息长度
  let len = system.length + message.length
  usingContext.value && dataSources.value.forEach((item, i) => {
    const temp = { role: item.inversion ? 'user' : 'assistant', content: item.text }

    if ((i > (index || 999)) || !item.text)
      return
    if (((new Date().getTime() - new Date(item.dateTime).getTime()) > 15 * 60000) && index === 0)
      return // messages.length <= 2 && index && item.inversion && (messages[1] = temp)
    len += item.text.length
    len > 4000 && messages.slice(1, 1)
    messages.push(temp)
  })
  usingContext.value || messages.push({ role: 'user', content: message as string })
  // 最后一个是assistant的话删除
  messages[messages.length - 1].role === 'assistant' && messages.pop()
  return messages
}

async function AutoChat(message: any, index: number) {
  let api = ''
  let options = {}
  const item = chatStore.getHistory(+uuid) as any
  item?.engine || (item.engine = 'binjie')
  switch (item?.engine) {
    case 'binjie':
      api = 'https://xuanxuan.club:3002/chat'
      // api = 'https://127.0.0.1:3002/chat'
      options = {
        publicAPI: 'binjie',
        prompt: message,
        chatId: +uuid,
        network: false,
        withoutContext: !usingContext.value,
        system: (item || { system: '' }).system,
      }
      break
    case 'binjie_network':
      api = 'https://xuanxuan.club:3002/chat'
      // api = 'https://127.0.0.1:3002/chat'
      options = {
        publicAPI: 'binjie',
        prompt: message,
        chatId: +uuid,
        network: true,
        withoutContext: !usingContext.value,
        system: (item || { system: '' }).system,
      }
      break
    default:
      options = { messages: buildMessage(message, index), key: userStore.userInfo.key ?? '' }
      break
  }

  const fetchChatAPIOnce = async () => {
    // 构建消息请求 读取数组从后往前读取 大于五分钟的不读取和 总长度大于4000删除两个
    Voice.speakList = []
    await fetchChatProcess({
      url: api,
      options,
      signal: controller.signal,
      onDownloadProgress: ({ event }) => {
        const xhr = event.target
        const { responseText } = xhr
        try {
          updateChat(
            +uuid,
            index === 0 ? dataSources.value.length - 1 : index,
            {
              dateTime: index === 0 ? new Date().toLocaleString() : dataSources.value[index].dateTime,
              text: responseText ?? '',
              inversion: false,
              error: false,
              loading: false,
              conversationOptions: { conversationId: 'data.conversationId', parentMessageId: 'index.toString()' },
              requestOptions: { prompt: message },
            },
          )
          isSpeak.value && speechHandle(responseText)
          scrollToBottom()
        }
        catch (error) {
          // console.log(error)
        }
      },
    })
  }
  await fetchChatAPIOnce()
  isSpeak.value && speechHandle()
}

async function onConversation() {
  const message = prompt.value

  if (loading.value)
    return

  if (!message || message.trim() === '')
    return

  controller = new AbortController()

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: message,
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: null },
    },
  )
  scrollToBottom()

  loading.value = true
  prompt.value = ''

  let options: Chat.ConversationRequest = {}
  const lastContext = conversationList.value[conversationList.value.length - 1]?.conversationOptions

  if (lastContext && usingContext.value)
    options = { ...lastContext }

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: '',
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )
  scrollToBottom()

  // console.log(options, dataSources)
  try {
    await AutoChat(message, 0)
  }
  catch (error: any) {
    const errorMessage = error?.message ?? t('common.wrong')

    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          loading: false,
        },
      )
      scrollToBottom()
      return
    }

    const currentChat = getChatByUuidAndIndex(+uuid, dataSources.value.length - 1)

    if (currentChat?.text && currentChat.text !== '') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          text: `${currentChat.text}\n[${errorMessage}]`,
          error: false,
          loading: false,
        },
      )
      return
    }

    updateChat(
      +uuid,
      dataSources.value.length - 1,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
    scrollToBottom()
  }
  finally {
    loading.value = false
  }
}

async function onRegenerate(index: number) {
  if (loading.value)
    return

  controller = new AbortController()

  const { requestOptions } = dataSources.value[index]

  const message = requestOptions?.prompt ?? ''

  let options: Chat.ConversationRequest = {}

  if (requestOptions.options)
    options = { ...requestOptions.options }

  loading.value = true
  // 读取历史dateTime
  const dateTime = dataSources.value[index].dateTime

  updateChat(
    +uuid,
    index,
    {
      dateTime,
      text: '',
      inversion: false,
      error: false,
      loading: true,
      conversationOptions: null,
      requestOptions: { prompt: message, ...options },
    },
  )

  try {
    await AutoChat(message, index)
  }
  catch (error: any) {
    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        index,
        {
          loading: false,
        },
      )
      return
    }

    const errorMessage = error?.message ?? t('common.wrong')

    updateChat(
      +uuid,
      index,
      {
        dateTime,
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, ...options },
      },
    )
  }
  finally {
    loading.value = false
  }
}

function handleExport() {
  if (loading.value)
    return

  const d = dialog.warning({
    title: t('chat.exportImage'),
    content: t('chat.exportImageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: async () => {
      try {
        d.loading = true
        const ele = document.getElementById('image-wrapper')
        const canvas = await html2canvas(ele as HTMLDivElement, {
          useCORS: true,
        })
        const imgUrl = canvas.toDataURL('image/png')
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (typeof tempLink.download === 'undefined')
          tempLink.setAttribute('target', '_blank')

        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(imgUrl)
        d.loading = false
        ms.success(t('chat.exportSuccess'))
        Promise.resolve()
      }
      catch (error: any) {
        ms.error(t('chat.exportFailed'))
      }
      finally {
        d.loading = false
      }
    },
  })
}

function handleDelete(index: number) {
  if (loading.value)
    return

  return chatStore.deleteChatByUuid(+uuid, index)

  // dialog.warning({
  //   title: t('chat.deleteMessage'),
  //   content: t('chat.deleteMessageConfirm'),
  //   positiveText: t('common.yes'),
  //   negativeText: t('common.no'),
  //   onPositiveClick: () => {
  //     chatStore.deleteChatByUuid(+uuid, index)
  //   },
  // })
}

function handleClear() {
  if (loading.value)
    return
  return chatStore.clearChatByUuid(+uuid)
  // dialog.warning({
  //   title: t('chat.clearChat'),
  //   content: t('chat.clearChatConfirm'),
  //   positiveText: t('common.yes'),
  //   negativeText: t('common.no'),
  //   onPositiveClick: () => {
  //     chatStore.clearChatByUuid(+uuid)
  //   },
  // })
}

function handleInput() {
  Voice.previousContent = prompt.value
}
function handleEnter(event: KeyboardEvent) {
  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
  else {
    if (((event.code === 'Enter' || event.key === 'Enter')) || event.key === '\n') { // && event.ctrlKey
      event.preventDefault()
      handleSubmit()
    }
  }
  Voice.previousContent = prompt.value
}

function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
  }
}

// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)
// 理想状态下其实应该是key作为索引项,但官方的renderOption会出现问题，所以就需要value反renderLabel实现
const searchOptions = computed(() => {
  if (prompt.value.startsWith('/') || prompt.value.startsWith(' ')) {
    return promptTemplate.value.filter((item: { key: string }) => item.key.toLowerCase().includes(prompt.value.substring(1).toLowerCase())).map((obj: { value: any }) => {
      return {
        label: obj.value,
        value: obj.value,
      }
    })
  }
  else {
    return []
  }
})
// value反渲染key
const renderOption = (option: { label: string }) => {
  for (const i of promptTemplate.value) {
    if (i.value === option.label)
      return [i.key]
  }
  return []
}

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

const buttonDisabled = computed(() => {
  return loading.value || !prompt.value || prompt.value.trim() === ''
})

const footerClass = computed(() => {
  let classes = ['p-4']
  if (isMobile.value)
    classes = ['sticky', 'left-0', 'bottom-0', 'right-0', 'p-2', 'pr-3', 'overflow-hidden']
  return classes
})

onMounted(() => {
  scrollToBottom()
})

onUnmounted(() => {
  if (loading.value)
    controller.abort()
})
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <HeaderComponent
      v-if="isMobile" :using-context="usingContext" :is-speak="isSpeak"
      @export="handleExport" @toggle-using-context="toggleUsingContext" @use-speak="useSpeak"
    />
    <main class="flex-1 overflow-hidden" @mousedown="startSpeechRecognition" @mouseup="stopSpeechRecognition" @touchstart="startSpeechRecognition" @touchend="stopSpeechRecognition">
      <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto">
        <div
          id="image-wrapper" class="w-full max-w-screen-xl m-auto dark:bg-[#101014]"
          :class="[isMobile ? 'p-2' : 'p-4']"
        >
          <template v-if="!dataSources.length">
            <div class="flex items-center justify-center mt-4 text-center text-neutral-300">
              <SvgIcon icon="ri:bubble-chart-fill" class="mr-2 text-3xl" />
              <span>Aha~</span>
            </div>
          </template>
          <template v-else>
            <div>
              <Message
                v-for="(item, index) of dataSources" :key="index" :date-time="item.dateTime" :text="item.text"
                :inversion="item.inversion" :error="item.error" :loading="item.loading"
                @regenerate="onRegenerate(index)" @delete="handleDelete(index)"
              />
              <div class="sticky bottom-0 left-0 flex justify-center">
                <NButton v-if="loading" type="warning" @click="handleStop">
                  <template #icon>
                    <SvgIcon icon="ri:stop-circle-line" />
                  </template>
                  Stop Responding
                </NButton>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>
    <footer :class="footerClass">
      <div class="w-full max-w-screen-xl m-auto">
        <div class="flex items-center justify-between space-x-2">
          <!-- <HoverButton @click="handleClear">
                  <span class="text-xl text-[#4f555e] dark:text-white">
                    <SvgIcon icon="ri:delete-bin-line" />
                  </span>
                </HoverButton> -->

          <NPopconfirm ref="SystemRole" placement="bottom" :show-icon="false" :positive-text="null" :negative-text="null">
            <template #trigger>
              <NButton @mouseup="(event) => event.button === 1 && handleClear()">
                <span class="text-xl">
                  <SvgIcon icon="ri:function-line" />
                </span>
              </NButton>
            </template>
            <span class="text">
              <NPopconfirm placement="bottom" @positive-click="handleClear">
                <template #trigger>
                  <NButton>
                    <span class="text-xl text-[#4f555e] dark:text-white">
                      <SvgIcon icon="ri:delete-bin-line" />
                    </span>
                  </NButton>
                </template>
                {{ $t('chat.clearHistoryConfirm') }}
              </NPopconfirm>
              <NButton @click="handleExport">
                <span class="text-xl text-[#4f555e] dark:text-white">
                  <SvgIcon icon="ri:download-2-line" />
                </span>
              </NButton>
              <NButton @click="toggleUsingContext">
                <span class="text-xl" :class="{ 'text-[#4b9e5f]': usingContext, 'text-[#a8071a]': !usingContext }">
                  <SvgIcon icon="ri:chat-history-line" />
                </span>
              </NButton>
              <NButton v-show="false" @click="handleVoiceChat">
                <span class="text-xl" :class="{ 'text-[#4b9e5f]': VoiceControl, 'text-[#a8071a]': !VoiceControl }">
                  <SvgIcon icon="material-symbols:voice-chat-outline" />
                </span>
              </NButton>
              <NButton @click="useSpeak">
                <span class="text-xl" :class="{ 'text-[#4b9e5f]': isSpeak, 'text-[#a8071a]': !isSpeak }">
                  <SvgIcon icon="icon-park-twotone:people-speak" />
                </span>
              </NButton>

              <NPopconfirm placement="bottom" :show-icon="false" :positive-text="null" :negative-text="null">
                <template #trigger>
                  <NButton>
                    <span class="text-xl">
                      <SvgIcon icon="mdi:comment-help-outline" />
                    </span>
                  </NButton>
                </template>
                <span class="text">
                  说明:
                  <br>
                  手势: 上滑发送  右/左滑侧边栏
                  <!-- <br>
                  语音: 语音控制  发送/重新输入 -->
                  <br>
                  按住: 语音输入  松开识别/非实时
                  <br>
                  设定: 点击聊天图标可以设定角色
                  <br>
                  <br>
                  <NTag type="success" size="large">
                    版本: 2023.4.9 21.32
                  </NTag>
                </span>

              </NPopconfirm>

            </span>
          </NPopconfirm>

          <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption">
            <template #default="{ handleBlur, handleFocus }">
              <NInput
                v-model:value="prompt" type="textarea" :placeholder="placeholder" clearable :precision="0"
                :autosize="{ minRows: 1, maxRows: 16 }" @input="handleInput" @focus="handleFocus" @blur="handleBlur"
                @keypress="handleEnter" @mousedown="startSpeechRecognition" @mouseup="stopSpeechRecognition"
              >
                <template #suffix>
                  <span class="text-xl" :class=" handleisRecording()">
                    <SvgIcon icon="ic:outline-keyboard-voice" width="25" height="25" />
                  </span>
                </template>
              </NInput>
            </template>
          </NAutoComplete>
          <NButton type="primary" :disabled="buttonDisabled" @click="handleSubmit">
            <template #icon>
              <span class="dark:text-black">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>
        </div>
      </div>
    </footer>
  </div>
</template>
