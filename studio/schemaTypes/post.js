import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'post',
  title: '記事',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'タイトル',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: '公開日',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: '抜粋',
      type: 'text',
      rows: 3,
      description: '一覧ページに表示される記事の要約（200文字以内）',
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'category',
      title: 'カテゴリー',
      type: 'reference',
      to: [{ type: 'category' }],
    }),
    defineField({
      name: 'tags',
      title: 'タグ',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'tag' }] }],
    }),
    defineField({
      name: 'cover',
      title: 'カバー画像',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'body',
      title: '本文',
      type: 'array',
      of: [
        {
          type: 'block',
        },
        {
          type: 'image',
          options: { hotspot: true },
        },
      ],
    }),
  ],

  preview: {
    select: {
      title: 'title',
      date: 'date',
      media: 'cover',
      categoryTitle: 'category.title',
    },
    prepare(selection) {
      const { date, categoryTitle } = selection
      return {
        ...selection,
        subtitle: [categoryTitle, date].filter(Boolean).join(' | '),
      }
    },
  },
})
