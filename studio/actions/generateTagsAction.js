import { Stack, Text } from '@sanity/ui'
import { useCallback, useState } from 'sanity'
import { useDocumentOperation, useClient } from 'sanity'

export function GenerateTagsAction(props) {
    const { type, draft, published, onComplete } = props
    const { patch } = useDocumentOperation(props.id, props.type)
    const client = useClient({ apiVersion: '2024-01-01' })
    const [isGenerating, setIsGenerating] = useState(false)

    // postスキーマ以外には表示しない
    if (type !== 'post') {
        return null
    }

    return {
        label: isGenerating ? 'タグ生成中…' : '自動タグ付け',
        tone: 'primary',
        onHandle: async () => {
            setIsGenerating(true)
            const doc = draft || published

            if (!doc || !doc.body) {
                alert('本文が入力されていません。')
                setIsGenerating(false)
                onComplete()
                return
            }

            try {
                // 1. 本文から文字列を抽出
                const bodyText = doc.body
                    .filter((block) => block._type === 'block')
                    .map((block) => block.children.map((child) => child.text).join(''))
                    .join('\n')

                if (!bodyText) {
                    alert('本文からテキストが見つかりませんでした。')
                    setIsGenerating(false)
                    onComplete()
                    return
                }

                // 2. Sanity上にある全てのタグを取得
                const existingTags = await client.fetch(`*[_type == "tag"] { _id, title }`)

                if (existingTags.length === 0) {
                    alert('マッチングするためのタグが1件も登録されていません。先にタグを作成してください。')
                    setIsGenerating(false)
                    onComplete()
                    return
                }

                // 3. 本文に登場したタグを見つける
                const matchedTags = []
                for (const tag of existingTags) {
                    if (tag.title && bodyText.includes(tag.title)) {
                        matchedTags.push(tag)
                    }
                }

                if (matchedTags.length === 0) {
                    alert('本文にマッチする既存のタグが見つかりませんでした。')
                    setIsGenerating(false)
                    onComplete()
                    return
                }

                // 4. マッチしたタグを Reference フォーマットに変換
                const tagReferences = matchedTags.map((tag) => ({
                    _type: 'reference',
                    _ref: tag._id,
                    _key: tag._id // Key is required for arrays
                }))

                // 5. 既存のタグとマージ（重複排除）
                const currentTags = doc.tags || []
                const newTags = [...currentTags]

                for (const ref of tagReferences) {
                    if (!newTags.find((t) => t._ref === ref._ref)) {
                        newTags.push(ref)
                    }
                }

                // 6. パッチを当てて更新
                patch.execute([
                    {
                        set: { tags: newTags },
                    },
                ])

                alert(`${matchedTags.length}件のタグを自動付与しました！\n（${matchedTags.map(t => t.title).join(', ')}）`)

            } catch (error) {
                console.error(error)
                alert('エラーが発生しました: ' + error.message)
            } finally {
                setIsGenerating(false)
                onComplete()
            }
        },
    }
}
