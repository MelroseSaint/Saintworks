import type { Node, StylePatch } from './types'
import { node, pad } from './factories'

// ---------------------------------------------------------------------------
// Pre-built page sections. Every section is a standalone, token-driven node
// tree so added sections inherit the global brand system automatically.
// ---------------------------------------------------------------------------

export interface SectionTemplate {
  id: string
  name: string
  icon: string
  description: string
  build: () => Node
}

function btn(text: string, href = '#', variant: 'primary' | 'outline' = 'primary'): Node {
  const base: StylePatch = {
    spacing: { padding: { top: 'SM', bottom: 'SM', left: 'MD', right: 'MD' } },
    typography: { fontToken: 'body', fontWeight: 600, fontSize: 15, align: 'center' },
    sizing: { width: 'fit-content' },
  }
  const style: StylePatch =
    variant === 'primary'
      ? {
          spacing: base.spacing,
          typography: { ...base.typography, colorToken: 'text.inverse' },
          background: { colorToken: 'accent', radiusToken: 'pill' },
          sizing: base.sizing,
        }
      : {
          spacing: base.spacing,
          typography: { ...base.typography, colorToken: 'accent' },
          background: { color: 'transparent', borderToken: 'accent', radiusToken: 'pill' },
          sizing: base.sizing,
        }
  return node({ type: 'button', name: text, tag: 'a', content: { text, href }, style })
}

function card(title: string, body: string): Node {
  return node({
    type: 'card',
    name: title,
    tag: 'div',
    style: {
      layout: { mode: 'flex', direction: 'vertical', gap: 'SM' },
      spacing: { padding: pad('LG') },
      background: { colorToken: 'surface', radiusToken: 'md', borderToken: 'default' },
    },
    children: [
      node({ type: 'heading', name: 'Card Title', tag: 'h3', content: { text: title }, style: { typography: { fontToken: 'heading', fontSize: 20 } } }),
      node({ type: 'text', name: 'Card Body', tag: 'p', content: { text: body }, style: { typography: { fontToken: 'body', fontSize: 15 } } }),
    ],
  })
}

function sectionHeader(eyebrow: string, title: string, subtitle?: string): Node[] {
  const kids: Node[] = []
  if (eyebrow) {
    kids.push(node({ type: 'text', name: 'Eyebrow', tag: 'p', content: { text: eyebrow }, style: { typography: { fontToken: 'eyebrow' } } }))
  }
  kids.push(node({ type: 'heading', name: 'Section Title', tag: 'h2', content: { text: title }, style: { typography: { fontToken: 'heading', fontSize: 36 } } }))
  if (subtitle) {
    kids.push(node({ type: 'text', name: 'Section Subtitle', tag: 'p', content: { text: subtitle }, style: { typography: { fontToken: 'body', fontSize: 17 }, sizing: { maxWidth: 640 } } }))
  }
  return kids
}

const sectionStyle = (background = 'background'): StylePatch => ({
  layout: { mode: 'flex', direction: 'vertical', gap: 'LG' },
  spacing: { padding: { top: 'XL', bottom: 'XL', left: 'LG', right: 'LG' } },
  background: { colorToken: background },
})

function buildHero(): Node {
  return node({
    type: 'section',
    name: 'Hero',
    tag: 'section',
    style: {
      layout: { mode: 'flex', direction: 'horizontal', align: 'center', justify: 'space-between', gap: 'XL' },
      spacing: { padding: { top: 'XL', bottom: 'XL', left: 'LG', right: 'LG' } },
      background: { colorToken: 'background' },
    },
    responsive: { mobile: { layout: { direction: 'vertical' } } },
    children: [
      node({
        type: 'container',
        name: 'Content',
        tag: 'div',
        style: { layout: { mode: 'flex', direction: 'vertical', gap: 'MD' }, sizing: { maxWidth: 560 } },
        children: [
          node({ type: 'text', name: 'Eyebrow', tag: 'p', content: { text: 'Introducing' }, style: { typography: { fontToken: 'eyebrow' } } }),
          node({ type: 'heading', name: 'Heading', tag: 'h1', content: { text: 'A headline that states your value clearly.' }, style: { typography: { fontToken: 'heading', fontSize: 52 } } }),
          node({ type: 'text', name: 'Description', tag: 'p', content: { text: 'Support your headline with a sentence that explains what you do and who it is for.' }, style: { typography: { fontToken: 'body', fontSize: 18 }, sizing: { maxWidth: 460 } } }),
          node({
            type: 'container',
            name: 'Buttons',
            tag: 'div',
            style: { layout: { mode: 'flex', direction: 'horizontal', gap: 'SM' } },
            children: [btn('Get Started', '#'), btn('Learn More', '#', 'outline')],
          }),
        ],
      }),
      node({
        type: 'image',
        name: 'Hero Image',
        tag: 'img',
        content: { src: 'https://placehold.co/520x380/E8F0ED/2F5D50?text=Hero', alt: 'Hero image' },
        style: { sizing: { width: 480, height: 380, fit: 'cover' }, background: { radiusToken: 'lg', shadowToken: 'lg' } },
      }),
    ],
  })
}

