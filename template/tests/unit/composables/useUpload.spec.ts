// @vitest-environment node
// 上传测试需要 node 原生 FormData / File（jsdom 实现与 node 不兼容，append File 会丢失）
import { describe, it, expect, vi, beforeEach } from 'vitest'
import http from '@/services/http'
import { useUpload } from '@/composables/useUpload'

// 完整替换 http 模块：不加载真实 http.ts（其依赖链触达 window，node 环境无 window）
vi.mock('@/services/http', () => ({
  default: { post: vi.fn() },
}))

const postCalls = () => vi.mocked(http.post).mock.calls

beforeEach(() => {
  vi.mocked(http.post).mockReset()
  vi.mocked(http.post).mockResolvedValue('ok')
})

describe('useUpload', () => {
  it('默认字段名 file，附加 extra 字段，带进度回调', async () => {
    const file = new File(['content'], 'a.txt', { type: 'text/plain' })
    const { upload } = useUpload('/upload')

    await upload(file, { category: 'avatar' })

    const [url, formData, config] = postCalls()[0]
    expect(url).toBe('/upload')
    expect(formData).toBeInstanceOf(FormData)
    const fd = formData as FormData
    expect(fd.has('file')).toBe(true)
    expect(fd.get('file')).toMatchObject({ name: 'a.txt', size: 7 })
    expect(fd.get('category')).toBe('avatar')
    expect(config).toMatchObject({ signal: undefined, onUploadProgress: expect.any(Function) })
  })

  it('支持自定义字段名 / 文件名 / 取消信号', async () => {
    const file = new File(['x'], 'a.txt')
    const controller = new AbortController()
    const { upload } = useUpload('/upload')

    await upload(file, undefined, { fieldName: 'avatar', fileName: 'renamed.png', signal: controller.signal })

    const fd = postCalls()[0][1] as FormData
    expect(fd.has('avatar')).toBe(true)
    expect(fd.get('avatar')).toMatchObject({ name: 'renamed.png' })
    expect(postCalls()[0][2]).toMatchObject({ signal: controller.signal })
  })
})
