import { useAppConfig } from './useAppConfig'

export function useFeatureFlag(flag: string) {
  const config = useAppConfig()
  return computed(() => config.featureFlags[flag] ?? false)
}