function buildAbout(): Node {
  return node({
    type: 'section',
    name: 'About',
    tag: 'section',
    style: sectionStyle('surface'),
    children: [
      ...sectionHeader('About us', 'The story behind the work.', 'A short, honest paragraph about who you are and why you do what you do.'),
      node({
        type: 'grid',
        name: 'Values Grid',
        tag: 'div',
        style: { layout: { mode: 'grid', columns: 3, gap: 'LG' } },
        children: [
          card('Craft', 'Care and attention in every detail.'),
          card('Clarity', 'Simple, honest communication.'),
          card('Care', 'We treat your project like our own.'),
        ],
      }),
    ],
  })
}

function buildServices(): Node {
  return node({
    type: 'section',
    name: 'Services',
    tag: 'section',
    style: sectionStyle(),
    children: [
      ...sectionHeader('Services', 'What we can do for you.', 'The things we do well, described in plain language.'),
      node({
        type: 'grid',
        name: 'Service Grid',
        tag: 'div',
        style: { layout: { mode: 'grid', columns: 3, gap: 'LG' } },
        children: [
          card('Strategy', 'Positioning and planning before we build.'),
          card('Design', 'Brand systems, components and layouts.'),
          card('Build', 'Structured, maintainable sites shipped to production.'),
        ],
      }),
    ],
  })
}

function buildFeatures(): Node {
  return node({
    type: 'section',
    name: 'Features',
    tag: 'section',
    style: sectionStyle('surface'),
    children: [
      ...sectionHeader('Features', 'Built for real work.'),
      node({
        type: 'grid',
        name: 'Feature Grid',
        tag: 'div',
        style: { layout: { mode: 'grid', columns: 3, gap: 'LG' } },
        children: [
          card('Tokens', 'One change updates the entire site.'),
          card('Components', 'Reusable, variant-driven building blocks.'),
          card('Content', 'Edit content without touching design.'),
        ],
      }),
    ],
  })
}

function buildTestimonials(): Node {
  const quote = (name: string, role: string, text: string): Node =>
    node({
      type: 'card',
      name: 'Testimonial',
      tag: 'div',
      style: {
        layout: { mode: 'flex', direction: 'vertical', gap: 'SM' },
        spacing: { padding: pad('LG') },
        background: { colorToken: 'surface', radiusToken: 'md', borderToken: 'default' },
      },
      children: [
        node({ type: 'text', name: 'Quote', tag: 'p', content: { text }, style: { typography: { fontToken: 'body', fontSize: 16 } } }),
        node({ type: 'heading', name: 'Name', tag: 'h3', content: { text: name }, style: { typography: { fontToken: 'heading', fontSize: 18 } } }),
        node({ type: 'text', name: 'Role', tag: 'p', content: { text: role }, style: { typography: { fontToken: 'body', fontSize: 14, colorToken: 'text.body' } } }),
      ],
    })
  return node({
    type: 'section',
    name: 'Testimonials',
    tag: 'section',
    style: sectionStyle(),
    children: [
      ...sectionHeader('Testimonials', 'What clients say.'),
      node({
        type: 'grid',
        name: 'Testimonial Grid',
        tag: 'div',
        style: { layout: { mode: 'grid', columns: 3, gap: 'LG' } },
        children: [
          quote('Alex Morgan', 'Founder, Acme', '“The best decision we made this year.”'),
          quote('Sam Rivera', 'Design Lead, Northline', '“Finally, a tool that respects the work.”'),
          quote('Jamie Lee', 'Head of Marketing', '“Everything stays in sync. It just works.”'),
        ],
      }),
    ],
  })
}

