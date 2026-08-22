import type { Node, Problem, Project } from '../model/types'
import { flattenNodes } from '../model/tree'
import { isAssetId } from '../hooks/useAssetUrl'

export function lintProject(project: Project): Problem[] {
  const problems: Problem[] = []
  const knownRoutes = new Set(Object.values(project.pages).map((p) => p.route))
  const seenRoutes = new Map<string, string>()

  // duplicate routes
  for (const page of Object.values(project.pages)) {
    const existing = seenRoutes.get(page.route)
    if (existing) {
      problems.push({
        id: `dup-${page.id}`,
        severity: 'error',
        kind: 'duplicate-route',
        message: `Duplicate route “${page.route}” (${page.name} and ${project.pages[existing]?.name})`,
        pageId: page.id,
        fixHint: 'Give one of the pages a unique route in Settings.',
      })
    } else {
      seenRoutes.set(page.route, page.id)
    }
  }

  // missing SEO
  for (const page of Object.values(project.pages)) {
    if (!page.seo.title?.trim()) {
      problems.push({
        id: `seo-${page.id}`,
        severity: 'warning',
        kind: 'missing-seo',
        message: `“${page.name}” has no SEO title`,
        pageId: page.id,
        fixHint: 'Add a title in the page inspector.',
      })
    }
  }

  // navigation to missing pages
  for (const link of project.navigation) {
    if (link.pageId && !project.pages[link.pageId]) {
      problems.push({
        id: `nav-${link.label}`,
        severity: 'error',
        kind: 'missing-page',
        message: `Navigation link “${link.label}” points to a missing page`,
        fixHint: 'Reassign the link to an existing page.',
      })
    }
  }

  const walkPage = (pageId: string, nodes: Node[]) => {
    for (const node of flattenNodes(nodes)) {
      // missing image
      if (node.type === 'image') {
        if (!node.content.src) {
          problems.push({
            id: `img-${node.id}`,
            severity: 'error',
            kind: 'missing-image',
            message: `“${node.name}” has no image source`,
            pageId,
            nodeId: node.id,
            fixHint: 'Choose an image in the Content panel.',
          })
        } else if (isAssetId(node.content.src) && !project.assets[node.content.src]) {
          problems.push({
            id: `imgasset-${node.id}`,
            severity: 'error',
            kind: 'missing-image',
            message: `“${node.name}” references a missing asset`,
            pageId,
            nodeId: node.id,
            fixHint: 'Replace the image or re-upload the asset.',
          })
        }
        if (!node.content.alt?.trim()) {
          problems.push({
            id: `alt-${node.id}`,
            severity: 'warning',
            kind: 'accessibility',
            message: `“${node.name}” has no alt text`,
            pageId,
            nodeId: node.id,
            fixHint: 'Add descriptive alt text for screen readers.',
          })
        }
      }

      // broken internal link
      if ((node.type === 'button' || node.type === 'link') && node.content.href) {
        const href = node.content.href
        if (href.startsWith('/') && href.length > 1 && !knownRoutes.has(href)) {
          problems.push({
            id: `link-${node.id}`,
            severity: 'error',
            kind: 'broken-link',
            message: `“${node.name}” links to missing route ${href}`,
            pageId,
            nodeId: node.id,
            fixHint: 'Update the link or create the target page.',
          })
        }
      }

      // missing content
      if (
        (node.type === 'heading' || node.type === 'text' || node.type === 'button') &&
        (!node.content.text || !node.content.text.trim())
      ) {
        problems.push({
          id: `empty-${node.id}`,
          severity: 'warning',
          kind: 'missing-content',
          message: `“${node.name}” has empty text`,
          pageId,
          nodeId: node.id,
          fixHint: 'Add some content.',
        })
      }

      // brand consistency: raw colors instead of tokens
      if (node.style.background.color) {
        problems.push({
          id: `brand-${node.id}`,
          severity: 'info',
          kind: 'brand-consistency',
          message: `“${node.name}” uses a custom background color instead of a brand token`,
          pageId,
          nodeId: node.id,
          fixHint: 'Choose a color token from the Color panel.',
        })
      }

      // invalid component instance
      if (node.instance && !project.components[node.instance.componentId]) {
        problems.push({
          id: `comp-${node.id}`,
          severity: 'error',
          kind: 'invalid-component',
          message: `“${node.name}” references a deleted component`,
          pageId,
          nodeId: node.id,
          fixHint: 'Delete the broken instance or restore the component.',
        })
      }

      // mobile overflow
      const width = node.style.sizing.width
      if (typeof width === 'number' && width > project.tokens.breakpoints.mobile) {
        problems.push({
          id: `overflow-${node.id}`,
          severity: 'warning',
          kind: 'mobile-overflow',
          message: `“${node.name}” is ${width}px wide and may overflow mobile (${project.tokens.breakpoints.mobile}px)`,
          pageId,
          nodeId: node.id,
          fixHint: 'Add a mobile override or reduce the width.',
        })
      }
    }
  }

  for (const page of Object.values(project.pages)) walkPage(page.id, page.nodes)
  for (const comp of Object.values(project.components)) {
    for (const node of flattenNodes([comp.rootNode])) {
      if (node.type === 'image' && !node.content.alt?.trim()) {
        problems.push({
          id: `alt-${node.id}`,
          severity: 'info',
          kind: 'accessibility',
          message: `Component “${comp.name}” image “${node.name}” has no alt text`,
          nodeId: node.id,
          fixHint: 'Add alt text to the component master.',
        })
      }
    }
  }

  return problems
}

export function countBlocking(problems: Problem[]): number {
  return problems.filter((p) => p.severity === 'error').length
}
