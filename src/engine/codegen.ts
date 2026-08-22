import type { ComponentDef, Node, Project, StyleModel } from '../model/types'
import { length, styleToCss } from '../model/resolve'

export interface GeneratedFile {
  path: string
  content: string
  language: 'jsx' | 'css' | 'json' | 'ts'
}

const pascal = (s: string) =>
  s
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\s+/g, '')

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Build a JSX style object using CSS variables wherever a token is referenced
function styleObject(node: Node, tokens: Project['tokens']): string {
  const entries: string[] = []
  const s = node.style
  const push = (k: string, v: string) => entries.push(`${k}: ${v}`)

  if (s.layout.mode === 'flex') {
    push('display', "'flex'")
    if (s.layout.direction) push('flexDirection', s.layout.direction === 'horizontal' ? "'row'" : "'column'")
    if (s.layout.align) push('alignItems', `'${alignMap(s.layout.align)}'`)
    if (s.layout.justify) push('justifyContent', `'${alignMap(s.layout.justify)}'`)
    if (s.layout.gap !== undefined) push('gap', `'var(--space-${String(s.layout.gap).toLowerCase()})'`)
  } else if (s.layout.mode === 'grid') {
    push('display', "'grid'")
    if (s.layout.columns) push('gridTemplateColumns', `'repeat(${s.layout.columns}, 1fr)'`)
    if (s.layout.gap !== undefined) push('gap', `'var(--space-${String(s.layout.gap).toLowerCase()})'`)
  }
  if (s.sizing.width !== undefined) push('width', cssVal(s.sizing.width))
  if (s.sizing.maxWidth !== undefined) push('maxWidth', cssVal(s.sizing.maxWidth))
  if (s.sizing.height !== undefined) push('height', cssVal(s.sizing.height))
  if (s.spacing.padding) {
    push('padding', boxVal(s.spacing.padding))
  }
  if (s.spacing.margin) {
    push('margin', boxVal(s.spacing.margin))
  }
  if (s.typography.fontToken) {
    const ts = tokens.textStyles[s.typography.fontToken]
    if (ts) {
      push('fontFamily', `'var(--font-${s.typography.fontToken})'`)
      push('fontWeight', String(s.typography.fontWeight ?? ts.weight))
    }
  }
  if (s.typography.fontSize !== undefined) push('fontSize', `'${s.typography.fontSize}px'`)
  if (s.typography.lineHeight !== undefined) push('lineHeight', String(s.typography.lineHeight))
  if (s.typography.align) push('textAlign', `'${s.typography.align}'`)
  if (s.typography.colorToken) push('color', `'var(--color-${s.typography.colorToken.replace(/\./g, '-')})'`)
  if (s.background.colorToken) push('backgroundColor', `'var(--color-${s.background.colorToken.replace(/\./g, '-')})'`)
  if (s.background.color) push('backgroundColor', `'${s.background.color}'`)
  if (s.background.radiusToken) push('borderRadius', `'var(--radius-${s.background.radiusToken})'`)
  if (s.background.shadowToken) push('boxShadow', `'var(--shadow-${s.background.shadowToken})'`)
  if (s.background.borderToken) push('border', `'var(--border-${s.background.borderToken})'`)

  return entries.length ? `{ ${entries.join(', ')} }` : '{}'
}

function cssVal(v: string | number): string {
  if (typeof v === 'number') return `'${v}px'`
  const lower = v.toLowerCase()
  if (['xs', 'sm', 'md', 'lg', 'xl', 'xxl'].includes(lower)) return `'var(--space-${lower})'`
  return `'${v}'`
}

function boxVal(box: NonNullable<StyleModel['spacing']['padding']>): string {
  const p: string[] = []
  if (box.top !== undefined) p.push(`'var(--space-${String(box.top).toLowerCase()})'`)
  if (box.right !== undefined) p.push(`'var(--space-${String(box.right).toLowerCase()})'`)
  if (box.bottom !== undefined) p.push(`'var(--space-${String(box.bottom).toLowerCase()})'`)
  if (box.left !== undefined) p.push(`'var(--space-${String(box.left).toLowerCase()})'`)
  return p.length === 1 ? p[0] : p.join(' ')
}

function alignMap(v: string): string {
  return v === 'space-between' ? 'space-between' : v === 'space-around' ? 'space-around' : v === 'start' ? 'flex-start' : v === 'end' ? 'flex-end' : v
}

function nodeToJsx(node: Node, tokens: Project['tokens'], components: Record<string, ComponentDef>, indent: string): string {
  const pad = indent
  const childPad = indent + '  '
  const Tag = node.tag || 'div'

  if (node.instance && components[node.instance.componentId]) {
    const comp = components[node.instance.componentId]
    const props = Object.entries(node.instance.props)
      .map(([k, v]) => `${k}={${JSON.stringify(v)}}`)
      .join(' ')
    return `${pad}<${pascal(comp.name)} ${props} />`
  }

  const style = styleObject(node, tokens)
  const a11y = node.a11y?.ariaLabel ? ` aria-label="${node.a11y.ariaLabel}"` : ''

  const leaf = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'a', 'button', 'img', 'input', 'hr', 'video'].includes(Tag)

  if (node.type === 'image') {
    return `${pad}<img src="${node.content.src ?? ''}" alt="${node.content.alt ?? ''}" style=${style} />`
  }
  if (node.type === 'input') {
    return `${pad}<input placeholder="${node.content.text ?? ''}" style=${style} />`
  }
  if (node.type === 'divider') {
    return `${pad}<hr style=${style} />`
  }

  const text = node.content.text ?? ''
  if (leaf) {
    const href = node.content.href ? ` href="${node.content.href}"` : ''
    return `${pad}<${Tag}${href}${a11y} style=${style}>${text}</${Tag}>`
  }

  if (node.children.length === 0) {
    return `${pad}<${Tag}${a11y} style=${style}>${text}</${Tag}>`
  }
  const children = node.children.map((c) => nodeToJsx(c, tokens, components, childPad)).join('\n')
  return `${pad}<${Tag}${a11y} style=${style}>\n${children}\n${pad}</${Tag}>`
}