function buildPricing(): Node {
  const tier = (name: string, price: string, featured = false): Node =>
    node({
      type: 'card',
      name: `${name} Plan`,
      tag: 'div',
      style: {
        layout: { mode: 'flex', direction: 'vertical', gap: 'SM' },
        spacing: { padding: pad('LG') },
        background: featured ? { colorToken: 'accent', radiusToken: 'md' } : { colorToken: 'surface', radiusToken: 'md', borderToken: 'default' },
      },
      children: [
        node({ type: 'heading', name: 'Plan Name', tag: 'h3', content: { text: name }, style: { typography: { fontToken: 'heading', fontSize: 20, colorToken: featured ? 'text.inverse' : undefined } } }),
        node({ type: 'heading', name: 'Plan Price', tag: 'h4', content: { text: price }, style: { typography: { fontToken: 'heading', fontSize: 32, colorToken: featured ? 'text.inverse' : 'accent' } } }),
        node({ type: 'text', name: 'Plan Detail', tag: 'p', content: { text: 'Everything you need to get started.' }, style: { typography: { fontToken: 'body', fontSize: 15, colorToken: featured ? 'text.inverse' : undefined } } }),
        featured ? btn('Choose plan', '#', 'outline') : btn('Choose plan', '#'),
      ],
    })
  return node({
    type: 'section',
    name: 'Pricing',
    tag: 'section',
    style: sectionStyle('surface'),
    children: [
      ...sectionHeader('Pricing', 'Simple, honest pricing.'),
      node({
        type: 'grid',
        name: 'Pricing Grid',
        tag: 'div',
        style: { layout: { mode: 'grid', columns: 3, gap: 'LG' } },
        children: [tier('Starter', '$19/mo'), tier('Professional', '$49/mo', true), tier('Studio', '$99/mo')],
      }),
    ],
  })
}

function buildFaq(): Node {
  const item = (q: string, a: string): Node =>
    node({
      type: 'container',
      name: q,
      tag: 'div',
      style: {
        layout: { mode: 'flex', direction: 'vertical', gap: 'SM' },
        spacing: { padding: pad('MD') },
        background: { colorToken: 'surface', radiusToken: 'md', borderToken: 'default' },
      },
      children: [
        node({ type: 'heading', name: 'Question', tag: 'h3', content: { text: q }, style: { typography: { fontToken: 'heading', fontSize: 18 } } }),
        node({ type: 'text', name: 'Answer', tag: 'p', content: { text: a }, style: { typography: { fontToken: 'body', fontSize: 15 } } }),
      ],
    })
  return node({
    type: 'section',
    name: 'FAQ',
    tag: 'section',
    style: { ...sectionStyle(), sizing: { maxWidth: 760 } },
    children: [
      ...sectionHeader('FAQ', 'Common questions.'),
      item('How does it work?', 'Start with your brand, then build pages from components that inherit it.'),
      item('Can I change things later?', 'Yes — tokens and components update everywhere they are used.'),
      item('Is it really no-code?', 'The interface is visual, but the output is a structured, maintainable site.'),
    ],
  })
}

function buildGallery(): Node {
  const img = (label: string): Node =>
    node({
      type: 'image',
      name: label,
      tag: 'img',
      content: { src: `https://placehold.co/360x260/E8F0ED/2F5D50?text=${label}`, alt: label },
      style: { sizing: { width: '100%', height: 260, fit: 'cover' }, background: { radiusToken: 'md' } },
    })
  return node({
    type: 'section',
    name: 'Gallery',
    tag: 'section',
    style: sectionStyle(),
    children: [
      ...sectionHeader('Gallery', 'Recent work.'),
      node({
        type: 'grid',
        name: 'Gallery Grid',
        tag: 'div',
        style: { layout: { mode: 'grid', columns: 3, gap: 'MD' } },
        children: [img('Project 1'), img('Project 2'), img('Project 3'), img('Project 4'), img('Project 5'), img('Project 6')],
      }),
    ],
  })
}

function buildContact(): Node {
  const field = (label: string): Node =>
    node({
      type: 'input',
      name: label,
      tag: 'input',
      content: { text: label },
      style: {
        spacing: { padding: pad('SM') },
        background: { colorToken: 'surface', radiusToken: 'sm', borderToken: 'default' },
      },
    })
  return node({
    type: 'section',
    name: 'Contact',
    tag: 'section',
    style: { ...sectionStyle('surface'), sizing: { maxWidth: 640 } },
    children: [
      ...sectionHeader('Contact', 'Let’s talk.'),
      node({
        type: 'form',
        name: 'Contact Form',
        tag: 'form',
        style: { layout: { mode: 'flex', direction: 'vertical', gap: 'MD' } },
        children: [field('Name'), field('Email'), field('Message'), btn('Send message', '#')],
      }),
    ],
  })
}

