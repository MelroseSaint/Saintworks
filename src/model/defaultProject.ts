import type {
  Collection,
  ComponentDef,
  ID,
  Layout,
  Node,
  Page,
  Project,
} from './types'
import { emptyStyle, mergeStyle, node, pad, uid, type NodeSeed } from './factories'

function svgDataUri(
  w: number,
  h: number,
  c1: string,
  c2: string,
  label: string,
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><text x="50%" y="50%" fill="rgba(255,255,255,0.92)" font-family="system-ui, sans-serif" font-size="${Math.round(h / 14)}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const ACCENT = '#2F5D50'
const ACCENT_DARK = '#1A3D34'

const now = new Date().toISOString()

export function createDefaultProject(): Project {
  // ---------------------------------------------------------------- Brand
  const brand = {
    name: 'SaintWorks',
    tagline: 'Craft exceptional digital experiences.',
    logoAssetId: null,
    voice: {
      tone: 'Confident, clear, human',
      keywords: ['modern', 'considered', 'precise', 'approachable'],
    },
    imageryRules: 'Bold gradients over photography; generous whitespace.',
  }

  // --------------------------------------------------------------- Tokens
  const tokens = {
    colors: {
      primary: '#0F172A',
    accent: '#2F5D50',
    'accent.soft': '#E8F0ED',
      background: '#FFFFFF',
      surface: '#F8FAFC',
      'text.primary': '#0F172A',
      'text.body': '#475569',
      'text.inverse': '#FFFFFF',
      border: '#E2E8F0',
    },
    fonts: {
      display: {
        id: 'display',
        name: 'Sora',
        stack: "'Sora', 'Inter', system-ui, sans-serif",
      },
      inter: {
        id: 'inter',
        name: 'Inter',
        stack: "'Inter', system-ui, -apple-system, sans-serif",
      },
    },
    textStyles: {
      heading: {
        id: 'heading',
        name: 'Heading',
        familyId: 'display',
        weight: 700,
        size: 48,
        lineHeight: 1.1,
        letterSpacing: -0.02,
        colorToken: 'text.primary',
      },
      body: {
        id: 'body',
        name: 'Body',
        familyId: 'inter',
        weight: 400,
        size: 16,
        lineHeight: 1.6,
        letterSpacing: 0,
        colorToken: 'text.body',
      },
      eyebrow: {
        id: 'eyebrow',
        name: 'Eyebrow',
        familyId: 'inter',
        weight: 600,
        size: 13,
        lineHeight: 1.4,
        letterSpacing: 0.08,
        colorToken: 'accent',
      },
    },
    spacing: {
      XS: 4,
      SM: 8,
      MD: 16,
      LG: 24,
      XL: 48,
      XXL: 96,
    },
    radius: {
      sm: 6,
      md: 12,
      lg: 24,
      pill: 999,
    },
    shadows: {
      sm: '0 1px 3px rgba(15,23,42,0.12)',
      md: '0 8px 24px rgba(15,23,42,0.10)',
      lg: '0 24px 48px rgba(15,23,42,0.16)',
    },
    borders: {
      default: '1px solid #E2E8F0',
      accent: '1px solid #2F5D50',
    },
    breakpoints: { desktop: 1280, tablet: 768, mobile: 390 },
    motion: {
      fast: { duration: 250, easing: 'ease-out' },
      base: { duration: 400, easing: 'ease-in-out' },
      slow: { duration: 700, easing: 'ease-in-out' },
    },
  }

  // -------------------------------------------------------------- Button
  const buttonRoot = node({
    type: 'button',
    name: 'Button',
    tag: 'a',
    content: { text: 'Button', href: '#', alt: '' },
    style: {
      layout: { mode: 'block' },
      spacing: {
        padding: { top: 'SM', bottom: 'SM', left: 'MD', right: 'MD' },
      },
      typography: {
        fontToken: 'body',
        fontWeight: 600,
        fontSize: 15,
        align: 'center',
      },
      background: { colorToken: 'accent', radiusToken: 'pill' },
      sizing: { width: 'fit-content' },
    },
  })
  const buttonId = uid()
  const button: ComponentDef = {
    id: buttonId,
    name: 'Button',
    category: 'Buttons',
    description: 'Primary call-to-action button',
    propsSchema: [
      { key: 'Label', label: 'Label', type: 'text', default: 'Get Started' },
      { key: 'Link', label: 'Link', type: 'link', default: '#' },
    ],
    variants: [
      {
        id: 'btn-primary',
        name: 'Primary',
        styleOverrides: {
          background: { colorToken: 'accent' },
          typography: { colorToken: 'text.inverse' },
        },
      },
      {
        id: 'btn-secondary',
        name: 'Secondary',
        styleOverrides: {
          background: { colorToken: 'surface', borderToken: 'default' },
          typography: { colorToken: 'text.primary' },
        },
      },
      {
        id: 'btn-outline',
        name: 'Outline',
        styleOverrides: {
          background: { color: 'transparent', borderToken: 'accent' },
          typography: { colorToken: 'accent' },
        },
      },
      {
        id: 'btn-ghost',
        name: 'Ghost',
        styleOverrides: {
          background: { color: 'transparent' },
          typography: { colorToken: 'accent' },
        },
      },
    ],
    rootNode: buttonRoot,
    propBindings: { Label: [buttonRoot.id], Link: [buttonRoot.id] },
  }

  // -------------------------------------------------------------- Header
  const headerNode = node({
    type: 'section',
    name: 'Header',
    tag: 'header',
    style: {
      layout: {
        mode: 'flex',
        direction: 'horizontal',
        align: 'center',
        justify: 'space-between',
      },
      spacing: {
        padding: { top: 'SM', bottom: 'SM', left: 'LG', right: 'LG' },
      },
      background: { colorToken: 'background', borderToken: 'default' },
    },
    children: [
      {
        type: 'text',
        name: 'Wordmark',
        tag: 'div',
        content: { text: 'SaintWorks' },
        style: {
          typography: { fontToken: 'heading', fontSize: 20, colorToken: 'primary' },
        },
      },
      {
        type: 'container',
        name: 'Nav',
        tag: 'nav',
        style: {
          layout: {
            mode: 'flex',
            direction: 'horizontal',
            align: 'center',
            justify: 'center',
            gap: 'LG',
          },
        },
        children: [
          {
            type: 'link',
            name: 'Home',
            tag: 'a',
            content: { text: 'Home', href: '/' },
            style: { typography: { fontToken: 'body', fontSize: 15 } },
          },
          {
            type: 'link',
            name: 'About',
            tag: 'a',
            content: { text: 'About', href: '/about' },
            style: { typography: { fontToken: 'body', fontSize: 15 } },
          },
          {
            type: 'link',
            name: 'Services',
            tag: 'a',
            content: { text: 'Services', href: '/services' },
            style: { typography: { fontToken: 'body', fontSize: 15 } },
          },
          {
            type: 'link',
            name: 'Contact',
            tag: 'a',
            content: { text: 'Contact', href: '/contact' },
            style: { typography: { fontToken: 'body', fontSize: 15 } },
          },
        ],
      },
      {
        type: 'button',
        name: 'Header CTA',
        tag: 'a',
        content: { text: 'Get Started', href: '/contact' },
        style: {
          spacing: {
            padding: { top: 'SM', bottom: 'SM', left: 'MD', right: 'MD' },
          },
          typography: { fontToken: 'body', fontWeight: 600, fontSize: 15, align: 'center' },
          background: { colorToken: 'accent', radiusToken: 'pill' },
          sizing: { width: 'fit-content' },
        },
      },
    ],
  })
  const header: ComponentDef = {
    id: uid(),
    name: 'Header',
    category: 'Navigation',
    description: 'Site header with navigation',
    propsSchema: [],
    variants: [],
    rootNode: headerNode,
    propBindings: {},
  }

  // -------------------------------------------------------------- Footer
  const footer: ComponentDef = {
    id: uid(),
    name: 'Footer',
    category: 'Navigation',
    description: 'Site footer',
    propsSchema: [],
    variants: [],
    rootNode: node({
      type: 'section',
      name: 'Footer',
      tag: 'footer',
      style: {
        layout: {
          mode: 'flex',
          direction: 'horizontal',
          align: 'center',
          justify: 'space-between',
        },
        spacing: { padding: pad('XL') },
        background: { colorToken: 'primary' },
      },
      children: [
        {
          type: 'text',
          name: 'Footer Wordmark',
          tag: 'div',
          content: { text: 'SaintWorks' },
          style: {
            typography: { fontToken: 'heading', fontSize: 18, colorToken: 'text.inverse' },
          },
        },
        {
          type: 'text',
          name: 'Copyright',
          tag: 'p',
          content: { text: '© 2026 SaintWorks. All rights reserved.' },
          style: {
            typography: { fontToken: 'body', fontSize: 14, colorToken: 'text.inverse' },
          },
        },
      ],
    }),
    propBindings: {},
  }

  // ---------------------------------------------------------------- Hero
  const heroHeading = node({
    type: 'heading',
    name: 'Hero Heading',
    tag: 'h1',
    content: { text: 'Build your brand, visually.' },
    style: { typography: { fontToken: 'heading', fontSize: 56 } },
  })
  heroHeading.responsive = {
    mobile: { typography: { fontSize: 40 } },
  }

  const hero: ComponentDef = {
    id: uid(),
    name: 'Hero',
    category: 'Heroes',
    description: 'Split hero with headline, copy and CTA',
    propsSchema: [
      {
        key: 'Eyebrow',
        label: 'Eyebrow',
        type: 'text',
        default: 'The visual dev environment',
      },
      {
        key: 'Heading',
        label: 'Heading',
        type: 'text',
        default: 'Build your brand, visually.',
      },
      {
        key: 'Description',
        label: 'Description',
        type: 'text',
        default:
          'Design tokens, reusable components and live pages — everything stays in sync.',
      },
      {
        key: 'Primary CTA',
        label: 'Primary CTA',
        type: 'text',
        default: 'Get Started',
      },
      {
        key: 'Secondary CTA',
        label: 'Secondary CTA',
        type: 'text',
        default: 'Learn More',
      },
    ],
    variants: [],
    rootNode: (() => {
      const eyebrow = node({
        type: 'text',
        name: 'Eyebrow',
        tag: 'p',
        content: { text: 'The visual dev environment' },
        style: { typography: { fontToken: 'eyebrow' } },
      })
      const desc = node({
        type: 'text',
        name: 'Description',
        tag: 'p',
        content: {
          text: 'Design tokens, reusable components and live pages — everything stays in sync.',
        },
        style: {
          typography: { fontToken: 'body', fontSize: 18 },
          sizing: { maxWidth: 460 },
        },
      })
      const primary = node({
        type: 'button',
        name: 'Primary CTA',
        tag: 'a',
        content: { text: 'Get Started', href: '/contact' },
        style: {
          spacing: {
            padding: { top: 'SM', bottom: 'SM', left: 'MD', right: 'MD' },
          },
          typography: {
            fontToken: 'body',
            fontWeight: 600,
            fontSize: 15,
            align: 'center',
            colorToken: 'text.inverse',
          },
          background: { colorToken: 'accent', radiusToken: 'pill' },
          sizing: { width: 'fit-content' },
        },
      })
      const secondary = node({
        type: 'button',
        name: 'Secondary CTA',
        tag: 'a',
        content: { text: 'Learn More', href: '/about' },
        style: {
          spacing: {
            padding: { top: 'SM', bottom: 'SM', left: 'MD', right: 'MD' },
          },
          typography: {
            fontToken: 'body',
            fontWeight: 600,
            fontSize: 15,
            align: 'center',
            colorToken: 'accent',
          },
          background: {
            color: 'transparent',
            borderToken: 'accent',
            radiusToken: 'pill',
          },
          sizing: { width: 'fit-content' },
        },
      })
      const buttons = node({
        type: 'container',
        name: 'Buttons',
        tag: 'div',
        style: {
          layout: { mode: 'flex', direction: 'horizontal', gap: 'SM' },
        },
        children: [primary, secondary],
      })
      const content = node({
        type: 'container',
        name: 'Content',
        tag: 'div',
        style: {
          layout: { mode: 'flex', direction: 'vertical', gap: 'MD' },
          sizing: { maxWidth: 560 },
        },
        children: [eyebrow, heroHeading, desc, buttons],
      })
      const image = node({
        type: 'image',
        name: 'Hero Image',
        tag: 'img',
        content: {
          src: svgDataUri(520, 380, '#2F5D50', '#0F172A', 'SaintWorks'),
          alt: 'Abstract brand graphic',
        },
        style: {
          sizing: { width: 480, height: 380, fit: 'cover' },
          background: { radiusToken: 'lg', shadowToken: 'lg' },
        },
      })
      const root = node({
        type: 'section',
        name: 'Hero',
        tag: 'section',
        style: {
          layout: {
            mode: 'flex',
            direction: 'horizontal',
            align: 'center',
            justify: 'space-between',
            gap: 'XL',
          },
          spacing: {
            padding: { top: 'XL', bottom: 'XL', left: 'LG', right: 'LG' },
          },
          background: { colorToken: 'background' },
        },
        children: [content, image],
      })
      root.responsive = { mobile: { layout: { direction: 'vertical' } } }
      return root
    })(),
    propBindings: {},
  }
  // bind hero props to their nodes
  const heroMap: Record<string, string> = {}
  for (const n of hero.rootNode.children) {
    if (n.type === 'container' && n.name === 'Content') {
      for (const c of n.children) {
        heroMap[c.name] = c.id
        if (c.name === 'Buttons') {
          const b = c.children
          heroMap['Primary CTA'] = b[0].id
          heroMap['Secondary CTA'] = b[1].id
        }
      }
    }
  }
  hero.propBindings = {
    Eyebrow: [heroMap['Eyebrow']],
    Heading: [heroMap['Hero Heading']],
    Description: [heroMap['Description']],
    'Primary CTA': [heroMap['Primary CTA']],
    'Secondary CTA': [heroMap['Secondary CTA']],
  }

  // ---------------------------------------------------------------- Card
  const card: ComponentDef = {
    id: uid(),
    name: 'Card',
    category: 'Content',
    description: 'Content card with title and body',
    propsSchema: [
      { key: 'Title', label: 'Title', type: 'text', default: 'Card title' },
      { key: 'Body', label: 'Body', type: 'text', default: 'Card description.' },
    ],
    variants: [],
    rootNode: (() => {
      const title = node({
        type: 'heading',
        name: 'Card Title',
        tag: 'h3',
        content: { text: 'Card title' },
        style: { typography: { fontToken: 'heading', fontSize: 20 } },
      })
      const body = node({
        type: 'text',
        name: 'Card Body',
        tag: 'p',
        content: { text: 'Card description.' },
        style: { typography: { fontToken: 'body', fontSize: 15 } },
      })
      return node({
        type: 'card',
        name: 'Card',
        tag: 'div',
        style: {
          layout: { mode: 'flex', direction: 'vertical', gap: 'SM' },
          spacing: { padding: pad('LG') },
          background: {
            colorToken: 'surface',
            radiusToken: 'md',
            borderToken: 'default',
          },
        },
        children: [title, body],
      })
    })(),
    propBindings: {},
  }
  {
    const map: Record<string, string> = {}
    for (const c of card.rootNode.children) map[c.name] = c.id
    card.propBindings = {
      Title: [map['Card Title']],
      Body: [map['Card Body']],
    }
  }

  // ------------------------------------------------------------ Layouts
  const makeLayout = (
    name: string,
    headerId: ID,
    footerId: ID,
    wide?: boolean,
  ): Layout => {
    const slot = node({
      type: 'container',
      name: 'Page Content',
      tag: 'main',
      style: {
        layout: { mode: 'block' },
        sizing: { maxWidth: wide ? 1280 : 1280 },
      },
    }) as Node & { isSlot?: boolean }
    slot.isSlot = true
    const frame = node({
      type: 'section',
      name: name,
      tag: 'div',
      style: { layout: { mode: 'flex', direction: 'vertical' } },
    })
    // Assign children directly so the slot's isSlot flag survives
    frame.children = [
      {
        ...node({ type: 'container', name: 'Header Slot', tag: 'div', style: { layout: { mode: 'block' } } }),
        instance: {
          componentId: headerId,
          variantId: undefined,
          props: {},
          nodeOverrides: {},
        },
      },
      slot,
      {
        ...node({ type: 'container', name: 'Footer Slot', tag: 'div', style: { layout: { mode: 'block' } } }),
        instance: {
          componentId: footerId,
          variantId: undefined,
          props: {},
          nodeOverrides: {},
        },
      },
    ]
    return { id: uid(), name, frame }
  }
  const mainLayout = makeLayout('Main', header.id, footer.id)

  // ------------------------------------------------------- Collections
  const testimonials: Collection = {
    id: uid(),
    name: 'Testimonials',
    fields: [
      { key: 'Name', label: 'Name', type: 'text' },
      { key: 'Role', label: 'Role', type: 'text' },
      { key: 'Company', label: 'Company', type: 'text' },
      { key: 'Quote', label: 'Quote', type: 'longtext' },
    ],
    records: [
      {
        id: uid(),
        values: {
          Name: 'Maya Chen',
          Role: 'Head of Design',
          Company: 'Loopwork',
          Quote:
            'We replaced four tools with one canvas. The brand tokens alone saved us weeks.',
        },
      },
      {
        id: uid(),
        values: {
          Name: 'Jonas Berg',
          Role: 'Founder',
          Company: 'Fieldnote',
          Quote:
            'It feels like a real dev environment — but I never touched a line of code.',
        },
      },
      {
        id: uid(),
        values: {
          Name: 'Priya Nair',
          Role: 'Marketing Lead',
          Company: 'Orbit Labs',
          Quote:
            'Changing the accent color updated every button across every page. Instant.',
        },
      },
    ],
  }

  // ------------------------------------------------------------- Pages
  const makePage = (
    name: string,
    route: string,
    seoTitle: string,
    layoutId: ID,
    nodes: Node[],
  ): Page => ({
    id: uid(),
    name,
    route,
    layoutId,
    seo: { title: seoTitle, description: `${name} page for SaintWorks.` },
    nodes,
  })

  // --- Home
  const homeHeroInstance: Node = {
    ...node({ type: 'section', name: 'Hero', tag: 'section', content: {} }),
    instance: {
      componentId: hero.id,
      variantId: undefined,
      props: {
        Eyebrow: 'The visual dev environment',
        Heading: 'Build your brand, visually.',
        Description:
          'Design tokens, reusable components and live pages — everything stays in sync.',
        'Primary CTA': 'Get Started',
        'Secondary CTA': 'Learn More',
      },
      nodeOverrides: {},
    },
  }

  const servicesSection = node({
    type: 'section',
    name: 'Services',
    tag: 'section',
    style: {
      layout: { mode: 'flex', direction: 'vertical', gap: 'LG' },
      spacing: {
        padding: { top: 'XL', bottom: 'XL', left: 'LG', right: 'LG' },
      },
      background: { colorToken: 'surface' },
    },
    children: [
      {
        type: 'heading',
        name: 'Section Title',
        tag: 'h2',
        content: { text: 'Everything you need to ship' },
        style: { typography: { fontToken: 'heading', fontSize: 36 } },
      },
      {
        type: 'grid',
        name: 'Service Grid',
        tag: 'div',
        style: {
          layout: { mode: 'grid', columns: 3, gap: 'LG' },
        },
        children: [
          {
            type: 'card',
            name: 'Brand',
            tag: 'div',
            style: {
              layout: { mode: 'flex', direction: 'vertical', gap: 'SM' },
              spacing: { padding: pad('LG') },
              background: {
                colorToken: 'background',
                radiusToken: 'md',
                borderToken: 'default',
              },
            },
            children: [
              {
                type: 'heading',
                name: 'Card Title',
                tag: 'h3',
                content: { text: 'Brand' },
                style: { typography: { fontToken: 'heading', fontSize: 20 } },
              },
              {
                type: 'text',
                name: 'Card Body',
                tag: 'p',
                content: { text: 'Tokens, voice and identity as the single source of truth.' },
                style: { typography: { fontToken: 'body', fontSize: 15 } },
              },
            ],
          },
          {
            type: 'card',
            name: 'Design',
            tag: 'div',
            style: {
              layout: { mode: 'flex', direction: 'vertical', gap: 'SM' },
              spacing: { padding: pad('LG') },
              background: {
                colorToken: 'background',
                radiusToken: 'md',
                borderToken: 'default',
              },
            },
            children: [
              {
                type: 'heading',
                name: 'Card Title',
                tag: 'h3',
                content: { text: 'Design' },
                style: { typography: { fontToken: 'heading', fontSize: 20 } },
              },
              {
                type: 'text',
                name: 'Card Body',
                tag: 'p',
                content: { text: 'Components, variants and layouts you can restyle globally.' },
                style: { typography: { fontToken: 'body', fontSize: 15 } },
              },
            ],
          },
          {
            type: 'card',
            name: 'Ship',
            tag: 'div',
            style: {
              layout: { mode: 'flex', direction: 'vertical', gap: 'SM' },
              spacing: { padding: pad('LG') },
              background: {
                colorToken: 'background',
                radiusToken: 'md',
                borderToken: 'default',
              },
            },
            children: [
              {
                type: 'heading',
                name: 'Card Title',
                tag: 'h3',
                content: { text: 'Ship' },
                style: { typography: { fontToken: 'heading', fontSize: 20 } },
              },
              {
                type: 'text',
                name: 'Card Body',
                tag: 'p',
                content: { text: 'Validate, build and publish a real structured project.' },
                style: { typography: { fontToken: 'body', fontSize: 15 } },
              },
            ],
          },
        ],
      },
    ],
  })

  const testimonialsSection = node({
    type: 'section',
    name: 'Testimonials',
    tag: 'section',
    style: {
      layout: { mode: 'flex', direction: 'vertical', gap: 'LG' },
      spacing: {
        padding: { top: 'XL', bottom: 'XL', left: 'LG', right: 'LG' },
      },
      background: { colorToken: 'background' },
    },
    children: [
      {
        type: 'heading',
        name: 'Section Title',
        tag: 'h2',
        content: { text: 'Loved by teams' },
        style: { typography: { fontToken: 'heading', fontSize: 36 } },
      },
      {
        type: 'grid',
        name: 'Testimonial Grid',
        tag: 'div',
        style: { layout: { mode: 'grid', columns: 3, gap: 'LG' } },
        dataBinding: { collectionId: testimonials.id, mode: 'repeat' },
        children: [
          {
            type: 'card',
            name: 'Testimonial Card',
            tag: 'div',
            style: {
              layout: { mode: 'flex', direction: 'vertical', gap: 'SM' },
              spacing: { padding: pad('LG') },
              background: {
                colorToken: 'surface',
                radiusToken: 'md',
                borderToken: 'default',
              },
            },
            children: [
              {
                type: 'text',
                name: 'Quote',
                tag: 'p',
                content: { text: '{{Quote}}' },
                style: { typography: { fontToken: 'body', fontSize: 16 } },
              },
              {
                type: 'heading',
                name: 'Name',
                tag: 'h3',
                content: { text: '{{Name}}' },
                style: { typography: { fontToken: 'heading', fontSize: 18 } },
              },
              {
                type: 'text',
                name: 'Role',
                tag: 'p',
                content: { text: '{{Role}}, {{Company}}' },
                style: {
                  typography: { fontToken: 'body', fontSize: 14, colorToken: 'text.body' },
                },
              },
            ],
          },
        ],
      },
    ],
  })

  const home = makePage('Home', '/', 'SaintWorks — Build your brand, visually.', mainLayout.id, [
    homeHeroInstance,
    servicesSection,
    testimonialsSection,
  ])

  // --- About / Services / Contact
  const pageIntro = (
    title: string,
    body: string,
  ): Node =>
    node({
      type: 'section',
      name: 'Page Intro',
      tag: 'section',
      style: {
        layout: { mode: 'flex', direction: 'vertical', gap: 'MD' },
        spacing: {
          padding: { top: 'XL', bottom: 'LG', left: 'LG', right: 'LG' },
        },
      },
      children: [
        {
          type: 'heading',
          name: 'Page Title',
          tag: 'h1',
          content: { text: title },
          style: { typography: { fontToken: 'heading', fontSize: 44 } },
        },
        {
          type: 'text',
          name: 'Page Body',
          tag: 'p',
          content: { text: body },
          style: {
            typography: { fontToken: 'body', fontSize: 18 },
            sizing: { maxWidth: 640 },
          },
        },
      ],
    })

  const featureCard = (title: string, body: string): NodeSeed => ({
    type: 'card',
    name: title,
    tag: 'div',
    style: {
      layout: { mode: 'flex', direction: 'vertical', gap: 'SM' },
      spacing: { padding: pad('LG') },
      background: {
        colorToken: 'background',
        radiusToken: 'md',
        borderToken: 'default',
      },
    },
    children: [
      {
        type: 'heading',
        name: 'Card Title',
        tag: 'h3',
        content: { text: title },
        style: { typography: { fontToken: 'heading', fontSize: 20 } },
      },
      {
        type: 'text',
        name: 'Card Body',
        tag: 'p',
        content: { text: body },
        style: { typography: { fontToken: 'body', fontSize: 15 } },
      },
    ],
  })

  const cardGrid = (title: string, subtitle: string, cards: NodeSeed[]): Node =>
    node({
      type: 'section',
      name: title,
      tag: 'section',
      style: {
        layout: { mode: 'flex', direction: 'vertical', gap: 'LG' },
        spacing: {
          padding: { top: 'XL', bottom: 'XL', left: 'LG', right: 'LG' },
        },
        background: { colorToken: 'surface' },
      },
      children: [
        {
          type: 'heading',
          name: 'Section Title',
          tag: 'h2',
          content: { text: title },
          style: { typography: { fontToken: 'heading', fontSize: 32 } },
        },
        {
          type: 'text',
          name: 'Section Subtitle',
          tag: 'p',
          content: { text: subtitle },
          style: {
            typography: { fontToken: 'body', fontSize: 17 },
            sizing: { maxWidth: 640 },
          },
        },
        {
          type: 'grid',
          name: `${title} Grid`,
          tag: 'div',
          style: { layout: { mode: 'grid', columns: 3, gap: 'LG' } },
          children: cards,
        },
      ],
    })

  const about = makePage(
    'About',
    '/about',
    'About SaintWorks',
    mainLayout.id,
    [
      pageIntro(
        'A workspace for the craft of the web.',
        'SaintWorks brings your brand, design system, and website into one connected workspace — so what you design is what you ship, without hand-offs or drift.',
      ),
      cardGrid(
        'What we believe',
        'Three principles that keep the work honest.',
        [
          featureCard('Brand first', 'Your brand is the source of truth. Every color, font, and component inherits from it — change it once and the whole site follows.'),
          featureCard('You own the work', 'No black boxes. Your project, content, and design system belong to you, and the structured output is yours to keep.'),
          featureCard('Built to ship', 'Validate, build, and publish a real, maintainable site — not a locked-in template you can’t touch.'),
        ],
      ),
    ],
  )

  const services = makePage(
    'Services',
    '/services',
    'Services — SaintWorks',
    mainLayout.id,
    [
      pageIntro(
        'From first idea to published site.',
        'SaintWorks covers the full journey — brand, design system, content, and build — in a single visual workspace.',
      ),
      cardGrid(
        'What we do',
        'Three connected layers, one workflow.',
        [
          featureCard('Brand system', 'Identity, color, typography, voice, and imagery rules — defined once and inherited everywhere.'),
          featureCard('Design system', 'Tokens, components, and layouts that turn your brand into a reusable, consistent language.'),
          featureCard('Website build', 'Pages, content, routing, and publishing — assembled visually and exported as structured code.'),
        ],
      ),
    ],
  )

  const contact = makePage(
    'Contact',
    '/contact',
    'Contact SaintWorks',
    mainLayout.id,
    [
      pageIntro(
        'Start the conversation.',
        'Tell us what you’re building and we’ll help you find the right shape for it. We reply within one business day.',
      ),
      node({
        type: 'section',
        name: 'Contact Form',
        tag: 'section',
        style: {
          layout: { mode: 'flex', direction: 'vertical', gap: 'MD' },
          spacing: {
            padding: { bottom: 'XL', left: 'LG', right: 'LG' },
          },
          sizing: { maxWidth: 520 },
        },
        children: [
          {
            type: 'form',
            name: 'Form',
            tag: 'form',
            style: {
              layout: { mode: 'flex', direction: 'vertical', gap: 'MD' },
            },
            children: [
              {
                type: 'input',
                name: 'Name',
                tag: 'input',
                content: { text: 'Your name' },
                style: {
                  spacing: { padding: pad('SM') },
                  background: {
                    colorToken: 'surface',
                    radiusToken: 'sm',
                    borderToken: 'default',
                  },
                },
              },
              {
                type: 'input',
                name: 'Email',
                tag: 'input',
                content: { text: 'you@example.com' },
                style: {
                  spacing: { padding: pad('SM') },
                  background: {
                    colorToken: 'surface',
                    radiusToken: 'sm',
                    borderToken: 'default',
                  },
                },
              },
              {
                type: 'button',
                name: 'Submit',
                tag: 'button',
                content: { text: 'Send message' },
                style: {
                  spacing: {
                    padding: { top: 'SM', bottom: 'SM', left: 'MD', right: 'MD' },
                  },
                  typography: {
                    fontToken: 'body',
                    fontWeight: 600,
                    fontSize: 15,
                    align: 'center',
                    colorToken: 'text.inverse',
                  },
                  background: { colorToken: 'accent', radiusToken: 'pill' },
                  sizing: { width: 'fit-content' },
                },
              },
            ],
          },
        ],
      }),
    ],
  )

  const pages: Record<ID, Page> = {}
  for (const p of [home, about, services, contact]) pages[p.id] = p

  // ------------------------------------------------------- Assemble
  return {
    id: uid(),
    name: 'SaintWorks',
    version: 1,
    brand,
    tokens,
    components: {
      [button.id]: button,
      [header.id]: header,
      [footer.id]: footer,
      [hero.id]: hero,
      [card.id]: card,
    },
    layouts: { [mainLayout.id]: mainLayout },
    pages,
    pageOrder: [home.id, about.id, services.id, contact.id],
    assets: {},
    collections: { [testimonials.id]: testimonials },
    interactions: {},
    navigation: [
      { label: 'Home', pageId: home.id },
      { label: 'About', pageId: about.id },
      { label: 'Services', pageId: services.id },
      { label: 'Contact', pageId: contact.id },
    ],
    settings: {
      homepageId: home.id,
      siteTitle: 'SaintWorks',
      publishedAt: null,
    },
    createdAt: now,
    updatedAt: now,
  }
}
