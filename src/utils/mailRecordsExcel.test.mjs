import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { createMailRecordsExcel } from './mailRecordsExcel.js'

test('Excel round trip preserves identifiers as text and amounts as numbers', async () => {
  const identifiers = [
    '001122697130020',
    '1122697130020',
    '12345678901234567890',
    'RR001234567TW',
    '=1+1',
    '',
  ]
  const rows = [
    ['寄件日期', '寄件者', '文號', '收件者', '地址', '方式', '掛號號碼', '重量', '郵資'],
  ]
  identifiers.forEach(id =>
    rows.push(['2026-10-20', '測試', '00123', '收件者', '', '掛號', id, 20, 35])
  )
  const buffer = await createMailRecordsExcel(rows)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet('郵寄紀錄')
  identifiers.forEach((id, index) => {
    const cell = sheet.getCell(index + 2, 7)
    assert.equal(cell.value, id)
    assert.equal(cell.type, ExcelJS.ValueType.String)
    assert.equal(cell.numFmt, '@')
    assert.equal(sheet.getCell(index + 2, 3).value, '00123')
    assert.equal(sheet.getCell(index + 2, 9).value, 35)
    assert.equal(sheet.getCell(index + 2, 9).type, ExcelJS.ValueType.Number)
  })
})

test('empty report still exports headers and totals', async () => {
  const buffer = await createMailRecordsExcel([['寄件日期'], [], ['合計', 0, 0]])
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  assert.equal(workbook.worksheets[0].getCell('A3').value, '合計')
})