function buildNewsletter(): Node {
  return node({
    type: 'section',
    name: 'Newsletter',
    tag: 'section',
    style: {
      layout: { mode: 'flex', direction: 'vertical', align: 'center', gap: 'MD' },
      spacing: { padding: { top: 'XL', bottom: 'XL', left: 'LG', right: 'LG' } },
      background: { colorToken: 'primary' },
    },
    children: [
      node({ type: 'heading', name: 'Newsletter Title', tag: 'h2', content: { text: 'Stay in the loop.' }, style: { typography: { fontToken: 'heading', fontSize: 32, colorToken: 'text.inverse', align: 'center' } } }),
      node({ type: 'text', name: 'Newsletter Copy', tag: 'p', content: { text: 'Occasional updates. No noise.' }, style: { typography: { fontToken: 'body', fontSize: 16, colorToken: 'text.inverse', align: 'center' } } }),
      node({
        type: 'container',
        name: 'Newsletter Form',
        tag: 'div',
        style: { layout: { mode: 'flex', direction: 'horizontal', gap: 'SM', align: 'center' } },
        children: [
          node({ type: 'input', name: 'Email', tag: 'input', content: { text: 'you@example.com' }, style: { spacing: { padding: pad('SM') }, background: { colorToken: 'surface', radiusToken: 'sm' }, sizing: { width: 260 } } }),
          btn('Subscribe', '#'),
        ],
      }),
    ],
  })
}

function buildCta(): Node {
  return node({
    type: 'section',
    name: 'Call to Action',
    tag: 'section',
    style: {
      layout: { mode: 'flex', direction: 'vertical', align: 'center', gap: 'MD' },
      spacing: { padding: { top: 'XL', bottom: 'XL', left: 'LG', right: 'LG' } },
      background: { colorToken: 'accent' },
    },
    children: [
      node({ type: 'heading', name: 'CTA Title', tag: 'h2', content: { text: 'Ready to start?' }, style: { typography: { fontToken: 'heading', fontSize: 40, colorToken: 'text.inverse', align: 'center' } } }),
      node({ type: 'text', name: 'CTA Copy', tag: 'p', content: { text: 'Let’s build something worth keeping.' }, style: { typography: { fontToken: 'body', fontSize: 18, colorToken: 'text.inverse', align: 'center' } } }),
      btn('Get in touch', '#'),
    ],
  })
}

function buildFooterSection(): Node {
  const link = (label: string): Node =>
    node({ type: 'link', name: label, tag: 'a', content: { text: label, href: '#' }, style: { typography: { fontToken: 'body', fontSize: 15, colorToken: 'text.inverse' } } })
  return node({
    type: 'section',
    name: 'Footer',
    tag: 'footer',
    style: {
      layout: { mode: 'flex', direction: 'horizontal', align: 'center', justify: 'space-between' },
      spacing: { padding: pad('XL') },
      background: { colorToken: 'primary' },
    },
    children: [
      node({ type: 'text', name: 'Wordmark', tag: 'div', content: { text: 'Your Brand' }, style: { typography: { fontToken: 'heading', fontSize: 18, colorToken: 'text.inverse' } } }),
      node({
        type: 'container',
        name: 'Footer Links',
        tag: 'nav',
        style: { layout: { mode: 'flex', direction: 'horizontal', gap: 'LG' } },
        children: [link('About'), link('Services'), link('Contact')],
      }),
      node({ type: 'text', name: 'Copyright', tag: 'p', content: { text: '© 2026 Your Brand. All rights reserved.' }, style: { typography: { fontToken: 'body', fontSize: 14, colorToken: 'text.inverse' } } }),
    ],
  })
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  { id: 'hero', name: 'Hero', icon: 'image', description: 'Headline, copy and call-to-action', build: buildHero },
  { id: 'about', name: 'About', icon: 'doc', description: 'Story and values', build: buildAbout },
  { id: 'services', name: 'Services', icon: 'grid', description: 'Offering cards', build: buildServices },
  { id: 'features', name: 'Features', icon: 'layers', description: 'Feature grid', build: buildFeatures },
  { id: 'testimonials', name: 'Testimonials', icon: 'component', description: 'Social proof quotes', build: buildTestimonials },
  { id: 'pricing', name: 'Pricing', icon: 'box', description: 'Tiered pricing cards', build: buildPricing },
  { id: 'faq', name: 'FAQ', icon: 'info', description: 'Question and answer', build: buildFaq },
  { id: 'gallery', name: 'Gallery', icon: 'image', description: 'Work grid', build: buildGallery },
  { id: 'contact', name: 'Contact', icon: 'link', description: 'Contact form', build: buildContact },
  { id: 'newsletter', name: 'Newsletter', icon: 'doc', description: 'Email capture band', build: buildNewsletter },
  { id: 'cta', name: 'Call to Action', icon: 'motion', description: 'Conversion band', build: buildCta },
  { id: 'footer', name: 'Footer', icon: 'layers', description: 'Site footer', build: buildFooterSection },
]
