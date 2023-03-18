import { onMounted, onUpdated } from 'vue'
import { copyText } from '@/utils/format'
import { t } from '@/locales'

export function useCopyCode() {
  function copyCodeBlock() {
    const codeBlockWrapper = document.querySelectorAll('.code-block-wrapper')
    codeBlockWrapper.forEach((wrapper) => {
      const copyBtn = wrapper.querySelector('.code-block-header__copy')
      const codeBlock = wrapper.querySelector('.code-block-body')
      if (copyBtn && codeBlock) {
        copyBtn.addEventListener('click', () => {
          // 设置 copyBtn 的文本 为chat.copied 并在 1s 后恢复
          const copyBtnText = copyBtn.textContent
          copyBtn.textContent = t('chat.copied')
          setTimeout(() => copyBtn.textContent = copyBtnText, 1000)
          if (navigator.clipboard?.writeText)
            navigator.clipboard.writeText(codeBlock.textContent ?? '')
          else
            copyText({ text: codeBlock.textContent ?? '', origin: true })
        })
      }
    })
  }

  onMounted(() => copyCodeBlock())

  onUpdated(() => copyCodeBlock())
}
