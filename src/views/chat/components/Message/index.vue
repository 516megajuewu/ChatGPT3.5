<script setup lang='ts'>
import { ref } from 'vue'
import { NPopconfirm, useMessage } from 'naive-ui'
import AvatarComponent from './Avatar.vue'
import TextComponent from './Text.vue'
import { SvgIcon } from '@/components/common'
import { copyText } from '@/utils/format'
const props = defineProps<Props>()

const emit = defineEmits<Emit>()

// import { useIconRender } from '@/hooks/useIconRender'
// import { t } from '@/locales'
const message = useMessage()

interface Props {
  dateTime?: string
  text?: string
  inversion?: boolean
  error?: boolean
  loading?: boolean
}

interface Emit {
  (ev: 'regenerate'): void
  (ev: 'delete'): void
}

// const { iconRender } = useIconRender()

const textRef = ref<HTMLElement>()
const state = ref('text-[#b4bbc4]')
// const options = [
//   {
//     label: t('chat.copy'),
//     key: 'copyText',
//     icon: iconRender({ icon: 'ri:file-copy-2-line' }),
//   },
//   {
//     label: t('common.delete'),
//     key: 'delete',
//     icon: iconRender({ icon: 'ri:delete-bin-line' }),
//   },
// ]

function handleSelect(key: 'copyRaw' | 'copyText' | 'delete') {
  switch (key) {
    case 'copyText':
      message.success('复制成功')
      copyText({ text: props.text ?? '' })
      return
    case 'delete':
      emit('delete')
  }
}

function handleRegenerate() {
  emit('regenerate')
}

function upState(time: string | undefined) {
  const w = 15 * 60000 - (new Date().getTime() - new Date(time ?? '').getTime())
  if (w > 0) {
    state.value = 'text-[#4b9e5f]'
    setTimeout(() => state.value = 'text-[#b4bbc4]', w)
  }
  return state.value
}
</script>

<template>
  <div class="flex w-full mb-6 overflow-hidden" :class="[{ 'flex-row-reverse': inversion }]">
    <div
      class="flex items-center justify-center flex-shrink-0 h-8 overflow-hidden rounded-full basis-8"
      :class="[inversion ? 'ml-2' : 'mr-2']"
    >
      <AvatarComponent :image="inversion" />
    </div>
    <div class="overflow-hidden text-sm " :class="[inversion ? 'items-end' : 'items-start']">
      <p class="text-xs " :class="[inversion ? 'text-right' : 'text-left', upState(dateTime)]">
        {{ dateTime }}
      </p>
      <div
        class="flex items-end gap-1 mt-2"
        :class="[inversion ? 'flex-row-reverse' : 'flex-row']"
      >
        <TextComponent
          ref="textRef"
          :inversion="inversion"
          :error="error"
          :text="text"
          :loading="loading"
        />
        <div class="flex flex-col">
          <button
            v-if="!inversion"
            class="mb-2 transition text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-300"
            @click="handleRegenerate"
          >
            <SvgIcon icon="ri:restart-line" />
          </button>
          <NPopconfirm v-if="!inversion" placement="bottom" @positive-click="handleSelect('delete')">
            <template #trigger>
              <button
                class="transition text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                <SvgIcon icon="ri:delete-bin-line" />
              </button>
            </template>
            {{ $t('chat.deleteChatInfoConfirm') }}
          </NPopconfirm>
          <!-- <NDropdown :placement="!inversion ? 'right' : 'left'" :options="options" @select="handleSelect">
            <button class="transition text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-200">
              <SvgIcon icon="ri:more-2-fill" />
            </button>
          </NDropdown> -->
        </div>
      </div>
    </div>
  </div>
</template>
