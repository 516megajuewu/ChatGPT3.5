<script setup lang='ts'>
import { ref } from 'vue'
import { NSelect } from 'naive-ui'
import { useUserStore } from '@/store'

const userStore = useUserStore()
const dvalue = ref('晓伊（女 - 儿童）')
// userStore.updateUserInfo({ announcer: 'zh-CN-XiaoyiNeural' })

const data = [
  { label: '晓晓（女 - 年轻人）', value: 'zh-CN-XiaoxiaoNeural' },
  { label: '云扬（男 - 年轻人）', value: 'zh-CN-YunyangNeural' },
  { label: '晓辰（女 - 年轻人 - 抖音热门）', value: 'zh-CN-XiaochenNeural' },
  { label: '晓涵（女 - 年轻人）', value: 'zh-CN-XiaohanNeural' },
  { label: '晓墨（女 - 年轻人）', value: 'zh-CN-XiaomoNeural' },
  { label: '晓睿（女 - 老年）', value: 'zh-CN-XiaoruiNeural' },
  { label: '晓双（女 - 儿童）', value: 'zh-CN-XiaoshuangNeural' },
  { label: '晓萱（女 - 年轻人）', value: 'zh-CN-XiaoxuanNeural' },
  { label: '晓颜（女 - 年轻人）', value: 'zh-CN-XiaoyanNeural' },
  { label: '晓悠（女 - 儿童）', value: 'zh-CN-XiaoyouNeural' },
  { label: '云希（男 - 年轻人 - 抖音热门）', value: 'zh-CN-YunxiNeural' },
  { label: '云野（男 - 中年人）', value: 'zh-CN-YunyeNeural' },
  { label: '晓梦（女 - 年轻人）', value: 'zh-CN-XiaomengNeural' },
  { label: '晓伊（女 - 儿童）', value: 'zh-CN-XiaoyiNeural' },
]
if (!userStore.userInfo.announcer)
  userStore.updateUserInfo({ announcer: 'zh-CN-XiaoyiNeural' })

if (userStore.userInfo.announcer) {
  data.forEach((item) => {
    if (item.value === userStore.userInfo.announcer)
      dvalue.value = item.label
  })
}

function handleUpdateValue(value: string) {
  userStore.updateUserInfo({ announcer: value })
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center space-x-4">
      <span class="flex-shrink-0 w-[50px]">{{ '声音:' }}</span>
      <NSelect :options="data" :default-value="dvalue" :disabled="true" @update:value="handleUpdateValue" />
    </div>
  </div>
</template>