export function generateProject(project: Project): GeneratedFile[] {
  const files: GeneratedFile[] = []

  // tokens.css
  let css = `/* Design tokens — generated by SaintWorks */\n:root {\n`
  for (const [k, v] of Object.entries(project.tokens.colors)) {
    css += `  --color-${k.replace(/\./g, '-')}: ${v};\n`
  }
  for (const [k, v] of Object.entries(project.tokens.fonts)) {
    css += `  --font-${k}: ${v.stack};\n`
  }
  for (const [k, v] of Object.entries(project.tokens.spacing)) {
    css += `  --space-${k.toLowerCase()}: ${v}px;\n`
  }
  for (const [k, v] of Object.entries(project.tokens.radius)) {
    css += `  --radius-${k}: ${v}px;\n`
  }
  for (const [k, v] of Object.entries(project.tokens.shadows)) {
    css += `  --shadow-${k}: ${v};\n`
  }
  for (const [k, v] of Object.entries(project.tokens.borders)) {
    css += `  --border-${k}: ${v};\n`
  }
  css += `}\n`
  files.push({ path: 'src/styles/tokens.css', content: css, language: 'css' })

  // components
  for (const comp of Object.values(project.components)) {
    const jsx = nodeToJsx(comp.rootNode, project.tokens, project.components, '  ')
    const body = `import React from 'react'\nimport '../styles/tokens.css'\n\nexport default function ${pascal(comp.name)}(props: Record<string, unknown>) {\n  return (\n${jsx}\n  )\n}\n`
    files.push({ path: `src/components/${pascal(comp.name)}.tsx`, content: body, language: 'jsx' })
  }

  // layouts
  for (const layout of Object.values(project.layouts)) {
    const children = layout.frame.children
    const header = children.find((c) => c.instance)?.instance?.componentId
    const footer = [...children].reverse().find((c) => c.instance)?.instance?.componentId
    const headerName = header && project.components[header] ? pascal(project.components[header].name) : null
    const footerName = footer && project.components[footer] ? pascal(project.components[footer].name) : null
    const imports = [
      headerName && `import ${headerName} from '../components/${headerName}'`,
      footerName && `import ${footerName} from '../components/${footerName}'`,
    ].filter(Boolean)
    const body = `import React from 'react'\n${imports.join('\n')}\n\nexport default function ${pascal(layout.name)}({ children }: { children: React.ReactNode }) {\n  return (\n    <>\n      ${headerName ? `<${headerName} />` : '{/* header */}'}\n      <main>{children}</main>\n      ${footerName ? `<${footerName} />` : '{/* footer */}'}\n    </>\n  )\n}\n`
    files.push({ path: `src/layouts/${pascal(layout.name)}.tsx`, content: body, language: 'jsx' })
  }

  // pages
  for (const page of Object.values(project.pages)) {
    const jsx = page.nodes.map((n) => nodeToJsx(n, project.tokens, project.components, '    ')).join('\n')
    const layout = project.layouts[page.layoutId]
    const layoutName = layout ? pascal(layout.name) : 'Main'
    const body = `import React from 'react'\nimport ${layoutName} from '../layouts/${layoutName}'\n\nexport default function ${pascal(page.name)}() {\n  return (\n    <${layoutName}>\n${jsx || '      {/* empty page */}'}\n    </${layoutName}>\n  )\n}\n`
    files.push({ path: `src/pages/${pascal(page.name)}.tsx`, content: body, language: 'jsx' })
  }

  // data collections
  for (const coll of Object.values(project.collections)) {
    files.push({
      path: `src/data/${slug(coll.name)}.json`,
      content: JSON.stringify({ fields: coll.fields, records: coll.records }, null, 2),
      language: 'json',
    })
  }

  // brand + project config
  files.push({
    path: 'src/data/brand.json',
    content: JSON.stringify(project.brand, null, 2),
    language: 'json',
  })

  // routes
  let routes = `// Generated routes\nexport const routes = [\n`
  for (const page of Object.values(project.pages)) {
    routes += `  { path: '${page.route}', component: '${pascal(page.name)}', name: '${page.name}' },\n`
  }
  routes += `]\n`
  files.push({ path: 'src/routes.ts', content: routes, language: 'ts' })

  return files
}

export function generateSinglePage(project: Project, pageId: string): GeneratedFile[] {
  const page = project.pages[pageId]
  if (!page) return []
  return generateProject(project).filter((f) => f.path.includes(pascal(page.name)))
}
