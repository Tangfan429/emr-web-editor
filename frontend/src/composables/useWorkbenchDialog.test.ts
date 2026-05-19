import { describe, expect, it } from 'vitest'
import { useWorkbenchDialog } from './useWorkbenchDialog'

describe('useWorkbenchDialog', () => {
  it('resolves text input with trimmed value', async () => {
    const dialog = useWorkbenchDialog()
    const pending = dialog.requestText({
      title: '新建模板',
      message: '请输入模板名称',
      defaultValue: ' 新建模板 ',
      confirmText: '创建',
    })

    expect(dialog.state.value).toMatchObject({
      open: true,
      kind: 'text',
      title: '新建模板',
      value: ' 新建模板 ',
    })

    dialog.updateValue(' 入院记录 ')
    dialog.confirm()

    await expect(pending).resolves.toBe('入院记录')
    expect(dialog.state.value.open).toBe(false)
  })

  it('keeps required text dialog open when value is empty', async () => {
    const dialog = useWorkbenchDialog()
    void dialog.requestText({
      title: '重命名',
      message: '请输入新名称',
      defaultValue: '',
      confirmText: '确定',
      required: true,
    })

    dialog.confirm()

    expect(dialog.state.value).toMatchObject({
      open: true,
      error: '请输入内容。',
    })
  })

  it('resolves confirm dialog with boolean result', async () => {
    const dialog = useWorkbenchDialog()
    const pending = dialog.requestConfirm({
      title: '删除确认',
      message: '确认删除该模板？',
      confirmText: '删除',
      tone: 'danger',
    })

    expect(dialog.state.value).toMatchObject({
      open: true,
      kind: 'confirm',
      tone: 'danger',
    })

    dialog.cancel()

    await expect(pending).resolves.toBe(false)
    expect(dialog.state.value.open).toBe(false)
  })
})
