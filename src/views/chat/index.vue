<script setup lang='ts'>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NAutoComplete, NButton, NIcon, NInput, NPopconfirm, useDialog, useMessage } from 'naive-ui'
import html2canvas from 'html2canvas'
import { Message } from './components'
import { useScroll } from './hooks/useScroll'
import { useChat } from './hooks/useChat'
import { useCopyCode } from './hooks/useCopyCode'
import { useUsingContext } from './hooks/useUsingContext'
import HeaderComponent from './components/Header/index.vue'
import Voice from './Voice'
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useChatStore, usePromptStore } from '@/store'
import { fetchChatProcess } from '@/api'
import { t } from '@/locales'

let controller = new AbortController()

// const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

const route = useRoute()
const dialog = useDialog()
const ms = useMessage()
const chatStore = useChatStore()

useCopyCode()

const { isMobile } = useBasicLayout()
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
const { scrollRef, scrollToBottom } = useScroll()
const { usingContext, toggleUsingContext } = useUsingContext()

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
let speechText = ''
let touchstartY = 0
let touchendY = 0
const speechHandle = (text: string) => {
  if (!text) {
    speechText = ''
    return
  }
  const pd = text === '。' ? text : text.slice(speechText.length)
  speechText += pd
  // 过滤掉文本 ```    ``` 之间的内容
  let newStr = speechText
  const len = speechText.split('```').length - 1
  if (len % 2 === 0) {
    const regex = /```[\s\S]*?```/g
    // 过滤掉代码段
    newStr = speechText.replace(regex, '')
  }
  if (len % 2 === 1)
    return
  // 拼接字符串 判断是否有非中文英文数字 如果有则记录位置 并且截取字符串
  // const reg = /[\u4E00-\u9FA5a-zA-Z0-9 \+\*\/\|,~、，.'"\(\)\{\}\[\]]+/g // 方法一
  const reg = /[。！？；\n]/g
  if (reg.test(pd)) { // 方法一 加感叹号
    // const a = newStr.match(reg) // 方法一
    const a = newStr.split(reg).filter(item => item)
    if (!a)
      return

    for (let i = speechArray.length; i < a.length; i++) {
      speechArray.push(a[i])
      a[i].trim().length >= 2 && Voice.speak(a[i])
    }
  }
  if (text === '。') {
    speechText = ''
    speechArray = []
  }
}

const startSpeechRecognition = (event: any) => {
  try {
    touchstartY = event.touches[0].clientY
    if (event.target.tagName === 'IMG')
      event.preventDefault()
  }
  catch (error) {}
  if (isRecording.value)
    return event.preventDefault()

  // 鼠标中键 提交
  if (event.button === 1) {
    // console.log(chatStore.getHistory(+uuid))
    handleSubmit()
  }

  clearTimeout(speechTimeoutId)
  speechTimeoutId = setTimeout(() => {
    isRecording.value = true
    Voice.start()
  }, 175)
  return false
}

