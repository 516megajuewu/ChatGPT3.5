<script lang="ts" setup>
import { computed, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import mdKatex from '@traptitech/markdown-it-katex'
import hljs from 'highlight.js'
import { useMessage } from 'naive-ui'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
// import { SvgIcon } from '@/components/common'
import { copyText } from '@/utils/format'
const props = defineProps<Props>()

const message = useMessage()

interface Props {
  inversion?: boolean
  error?: boolean
  text?: string
  loading?: boolean
}

const { isMobile } = useBasicLayout()

const textRef = ref<HTMLElement>()

const mdi = new MarkdownIt({
  linkify: true,
  highlight(code, language) {
    const validLang = !!(language && hljs.getLanguage(language))
    if (validLang) {
      const lang = language ?? ''
      return highlightBlock(hljs.highlight(lang, code, true).value, lang)
    }
    return highlightBlock(hljs.highlightAuto(code).value, '')
  },
})

mdi.use(mdKatex, { blockClass: 'katexmath-block rounded-md p-[10px]', errorColor: ' #cc0000' })

const wrapClass = computed(() => {
  return [
    'text-wrap',
    'min-w-[20px]',
    'rounded-md',
    isMobile.value ? 'p-2' : 'px-3 py-2',
    props.inversion ? 'bg-[#d2f9d1]' : 'bg-[#f4f6f8]',
    props.inversion ? 'dark:bg-[#a1dc95]' : 'dark:bg-[#1e1e20]',
    { 'text-red-500': props.error },
  ]
})

const text = computed(() => {
  const value = props.text ?? ''
  if (!props.inversion)
    return mdi.render(value)
  return value
})

function highlightBlock(str: string, lang?: string) {
  return `<pre class="code-block-wrapper"><div class="code-block-header"><span class="code-block-header__lang">${lang}</span><span class="code-block-header__copy">${t('chat.copyCode')}</span></div><code class="hljs code-block-body ${lang}">${str}</code></pre>`
}

const DOUBLE_CLICK_THRESHOLD = 300 // in milliseconds

let lastTouchTime = 0
function handleTouchStart() {
  const currentTime = new Date().getTime()
  const timeSinceLastTouch = currentTime - lastTouchTime
  if (timeSinceLastTouch < DOUBLE_CLICK_THRESHOLD) {
    // double click detected
    copyText({ text: props.text ?? '' })
    message.success('复制成功')
  }
  lastTouchTime = currentTime
}

defineExpose({ textRef })
</script>

<template>
  <div class="text-black" :class="wrapClass">
    <template v-if="loading">
      <span class="dark:text-white w-[4px] h-[20px] block animate-blink" />
    </template>
    <template v-else>
      <div ref="textRef" class="leading-relaxed break-words" @touchstart="handleTouchStart" @dblclick="copyText({ text: props.text ?? '' });message.success('复制成功');">
        <!-- <div class="markdown-body" v-html="text" /> -->
        <div v-if="!inversion" class="markdown-body" v-html="text" />
        <div v-else class="whitespace-pre-wrap" v-text="text" />
      </div>
    </template>
    <!-- <div style="display: flex; justify-content: flex-end; margin-top: 5px;">
      <div class="whitespace-pre-wrap" v-text="''" />
      <NButton text size="tiny" class="hover:text-neutral-800 dark:hover:text-neutral-200">
        <SvgIcon icon="ri:file-copy-2-line" />
        复制
      </NButton>
    </div> -->
  </div>
</template>

<style lang="less">
@import url(./style.less);
</style>
