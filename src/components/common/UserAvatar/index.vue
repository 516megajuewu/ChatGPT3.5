<script setup lang='ts'>
import { computed } from 'vue'
import { NAvatar, NButton, useMessage } from 'naive-ui'
import { useUserStore } from '@/store'
import defaultAvatar from '@/assets/avatar.jpg'
import { isString } from '@/utils/is'

const userStore = useUserStore()
const message = useMessage()
const userInfo = computed(() => userStore.userInfo)

const login = async () => {
  message.success('登录成功')
}

const UpBalance = async () => {
  message.success('查询余额')
}
</script>

<template>
  <div class="flex items-center overflow-hidden">
    <div class="w-10 h-10 overflow-hidden rounded-full shrink-0" @click="login">
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
</template>