const stopSpeechRecognition = (event: any) => {
  clearTimeout(speechTimeoutId)
  isRecording.value && Voice.stop()
  isRecording.value = false
  try {
    touchendY = event.changedTouches[0].clientY
    if (touchstartY - touchendY > 100 && !prompt.value.includes('识别中...')) // 向上滑动
      handleSubmit()
    // if (touchendY - touchstartY > 100) { // 向下滑动 清除输入框
    //   prompt.value = ''
    //   Voice.previousContent = ''
    // }
  }
  catch (error) {}
}

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
    // const lastText = ''
    // const system = (chatStore.getHistory(+uuid) || { system: '' }).system
    const speak = chatStore.getHistory(+uuid)?.speak
    const fetchChatAPIOnce = async () => {
      // 构建消息请求 读取数组从后往前读取 大于五分钟的不读取和 总长度大于4000删除两个
      const messages = buildMessage(message, 0)
      const options = { messages }
      await fetchChatProcess({
        options,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          try {
            updateChat(
              +uuid,
              dataSources.value.length - 1,
              {
                dateTime: new Date().toLocaleString(),
                text: responseText ?? '',
                inversion: false,
                error: false,
                loading: false,
                conversationOptions: { conversationId: 'data.conversationId', parentMessageId: 'index.toString()' },
                requestOptions: { prompt: message },
              },
            )
            speak && speechHandle(responseText)
            scrollToBottom()
          }
          catch (error) {
            // console.log(error)
          }
        },
      })
    }
    await fetchChatAPIOnce()
    speak && speechHandle('。')
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
    const speak = chatStore.getHistory(+uuid)?.speak
    const fetchChatAPIOnce = async () => {
      // 构建消息请求 读取数组从后往前读取 大于五分钟的不读取和 总长度大于4000删除两个
      const messages = buildMessage(message, index)
      const options = { messages }
      await fetchChatProcess({
        options,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText = '调用失败' } = xhr
          try {
            updateChat(
              +uuid,
              index,
              {
                dateTime,
                text: responseText ?? '',
                inversion: false,
                error: false,
                loading: false,
                conversationOptions: { conversationId: 'data.conversationId', parentMessageId: 'index.toString()' },
                requestOptions: { prompt: message },
              },
            )
            speak && speechHandle(responseText)
            scrollToBottom()
          }
          catch (error) {
            // console.log(error)
          }
        },
      })
    }
    await fetchChatAPIOnce()
    speak && speechHandle('。')
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
    if (((event.code === 'Enter' || event.key === 'Enter') && event.ctrlKey) || event.key === '\n') {
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
  if (prompt.value.startsWith('/')) {
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
      v-if="isMobile" :using-context="usingContext" @export="handleExport"
      @toggle-using-context="toggleUsingContext"
    />
    <main class="flex-1 overflow-hidden" @mousedown="startSpeechRecognition" @mouseup="stopSpeechRecognition" @touchstart="startSpeechRecognition" @touchend="stopSpeechRecognition" @contextmenu="(e) => e.preventDefault()">
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
          <NPopconfirm placement="bottom" @positive-click="handleClear">
            <template #trigger>
              <NButton @mousedown="(event) => event.button === 1 && handleClear()">
                <span class="text-xl text-[#4f555e] dark:text-white">
                  <SvgIcon icon="ri:delete-bin-line" />
                </span>
              </NButton>
            </template>
            {{ $t('chat.clearHistoryConfirm') }}
          </NPopconfirm>
          <!-- <HoverButton v-if="!isMobile" @click="handleExport">
                  <span class="text-xl text-[#4f555e] dark:text-white">
                    <SvgIcon icon="ri:download-2-line" />
                  </span>
                </HoverButton> -->
          <!-- <NButton v-if="!isMobile" @click="toggleUsingContext">
            <span class="text-xl" :class="{ 'text-[#4b9e5f]': usingContext, 'text-[#a8071a]': !usingContext }">
              <SvgIcon icon="ri:chat-SpeechIcon-line" />
            </span>
          </NButton> -->
          <NButton v-if="!isMobile" @click="toggleUsingContext">
            <span class="text-xl" :class="{ 'text-[#4b9e5f]': usingContext, 'text-[#a8071a]': !usingContext }">
              <SvgIcon icon="ri:chat-history-line" />
            </span>
          </NButton>
          <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption">
            <template #default="{ handleBlur, handleFocus }">
              <NInput
                v-model:value="prompt" type="textarea" :placeholder="placeholder" clearable :precision="0"
                :autosize="{ minRows: 1, maxRows: 16 }" @input="handleInput" @focus="handleFocus" @blur="handleBlur"
                @keypress="handleEnter" @mousedown="startSpeechRecognition" @mouseup="stopSpeechRecognition"
              >
                <template #suffix>
                  <NIcon size="25" depth="1" :color="isRecording ? '#4b9e5f' : ''">
                    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1.2-9.1c0-.66.54-1.2 1.2-1.2s1.2.54 1.2 1.2l-.01 6.2c0 .66-.53 1.2-1.19 1.2s-1.2-.54-1.2-1.2V5.9zm6.5 6.1c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.41 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" fill="currentColor" /></svg>
                  </NIcon>
                  <!-- <span class="text-xl" :class="{ 'text-[#4b9e5f]': isRecording }">
                    <SvgIcon icon="ic:outline-keyboard-voice" width="25" height="25" />
                  </span> -->
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
