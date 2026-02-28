import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'category',
    title: 'カテゴリー',
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
            options: { source: 'title', maxLength: 96 },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'description',
            title: '説明',
            type: 'text',
            rows: 3,
        }),
    ],
})
