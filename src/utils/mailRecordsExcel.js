// Load the workbook library only when the user exports an Excel file.
export async function createMailRecordsExcel(rows) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('郵寄紀錄')
  sheet.addRows(rows)
  const widths = [14, 20, 28, 30, 60, 20, 30, 16, 14, 36, 30]
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width
  })
  // Identifiers must remain strings, including leading zeros and long numbers.
  for (const column of [3, 7]) {
    sheet.getColumn(column).numFmt = '@'
    sheet.getColumn(column).eachCell(cell => {
      // Summary rows have fewer columns; keep their totals numeric.
      if (rows[cell.row - 1]?.length >= 7) cell.value = String(cell.value ?? '')
    })
  }
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  return workbook.xlsx.writeBuffer()
}
