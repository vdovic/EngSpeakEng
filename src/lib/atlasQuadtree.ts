/**
 * atlasQuadtree.ts
 *
 * A simple flat spatial grid (cell-based) for O(1) average hit detection.
 * Designed for the Language Atlas: 2000+ nodes, fast nearest-node lookup
 * on mouse move / touch, no dependencies.
 *
 * The grid divides the world into cells of fixed size.  Each node is stored
 * in the cell that contains its position.  `nearest()` checks the node's cell
 * and its 8 neighbours — 9 cells total — and returns the closest candidate
 * within `maxDist` world units.
 *
 * Cell size is set to approximately 3× the maximum node hit radius so that
 * any two nodes that could overlap always land in adjacent (or same) cells.
 */

import type { AtlasNode } from '@/lib/atlasLayout'

export const GRID_CELL = 120  // world units per cell side

// ── Types ─────────────────────────────────────────────────────────────────────

type CellKey = string   // `${col},${row}`

// ── SpatialGrid ───────────────────────────────────────────────────────────────

export class SpatialGrid {
  private cells = new Map<CellKey, AtlasNode[]>()

  constructor(nodes: AtlasNode[]) {
    for (const node of nodes) {
      const key = this.cellKey(node.x, node.y)
      let cell = this.cells.get(key)
      if (!cell) {
        cell = []
        this.cells.set(key, cell)
      }
      cell.push(node)
    }
  }

  /**
   * Returns the closest node within `maxDist` world units of (wx, wy),
   * or null if no node qualifies.
   */
  nearest(wx: number, wy: number, maxDist: number): AtlasNode | null {
    const col = Math.floor(wx / GRID_CELL)
    const row = Math.floor(wy / GRID_CELL)

    let best: AtlasNode | null = null
    let bestDist2 = maxDist * maxDist

    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const key = `${col + dc},${row + dr}`
        const cell = this.cells.get(key)
        if (!cell) continue
        for (const node of cell) {
          const dx = node.x - wx
          const dy = node.y - wy
          const d2 = dx * dx + dy * dy
          if (d2 < bestDist2) {
            bestDist2 = d2
            best = node
          }
        }
      }
    }

    return best
  }

  /**
   * Returns all nodes within `radius` world units of (wx, wy).
   * Checks enough neighbouring cells to be exhaustive.
   */
  within(wx: number, wy: number, radius: number): AtlasNode[] {
    const col = Math.floor(wx / GRID_CELL)
    const row = Math.floor(wy / GRID_CELL)
    const cellSpan = Math.ceil(radius / GRID_CELL) + 1
    const r2 = radius * radius
    const result: AtlasNode[] = []

    for (let dc = -cellSpan; dc <= cellSpan; dc++) {
      for (let dr = -cellSpan; dr <= cellSpan; dr++) {
        const key = `${col + dc},${row + dr}`
        const cell = this.cells.get(key)
        if (!cell) continue
        for (const node of cell) {
          const dx = node.x - wx
          const dy = node.y - wy
          if (dx * dx + dy * dy <= r2) result.push(node)
        }
      }
    }

    return result
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private cellKey(x: number, y: number): CellKey {
    return `${Math.floor(x / GRID_CELL)},${Math.floor(y / GRID_CELL)}`
  }
}
