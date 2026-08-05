import http from '@/services/http'

export function useUpload(url: string) {
  const loading = ref(false)
  const progress = ref(0)
  const error = ref<unknown>(null)

  async function upload(
    file: File,
    extra?: Record<string, unknown>,
  ): Promise<unknown> {
    loading.value = true
    progress.value = 0
    error.value = null

    const form = new FormData()
    form.append('file', file)
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        form.append(k, String(v))
      }
    }

    try {
      return await http.post(url, form, {
        onUploadProgress: (e) => {
          progress.value = Math.round((e.loaded * 100) / (e.total ?? 1))
        },
      })
    } catch (e) {
      error.value = e
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, progress, error, upload }
}
