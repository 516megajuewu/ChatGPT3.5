import { onMounted, onUpdated } from 'vue'
import { useMessage } from 'naive-ui'
import { copyText } from '@/utils/format'

const ms = useMessage()

export function useCopyCode() {
  function copyCodeBlock() {
    const codeBlockWrapper = document.querySelectorAll('.code-block-wrapper')
    codeBlockWrapper.forEach((wrapper) => {
      const copyBtn = wrapper.querySelector('.code-block-header__copy')
      const codeBlock = wrapper.querySelector('.code-block-body')
      if (copyBtn && codeBlock) {
        copyBtn.addEventListener('click', () => {
          ms.success('复制成功')
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
