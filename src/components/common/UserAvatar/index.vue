<script setup lang='ts'>
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { NAvatar, NButton, useMessage } from 'naive-ui'
import { useUserStore } from '@/store'
import defaultAvatar from '@/assets/avatar.jpg'
import { isString } from '@/utils/is'

const userStore = useUserStore()
const message = useMessage()
const userInfo = computed(() => userStore.userInfo)
const Setting = defineAsyncComponent(() => import('@/components/common/Setting/index.vue'))

const show = ref(false)

const login = async () => {
  message.success('未开发')
}

const UpBalance = async () => {
  try {
    userStore.updateUserInfo({ description: '更新: 2023-04-11 10.50' })
    // 记录查询时间 一个小时内不再查询
    if (userInfo.value.balanceTime && userInfo.value.balanceTime > Date.now() - 3600000)
      return

    // userStore.updateUserInfo({ description: '查询中...' })
    // const res = await fetchBalance()
    // userStore.updateUserInfo({ description: `余额:${res}` })
    // userStore.updateUserInfo({ balanceTime: Date.now() })
  }
  catch (error) {
    userStore.updateUserInfo({ description: '查询错误' })
  }
}
// 初始完成 调用初始化余额
onMounted(() => {
  UpBalance()
})
</script>

<template>
  <div class="flex items-center overflow-hidden">
    <div class="w-10 h-10 overflow-hidden rounded-full shrink-0" @click="show = true">
      <NButton v-if="isString(userInfo.avatar) && userInfo.avatar.length > 0">
        <NAvatar
          size="large"
          round
          :src="userInfo.avatar"
          :fallback-src="defaultAvatar"
        />
      </NButton>
      <template v-else>
        <NAvatar size="large" round :src="defaultAvatar" />
      </template>
    </div>
    <div class="flex-1 min-w-0 ml-2">
      <NButton class="overflow-hidden font-bold text-md text-ellipsis whitespace-nowrap" text @click="login">
        {{ userInfo.name ?? 'ME' }}
      </NButton>
      <p class="overflow-hidden text-xs text-gray-500 text-ellipsis whitespace-nowrap" @click="UpBalance">
        <span
          v-if="isString(userInfo.description) && userInfo.description !== ''"
          v-html="userInfo.description"
        />
      </p>
    </div>
  </div>
  <Setting v-if="show" v-model:visible="show" />
</template>
