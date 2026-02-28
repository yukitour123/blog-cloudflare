import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'
import { GenerateTagsAction } from './actions/generateTagsAction'

export default defineConfig({
  name: 'default',
  title: 'sanityprogram',

  projectId: '6oepnks9',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev, context) => {
      // post ドキュメントの場合のみ「自動タグ付け」アクションを追加
      if (context.schemaType === 'post') {
        return [...prev, GenerateTagsAction]
      }
      return prev
    },
  },
})
