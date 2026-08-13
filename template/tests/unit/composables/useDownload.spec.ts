import { describe, it, expect, vi, beforeEach } from 'vitest'
import http from '@/services/http'
import { parseFilename, useDownload } from '@/composables/useDownload'

// 完整替换 http 模块：验证 download 的请求组织（不触发真实 axios）
vi.mock('@/services/http', () => ({
  default: { get: vi.fn() },
}))

describe('parseFilename（Content-Disposition 文件名解析）', () => {
  it('无 Content-Disposition 时返回 fallback', () => {
    expect(parseFilename(undefined, 'download')).toBe('download')
  })

  it("filename*=（UTF-8 编码）解析并解码", () => {
    expect(parseFilename("attachment; filename*=UTF-8''%E6%96%87%E4%BB%B6.xlsx", 'x')).toBe('文件.xlsx')
  })

  it('filename="普通名" 解析', () => {
    expect(parseFilename('attachment; filename="report.pdf"', 'x')).toBe('report.pdf')
  })

  it('双格式并存时 filename* 优先', () => {
    expect(parseFilename("attachment; filename=\"a.pdf\"; filename*=UTF-8''b.pdf", 'x')).toBe('b.pdf')
  })

  it('无 filename 字段时返回 fallback', () => {
    expect(parseFilename('attachment', 'fallback.txt')).toBe('fallback.txt')
  })
})

describe('useDownload.download', () => {
  beforeEach(() => {
    vi.mocked(http.get).mockReset()
    // jsdom 未实现 URL.createObjectURL / revokeObjectURL，需 stub
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
  })

  it('携带 params / signal / authRequired 请求 Blob', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: new Blob(['x']),
      headers: { 'content-disposition': "attachment; filename=\"report.pdf\"" },
    })
    const controller = new AbortController()

    const { download } = useDownload('/export')
    await download({ type: 'xlsx' }, { fileName: 'fallback.xlsx', signal: controller.signal, authRequired: true })

    expect(http.get).toHaveBeenCalledWith('/export', expect.objectContaining({
      params: { type: 'xlsx' },
      responseType: 'blob',
      signal: controller.signal,
      _options: expect.objectContaining({ authRequired: true }),
    }))
  })
})
