import ActionIconButton from '@renderer/components/Buttons/ActionIconButton'
import type { CodeEditorHandles } from '@renderer/components/CodeEditor'
import CodeEditor from '@renderer/components/CodeEditor'
import { HSpaceBetweenStack } from '@renderer/components/Layout'
import RichEditor from '@renderer/components/RichEditor'
import type { RichEditorRef } from '@renderer/components/RichEditor/types'
import Selector from '@renderer/components/Selector'
import { useNotesSettings } from '@renderer/hooks/useNotesSettings'
import { useSettings } from '@renderer/hooks/useSettings'
import { useAppDispatch } from '@renderer/store'
import { setEnableSpellCheck } from '@renderer/store/settings'
import type { EditorView } from '@renderer/types'
import { Empty, Modal, Input, Button, message } from 'antd'
import { SpellCheck } from 'lucide-react'
import type { FC, RefObject } from 'react'
import { memo, useCallback, useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface NotesEditorProps {
  activeNodeId?: string
  currentContent: string
  tokenCount: number
  editorRef: RefObject<RichEditorRef | null>
  codeEditorRef: RefObject<CodeEditorHandles | null>
  onMarkdownChange: (content: string) => void
}

const NotesEditor: FC<NotesEditorProps> = memo(
  ({ activeNodeId, currentContent, tokenCount, onMarkdownChange, editorRef, codeEditorRef }) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { settings } = useNotesSettings()
    const { enableSpellCheck } = useSettings()
    const currentViewMode = useMemo(() => {
      if (settings.defaultViewMode === 'edit') {
        return settings.defaultEditMode
      } else {
        return settings.defaultViewMode
      }
    }, [settings.defaultEditMode, settings.defaultViewMode])
    const [tmpViewMode, setTmpViewMode] = useState(currentViewMode)
    const [isGenerateModalVisible, setIsGenerateModalVisible] = useState(false)
    const [generatePrompt, setGeneratePrompt] = useState('')
    const [selectedText, setSelectedText] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleCommandsReady = useCallback((commandAPI: Pick<RichEditorRef, 'unregisterCommand'>) => {
      const disabledCommands = ['image', 'inlineMath']
      disabledCommands.forEach((commandId) => {
        commandAPI.unregisterCommand(commandId)
      })
    }, [])

    // 处理表达优化事件
    const handleOptimizeContent = useCallback((event: Event) => {
      const customEvent = event as CustomEvent<{ text: string }>
      const textToOptimize = customEvent.detail.text
      setSelectedText(textToOptimize)
      setIsLoading(true)

      // 这里应该调用AI API来优化文本
      // 暂时用模拟数据代替
      setTimeout(() => {
        const optimizedText = `优化后的内容：${textToOptimize}`
        // 替换编辑器中的选定文本
        if (editorRef.current) {
          editorRef.current.replaceSelectedText(optimizedText)
        }
        message.success('内容优化完成')
        setIsLoading(false)
      }, 1000)
    }, [editorRef])

    // 处理内容生成事件
    const handleGenerateContent = useCallback((event: Event) => {
      const customEvent = event as CustomEvent<{ editor: any }>
      setIsGenerateModalVisible(true)
    }, [])

    // 处理生成内容的确认
    const handleGenerateConfirm = useCallback(() => {
      if (!generatePrompt.trim()) {
        message.warning('请输入要生成的内容描述')
        return
      }

      setIsLoading(true)
      setIsGenerateModalVisible(false)

      // 这里应该调用AI API来生成内容
      // 暂时用模拟数据代替
      setTimeout(() => {
        const generatedText = `根据您的请求生成的内容：${generatePrompt}`
        // 在光标位置插入生成的内容
        if (editorRef.current) {
          editorRef.current.insertText(generatedText)
        }
        message.success('内容生成完成')
        setIsLoading(false)
        setGeneratePrompt('')
      }, 1500)
    }, [editorRef, generatePrompt])

    // 添加事件监听器
    useEffect(() => {
      window.addEventListener('optimizeContent', handleOptimizeContent as EventListener)
      window.addEventListener('generateContent', handleGenerateContent as EventListener)

      return () => {
        window.removeEventListener('optimizeContent', handleOptimizeContent as EventListener)
        window.removeEventListener('generateContent', handleGenerateContent as EventListener)
      }
    }, [handleOptimizeContent, handleGenerateContent])

    if (!activeNodeId) {
      return (
        <EmptyContainer>
          <Empty description={t('notes.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </EmptyContainer>
      )
    }

    return (
      <>
        <RichEditorContainer>
          {tmpViewMode === 'source' ? (
            <SourceEditorWrapper isFullWidth={settings.isFullWidth} fontSize={settings.fontSize}>
              <CodeEditor
                ref={codeEditorRef}
                value={currentContent}
                language="markdown"
                onChange={onMarkdownChange}
                height="100%"
                expanded={false}
                style={{
                  height: '100%',
                  fontSize: `${settings.fontSize}px`
                }}
              />
            </SourceEditorWrapper>
          ) : (
            <RichEditor
              key={`${activeNodeId}-${tmpViewMode === 'preview' ? 'preview' : 'read'}`}
              ref={editorRef}
              initialContent={currentContent}
              onMarkdownChange={onMarkdownChange}
              onCommandsReady={handleCommandsReady}
              showToolbar={tmpViewMode === 'preview'}
              editable={tmpViewMode === 'preview'}
              showTableOfContents={settings.showTableOfContents}
              enableContentSearch
              className="notes-rich-editor"
              isFullWidth={settings.isFullWidth}
              fontFamily={settings.fontFamily}
              fontSize={settings.fontSize}
              enableSpellCheck={enableSpellCheck}
            />
          )}
        </RichEditorContainer>
        <BottomPanel>
          <HSpaceBetweenStack width="100%" justifyContent="space-between" alignItems="center">
            <TokenCount>
              {t('notes.characters')}: {tokenCount}
            </TokenCount>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--color-text-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
              {tmpViewMode === 'preview' && (
                <Tooltip placement="top" title={t('notes.spell_check_tooltip')} mouseLeaveDelay={0} arrow>
                  <ActionIconButton
                    active={enableSpellCheck}
                    onClick={() => {
                      const newValue = !enableSpellCheck
                      dispatch(setEnableSpellCheck(newValue))
                      window.api.setEnableSpellCheck(newValue)
                    }}
                  >
                    <SpellCheck size={18} />
                  </ActionIconButton>
                </Tooltip>
              )}
              <Selector
                value={tmpViewMode as EditorView}
                onChange={(value: EditorView) => setTmpViewMode(value)}
                options={[
                  { label: t('notes.settings.editor.edit_mode.preview_mode'), value: 'preview' },
                  { label: t('notes.settings.editor.edit_mode.source_mode'), value: 'source' },
                  { label: t('notes.settings.editor.view_mode.read_mode'), value: 'read' }
                ]}
              />
            </div>
          </HSpaceBetweenStack>
        </BottomPanel>

        {/* 内容生成模态框 */}
        <Modal
          title="生成内容"
          visible={isGenerateModalVisible}
          onOk={handleGenerateConfirm}
          onCancel={() => setIsGenerateModalVisible(false)}
          okText="生成"
          cancelText="取消"
          confirmLoading={isLoading}
        >
          <Input.TextArea
            rows={4}
            placeholder="请输入要生成的内容描述，例如：'续写这篇文章'、'添加一个例子'、'解释这个概念'"
            value={generatePrompt}
            onChange={(e) => setGeneratePrompt(e.target.value)}
          />
        </Modal>
      </>
    )
  }
)

NotesEditor.displayName = 'NotesEditor'

const EmptyContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  flex: 1;
`

const RichEditorContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  transition: opacity 0.2s ease-in-out;

  .notes-rich-editor {
    border: none;
    border-radius: 0;
    flex: 1;
    background: transparent;

    .rich-editor-wrapper {
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: all 0.15s ease-in-out;
    }

    .rich-editor-content {
      flex: 1;
      overflow: auto;
      padding: 16px;
      transition: all 0.15s ease-in-out;
    }

    /* 预览模式下的样式优化 */
    &[data-preview='true'] {
      .ProseMirror {
        cursor: default !important;
      }
    }
  }
`

const SourceEditorWrapper = styled.div<{ isFullWidth: boolean; fontSize: number }>`
  height: 100%;
  width: ${({ isFullWidth }) => (isFullWidth ? '100%' : '60%')};
  margin: ${({ isFullWidth }) => (isFullWidth ? '0' : '0 auto')};

  /* 应用字体大小到CodeEditor */
  .monaco-editor {
    font-size: ${({ fontSize }) => fontSize}px !important;
  }

  /* 确保CodeEditor内部元素也应用字体大小 */
  .monaco-editor .monaco-editor-background,
  .monaco-editor .inputarea.ime-input,
  .monaco-editor .monaco-editor-container,
  .monaco-editor .overflow-guard,
  .monaco-editor .monaco-scrollable-element,
  .monaco-editor .lines-content.monaco-editor-background,
  .monaco-editor .view-line {
    font-size: ${({ fontSize }) => fontSize}px !important;
  }
`

const BottomPanel = styled.div`
  padding: 8px 16px;
  border-top: 0.5px solid var(--color-border);
  background: var(--color-background-soft);
  flex-shrink: 0;
  height: 48px;
  display: flex;
  align-items: center;
`

const TokenCount = styled.div`
  font-size: 12px;
  color: var(--color-text-3);
  user-select: none;
  line-height: 1;
`

export default NotesEditor
