import { ss } from '@/utils/storage'

const LOCAL_NAME = 'userStorage'

export interface UserInfo {
  key: string
  balance: number
  avatar: string
  name: string
  description: string
  chats: object // 聊天列表{"标题": {"系统","指令",消息:[...]}}
}

export interface UserState {
  userInfo: UserInfo
}

export function defaultSetting(): UserState {
  return {
    userInfo: {
      key: '',
      chats: {},
      balance: 0,
      avatar: '',
      name: 'ME',
      description: '余额: 0',
    },
  }
}

export function getLocalState(): UserState {
  const localSetting: UserState | undefined = ss.get(LOCAL_NAME)
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalState(setting: UserState): void {
  ss.set(LOCAL_NAME, setting)
}
