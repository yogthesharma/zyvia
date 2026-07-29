import { ListStyleType } from "@platejs/list"
import { KEYS, normalizeStaticValue, type Value } from "platejs"

/** Showcase every block/mark enabled in the rich-editor playground. */
export const RICH_EDITOR_DEMO_VALUE: Value = normalizeStaticValue([
  {
    children: [{ text: "Rich text playground" }],
    type: KEYS.h1,
  },
  {
    children: [
      { text: "This document demos everything wired in the playground. Type " },
      { code: true, text: "/" },
      { text: " for slash commands, select text for the bubble menu, or " },
      { code: true, text: "@" },
      { text: " to mention." },
    ],
    type: KEYS.p,
  },

  // Headings
  {
    children: [{ text: "Headings" }],
    type: KEYS.h2,
  },
  {
    children: [{ text: "Heading 3" }],
    type: KEYS.h3,
  },
  {
    children: [{ text: "Heading 4" }],
    type: KEYS.h4,
  },
  {
    children: [{ text: "Heading 5" }],
    type: KEYS.h5,
  },
  {
    children: [{ text: "Heading 6" }],
    type: KEYS.h6,
  },

  // Marks
  {
    children: [{ text: "Inline marks" }],
    type: KEYS.h2,
  },
  {
    children: [
      { bold: true, text: "Bold" },
      { text: ", " },
      { italic: true, text: "italic" },
      { text: ", " },
      { text: "underline", underline: true },
      { text: ", " },
      { strikethrough: true, text: "strikethrough" },
      { text: ", " },
      { code: true, text: "inline code" },
      { text: ", " },
      { highlight: true, text: "highlight" },
      { text: ", " },
      { kbd: true, text: "⌘K" },
      { text: ", H" },
      { text: "2", subscript: true },
      { text: "O, and E=mc" },
      { text: "2", superscript: true },
      { text: "." },
    ],
    type: KEYS.p,
  },

  // Quote
  {
    children: [{ text: "Quote" }],
    type: KEYS.h2,
  },
  {
    children: [
      {
        children: [
          {
            text: "Slash commands, bubble menus, and mentions make editing feel Notion-like.",
          },
        ],
        type: KEYS.p,
      },
      {
        children: [
          {
            children: [
              {
                text: "Nested quotes keep hierarchy intact.",
              },
            ],
            type: KEYS.p,
          },
        ],
        type: KEYS.blockquote,
      },
    ],
    type: KEYS.blockquote,
  },

  // Mentions
  {
    children: [{ text: "Mentions" }],
    type: KEYS.h2,
  },
  {
    children: [
      { text: "Ping " },
      {
        children: [{ text: "" }],
        key: "0",
        type: KEYS.mention,
        value: "Ada Lovelace",
      },
      { text: " and " },
      {
        children: [{ text: "" }],
        key: "3",
        type: KEYS.mention,
        value: "Engineering",
      },
      { text: " when this ships." },
    ],
    type: KEYS.p,
  },

  // Lists
  {
    children: [{ text: "Lists" }],
    type: KEYS.h2,
  },
  {
    children: [{ text: "Bulleted list" }],
    indent: 1,
    listStyleType: ListStyleType.Disc,
    type: KEYS.p,
  },
  {
    children: [{ text: "Nested bullet" }],
    indent: 2,
    listStyleType: ListStyleType.Circle,
    type: KEYS.p,
  },
  {
    children: [{ text: "Numbered list" }],
    indent: 1,
    listStyleType: ListStyleType.Decimal,
    type: KEYS.p,
  },
  {
    children: [{ text: "Second numbered item" }],
    indent: 1,
    listStart: 2,
    listStyleType: ListStyleType.Decimal,
    type: KEYS.p,
  },
  {
    checked: true,
    children: [{ text: "Done todo item" }],
    indent: 1,
    listStyleType: "todo",
    type: KEYS.p,
  },
  {
    checked: false,
    children: [{ text: "Open todo item" }],
    indent: 1,
    listStyleType: "todo",
    type: KEYS.p,
  },

  {
    children: [{ text: "" }],
    type: KEYS.hr,
  },

  // Table
  {
    children: [{ text: "Table" }],
    type: KEYS.h2,
  },
  {
    children: [
      {
        children: [
          {
            children: [{ children: [{ text: "Feature" }], type: KEYS.p }],
            type: KEYS.th,
          },
          {
            children: [{ children: [{ text: "Status" }], type: KEYS.p }],
            type: KEYS.th,
          },
          {
            children: [{ children: [{ text: "Notes" }], type: KEYS.p }],
            type: KEYS.th,
          },
        ],
        type: KEYS.tr,
      },
      {
        children: [
          {
            children: [{ children: [{ text: "Slash menu" }], type: KEYS.p }],
            type: KEYS.td,
          },
          {
            children: [{ children: [{ text: "Ready" }], type: KEYS.p }],
            type: KEYS.td,
          },
          {
            children: [{ children: [{ text: "Type /" }], type: KEYS.p }],
            type: KEYS.td,
          },
        ],
        type: KEYS.tr,
      },
      {
        children: [
          {
            children: [{ children: [{ text: "Bubble menu" }], type: KEYS.p }],
            type: KEYS.td,
          },
          {
            children: [{ children: [{ text: "Ready" }], type: KEYS.p }],
            type: KEYS.td,
          },
          {
            children: [
              { children: [{ text: "Select any text" }], type: KEYS.p },
            ],
            type: KEYS.td,
          },
        ],
        type: KEYS.tr,
      },
      {
        children: [
          {
            children: [{ children: [{ text: "Uploads" }], type: KEYS.p }],
            type: KEYS.td,
          },
          {
            children: [{ children: [{ text: "Ready" }], type: KEYS.p }],
            type: KEYS.td,
          },
          {
            children: [
              {
                children: [{ text: "Custom dialog, mock blob URLs" }],
                type: KEYS.p,
              },
            ],
            type: KEYS.td,
          },
        ],
        type: KEYS.tr,
      },
    ],
    type: KEYS.table,
  },

  // Media
  {
    children: [{ text: "Media" }],
    type: KEYS.h2,
  },
  {
    children: [
      {
        text: "Image, video, audio, and file nodes below. Re-upload via / → Media.",
      },
    ],
    type: KEYS.p,
  },
  {
    children: [{ text: "" }],
    type: KEYS.img,
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    width: 560,
  },
  {
    children: [{ text: "" }],
    isUpload: false,
    type: KEYS.video,
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    width: 560,
  },
  {
    children: [{ text: "" }],
    type: KEYS.audio,
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    children: [{ text: "" }],
    name: "product-brief.pdf",
    type: KEYS.file,
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    children: [{ text: "" }],
    type: KEYS.mediaEmbed,
    url: "https://twitter.com/platejs/status/1629611871834312705",
  },

  // Closing
  {
    children: [{ text: "Try editing" }],
    type: KEYS.h2,
  },
  {
    children: [
      {
        text: "Delete sections, insert new blocks with slash commands, or turn paragraphs into headings from the bubble menu.",
      },
    ],
    type: KEYS.p,
  },
])
