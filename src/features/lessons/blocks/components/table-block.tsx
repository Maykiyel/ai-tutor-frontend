import { ScrollArea, Table } from '@mantine/core'

import type { TableBlock } from '../../schemas/lesson-schema'

/**
 * A comparison, as a real table: a header row, body rows, and a cell per column
 * so a screen reader can read across a row rather than down a column of run-together
 * words.
 *
 * The table owns a horizontal scroll viewport, like a code block and a wide
 * figure. Four columns of comparison is the normal case for a table in a lesson
 * and it is wider than a phone-width column of prose, and the answer is not to
 * squeeze the words but to let the table scroll inside its own box.
 *
 * Nothing here reads colour, size, or spacing from the payload; the striping and
 * the hover state are theme tokens.
 */
export function TableBlockView({ block }: { block: TableBlock }) {
  // A row can be shorter or longer than the header row, and a table is only
  // readable if every cell still sits under a column. The widest row therefore
  // decides how many columns there are, and the headers that do not reach that
  // far are blank rather than missing: a comparison the learner came for is not
  // worth dropping or quietly truncating over a cell count. The backend is the
  // layer that rejects such a lesson at write time.
  const columns = Math.max(block.headers.length, ...block.rows.map((row) => row.length), 0)

  return (
    <ScrollArea type="auto" scrollbars="x" offsetScrollbars scrollbarSize={12}>
      <Table striped highlightOnHover verticalSpacing="xs" horizontalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            {Array.from({ length: columns }, (_, column) => (
              <Table.Th key={column} scope="col">
                {block.headers[column] ?? ''}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {block.rows.map((row, rowIndex) => (
            <Table.Tr key={rowIndex}>
              {Array.from({ length: columns }, (_, column) => (
                <Table.Td key={column}>{row[column] ?? ''}</Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  )
}
