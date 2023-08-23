<script setup lang='ts'>
import { computed, ref } from 'vue'
import { NInput, NPopconfirm, NScrollbar, NSelect, NTag } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { useAppStore, useChatStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'

const { isMobile } = useBasicLayout()

const appStore = useAppStore()
const SystemRole = ref<string>('')
// const isSpeak = ref<boolean>(false)
const chatStore = useChatStore()

const dataSources = computed(() => chatStore.history)

async function handleSelect({ uuid }: Chat.Info) {
  if (isActive(uuid))
    return

  if (chatStore.active)
    chatStore.updateChatInfo(chatStore.active, { isEdit: false })
  await chatStore.setActive(uuid)

  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

function handleEdit({ uuid }: Chat.Info, isEdit: boolean, event?: MouseEvent) {
  event?.stopPropagation()
  chatStore.updateChatInfo(uuid, { isEdit })
}

function handleDelete(index: number, event?: MouseEvent | TouchEvent) {
  event?.stopPropagation()
  chatStore.deleteChatInfo(index)
}

function handleEnter({ uuid }: Chat.Info, isEdit: boolean, event: KeyboardEvent) {
  event?.stopPropagation()
  if (event.key === 'Enter')
    chatStore.updateChatInfo(uuid, { isEdit })
}

function isActive(uuid: number) {
  return chatStore.active === uuid
}

const ModelData = [
  { label: 'Chat 3.5 官方', value: 'binjie' },
  { label: 'Chat 3.5 联网', value: 'binjie_network', disabled: true },
  { label: 'Chat 3.5 备用', value: 'default', disabled: true },
  { label: 'Chat 4.0 16K', value: 'zh-CN-没有开放', disabled: true },
  { label: 'Chat 4.0 32K', value: 'zh-CN-XiaochenNeural', disabled: true },
  { label: '搜索 微软必应', value: 'zh-CN-XiaohanNeural', disabled: true },
  // { label: '百度 文心一言', value: 'zh-CN-XiaoxiaoNeural', disabled: true },
  { label: '绘图 聚合绘图', value: '聚合绘图', disabled: true },
  { label: '视频 生成视频', value: '视频生成', disabled: true },
  { label: '通用 自动任务', value: '贾维斯', disabled: true },
]

const VoiceData = [
  { label: '晓伊(女-儿童)', value: 'zh-CN-XiaoyiNeural' },
  { label: '云希(男-抖音)', value: 'zh-CN-YunxiNeural' },
  // { label: '晓辰(女-热门)', value: 'zh-CN-XiaochenNeural' },
  { label: '有道(女-稳定)', value: 'https://tts.youdao.com/fanyivoice?le=zh&word=' },
  // { label: '搜狗(男-稳定)', value: 'https://fanyi.sogou.com/reventondc/synthesis?text=' },
  // { label: '晓晓(女-年轻)', value: 'zh-CN-XiaoxiaoNeural' },
  // { label: '云扬(男-年轻)', value: 'zh-CN-YunyangNeural' },
  // { label: '晓涵(女-年轻)', value: 'zh-CN-XiaohanNeural' },
  // { label: '晓墨(女-年轻)', value: 'zh-CN-XiaomoNeural' },
  // { label: '晓睿(女-老年)', value: 'zh-CN-XiaoruiNeural' },
  // { label: '晓双(女-儿童)', value: 'zh-CN-XiaoshuangNeural' },
  // { label: '晓萱(女-年轻)', value: 'zh-CN-XiaoxuanNeural' },
  // { label: '晓颜(女-年轻)', value: 'zh-CN-XiaoyanNeural' },
  // { label: '晓悠(女-儿童)', value: 'zh-CN-XiaoyouNeural' },
  // { label: '云野(男-中年)', value: 'zh-CN-YunyeNeural' },
  // { label: '晓梦(女-年轻)', value: 'zh-CN-XiaomengNeural' },
]
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
        <div
          v-for="(item, index) of dataSources" :key="index"
          @mouseup="$event => $event.button === 1 && handleDelete(index, $event)"
        >
          <a
            class="relative flex items-center gap-3 px-3 py-3 break-all border rounded-md cursor-pointer hover:bg-neutral-100 group dark:border-neutral-800 dark:hover:bg-[#24272e]"
            :class="isActive(item.uuid) && ['border-[#4b9e5f]', 'bg-neutral-100', 'text-[#4b9e5f]', 'dark:bg-[#24272e]', 'dark:border-[#4b9e5f]', 'pr-14']"
            @click="handleSelect(item)"
          >
            <NPopconfirm
              ref="SystemRole" placement="bottom" :show-icon="false" :positive-text="null"
              :negative-text="null"
            >
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
                <p class="text">设定
                  <NInput v-model:value="item.system" type="textarea" placeholder="人物角色设定, 可以参考 Prompt Store " />
                </p>
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
                v-if="item.isEdit" v-model:value="item.title" size="small"
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
                <NPopconfirm
                  ref="SystemRole" placement="bottom" :show-icon="false" :positive-text="null"
                  :negative-text="null"
                >
                  <template #trigger>
                    <button class="p-1">
                      <SvgIcon icon="ion:options-outline" />
                    </button>
                  </template>
                  <span class="text">
                    <!-- <NTag size="large">
                      <NCheckbox v-model:checked="item.network">启用互联网搜索</NCheckbox>
                    </NTag>
                    <br>
                    ------------------------
                    <br> -->
                    <NTag type="success" size="medium">
                      接口:
                    </NTag>
                    <NSelect v-model:value="item.api" :options="ModelData" :default-value="ModelData[0].label" />
                    <!-- <br>
                    <NTag type="success" size="medium">
                      参数:
                    </NTag>
                    <br>
                    <br>
                    <NSlider :step="10" :max="100" />
                    <br>
                    <NSlider :step="10" :max="100" />
                    <br>
                    <NSlider :step="0.1" :max="1" />
                    <br> -->
                    ------------------------
                    <br>
                    <NTag type="success" size="medium">
                      语音:
                    </NTag>
                    <NSelect v-model:value="item.voice" :options="VoiceData" :default-value="VoiceData[0].label" />

                  </span>
                </NPopconfirm>
                <NPopconfirm placement="bottom" @positive-click="handleDelete(index, $event)">
                  <template #trigger>
                    <button class="p-1">
                      <SvgIcon icon="ri:delete-bin-line" />
                    </button>
                  </template>
                  {{ $t('chat.deleteChatInfoConfirm') }}
                </NPopconfirm>
              </template>
            </div>
          </a>
        </div>
      </template>
    </div>
  </NScrollbar>
</template>
