<script setup lang='ts'>
import { computed, ref } from 'vue'
import { NCheckbox, NInput, NPopconfirm, NScrollbar, NTag } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { useAppStore, useChatStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'

const { isMobile } = useBasicLayout()

const appStore = useAppStore()
const SystemRole = ref<string>('')
// const isSpeak = ref<boolean>(false)
const chatStore = useChatStore()

const dataSources = computed(() => chatStore.history)

async function handleSelect({ uuid }: Chat.History) {
  if (isActive(uuid))
    return

  if (chatStore.active)
    chatStore.updateHistory(chatStore.active, { isEdit: false })
  await chatStore.setActive(uuid)

  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

function handleEdit({ uuid }: Chat.History, isEdit: boolean, event?: MouseEvent) {
  event?.stopPropagation()
  chatStore.updateHistory(uuid, { isEdit })
}

function handleDelete(index: number, event?: MouseEvent | TouchEvent) {
  event?.stopPropagation()
  chatStore.deleteHistory(index)
}

function handleEnter({ uuid }: Chat.History, isEdit: boolean, event: KeyboardEvent) {
  event?.stopPropagation()
  if (event.key === 'Enter')
    chatStore.updateHistory(uuid, { isEdit })
}

function isActive(uuid: number) {
  return chatStore.active === uuid
}
</script>

<template>
  <NScrollbar class="px-4">
    <div class="flex flex-col gap-2 text-sm">
      <template v-if="!dataSources.length">
        <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
          <SvgIcon icon="ri:inbox-line" class="mb-2 text-3xl" />
          <span>{{ $t('common.noData') }}</span>
        </div>
      </template>
      <template v-else>
        <div v-for="(item, index) of dataSources" :key="index" @mouseup="$event => $event.button === 1 && handleDelete(index, $event)">
          <a
            class="relative flex items-center gap-3 px-3 py-3 break-all border rounded-md cursor-pointer hover:bg-neutral-100 group dark:border-neutral-800 dark:hover:bg-[#24272e]"
            :class="isActive(item.uuid) && ['border-[#4b9e5f]', 'bg-neutral-100', 'text-[#4b9e5f]', 'dark:bg-[#24272e]', 'dark:border-[#4b9e5f]', 'pr-14']"
            @click="handleSelect(item)"
          >
            <NPopconfirm ref="SystemRole" placement="bottom" :show-icon="false" :positive-text="null" :negative-text="null">
              <template #trigger>
                <button>
                  <span class="text-xl">
                    <SvgIcon icon="ri:message-2-line" />
                  </span>
                </button>
              </template>
              <span class="text">
                标题
                <NInput v-model:value="item.title" type="text" placeholder="标题" />
                <p class="text">设定<NInput v-model:value="item.system" type="textarea" placeholder="人物角色设定, 可以参考 Prompt Store " /></p>
                <!-- <NDivider>
                  语音
                </NDivider>
                语音:
                <NSwitch :value="item.options?.speak" />
                <NDivider>
                  参数
                </NDivider>
                模型:
                <NSwitch :value="item.options?.model" /> -->

              </span>
            </NPopconfirm>

            <div class="relative flex-1 overflow-hidden break-all text-ellipsis whitespace-nowrap">
              <NInput
                v-if="item.isEdit"
                v-model:value="item.title"
                size="small"
                @keypress="handleEnter(item, false, $event)"
              />
              <span v-else>{{ item.title }}</span>
            </div>
            <div v-if="isActive(item.uuid)" class="absolute z-10 flex visible right-1 text-xl">
              <template v-if="item.isEdit">
                <button class="p-1" @click="handleEdit(item, false, $event)">
                  <SvgIcon icon="ri:save-line" />
                </button>
              </template>
              <template v-else>
                <NPopconfirm ref="SystemRole" placement="bottom" :show-icon="false" :positive-text="null" :negative-text="null">
                  <template #trigger>
                    <button class="p-1">
                      <SvgIcon icon="ion:options-outline" />
                    </button>
                  </template>
                  <span class="text">
                    <NTag size="large">
                      <NCheckbox v-model:checked="item.network">开启联网</NCheckbox>
                    </NTag>

                    <br>
                    ------------------------
                    <br>
                    <NTag type="warning" closable size="large">
                      模型选择:[未完成]
                    </NTag>
                    <br>
                    <NTag type="warning" closable size="large">
                      模型参数:[未完成]
                    </NTag>
                    <br>
                    <NTag type="warning" closable size="large">
                      接口地址:[未完成]
                    </NTag>
                    <br>

                  </span></NPopconfirm>
                <NPopconfirm placement="bottom" @positive-click="handleDelete(index, $event)">
                  <template #trigger>
                    <button class="p-1">
                      <SvgIcon icon="ri:delete-bin-line" />
                    </button>
                  </template>
                  {{ $t('chat.deleteHistoryConfirm') }}
                </NPopconfirm>
              </template>
            </div>
          </a>
        </div>
      </template>
    </div>
  </NScrollbar>
</template>
