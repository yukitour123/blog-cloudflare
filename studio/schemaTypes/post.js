import {defineField, defineType} from 'sanity'

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
          options: {hotspot: true},
        },
      ],
    }),
  ],

  preview: {
    select: {
      title: 'title',
      date: 'date',
      media: 'cover',
    },
    prepare(selection) {
      const {date} = selection
      return {...selection, subtitle: date}
    },
  },
})
