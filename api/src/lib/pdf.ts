import PDFDocument from 'pdfkit'

// ── Brand tokens ─────────────────────────────────────────────────────────────
const RED    = '#ef5144'
const DARK   = '#1c1917'
const MID    = '#78716c'
const LIGHT  = '#f5f5f4'
const BORDER = '#e7e5e4'
const WHITE  = '#ffffff'
const ROW_ALT = '#fafaf9'

const MARGIN = 50
const PW     = 612  // Letter width in pts
const PH     = 792  // Letter height in pts
const CW     = PW - MARGIN * 2  // 512 pts content width

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ReportBaby {
  name: string
  dob: Date
  sex?: string | null
}

export interface ReportGrowth {
  measuredAt: Date
  weight: number | null
  length: number | null
  headCirc: number | null
  notes: string | null
}

export interface ReportVaccine {
  administeredAt: Date
  vaccineName: string
  doseNumber: number | null
  lotNumber: string | null
  notes: string | null
}

export interface ReportMedication {
  occurredAt: Date
  name: string
  dose: number
  unit: string
  notes: string | null
}

export interface ReportAppointment {
  date: Date | string
  doctor: string | null
  type: string
  notes: string | null
  vaccines: { vaccineName: string; doseNumber: number | null }[]
}

export interface ReportFeedings {
  totalFeeds: number
  breastFeeds: number
  bottleFeeds: number
  avgPerDay: number
  days: number
}

export interface ReportSleep {
  avgHoursPerDay: number
  avgNapsPerDay: number
  days: number
}

export interface ReportData {
  baby: ReportBaby
  growth: ReportGrowth[]
  vaccines: ReportVaccine[]
  medications: ReportMedication[]
  appointments: ReportAppointment[]
  feedings: ReportFeedings | null
  sleep: ReportSleep | null
}

export interface ReportOptions {
  sections: string[]
  since: Date | null
  generatedAt: Date
  unitSystem?: 'metric' | 'imperial'
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtDateShort(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + '  ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtWeight(grams: number, system: 'metric' | 'imperial'): string {
  if (system === 'imperial') {
    const totalOz = grams / 28.3495
    const lbs = Math.floor(totalOz / 16)
    const oz = Math.round(totalOz % 16)
    const correctedOz = oz === 16 ? 0 : oz
    const correctedLbs = oz === 16 ? lbs + 1 : lbs
    return correctedLbs > 0 ? `${correctedLbs} lbs ${correctedOz} oz` : `${correctedOz} oz`
  }
  return `${(grams / 1000).toFixed(2)} kg`
}

function fmtLength(cm: number, system: 'metric' | 'imperial'): string {
  if (system === 'imperial') return `${(cm / 2.54).toFixed(1)} in`
  return `${cm} cm`
}

function calcAge(dob: Date): string {
  const now = new Date()
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  if (months < 1) {
    const days = Math.floor((now.getTime() - dob.getTime()) / 86400000)
    return `${days} day${days !== 1 ? 's' : ''} old`
  }
  if (months < 24) return `${months} month${months !== 1 ? 's' : ''} old`
  const y = Math.floor(months / 12), m = months % 12
  return m > 0 ? `${y} yr ${m} mo old` : `${y} year${y !== 1 ? 's' : ''} old`
}

// ── PDF builder ───────────────────────────────────────────────────────────────
export function generateReport(data: ReportData, opts: ReportOptions): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: {
      Title: `Pediatric Report – ${data.baby.name}`,
      Author: 'Babything',
      Subject: 'Pediatric Health Report',
    },
    bufferPages: true,
  })

  const chunks: Buffer[] = []
  doc.on('data', c => chunks.push(c))

  let pageCount = 1

  // ── Page-break helper ──
  function ensureSpace(needed: number) {
    if (doc.y + needed > PH - 70) {
      doc.addPage()
      pageCount++
      drawRunningHeader()
    }
  }

  // ── Running header (pages 2+) ──
  function drawRunningHeader() {
    const savedY = doc.y
    doc.save()
    doc.rect(0, 0, PW, 28).fill(RED)
    doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
    doc.text('babything', MARGIN, 10)
    doc.text(`${data.baby.name} — Pediatric Report`, MARGIN, 10, { width: CW, align: 'right' })
    doc.restore()
    doc.y = Math.max(savedY, 38)
  }

  // ── Section header ──
  function sectionHeader(title: string) {
    ensureSpace(36)
    const y = doc.y
    doc.rect(MARGIN, y, CW, 22).fill(LIGHT)
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CW, y).strokeColor(BORDER).lineWidth(0.5).stroke()
    doc.fontSize(9).font('Helvetica-Bold').fillColor(MID)
    doc.text(title, MARGIN + 8, y + 7, { width: CW - 16 })
    doc.y = y + 28
  }

  // ── Table helpers ──
  interface Col { header: string; width: number; align?: 'left' | 'right' | 'center' }

  function tableHeader(cols: Col[]) {
    const y = doc.y
    doc.rect(MARGIN, y, CW, 18).fill('#e7e5e4')
    let x = MARGIN
    cols.forEach(col => {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(MID)
      doc.text(col.header, x + 4, y + 5, { width: col.width - 8, align: col.align ?? 'left' })
      x += col.width
    })
    doc.y = y + 18
  }

  function tableRow(cols: Col[], values: string[], isAlt: boolean) {
    const lineHeight = 14
    // Measure max height needed
    let maxLines = 1
    let x = MARGIN
    cols.forEach((col, i) => {
      const val = values[i] ?? ''
      if (val.length > 0) {
        const approxCharsPerLine = Math.floor((col.width - 8) / 5)
        maxLines = Math.max(maxLines, Math.ceil(val.length / approxCharsPerLine))
      }
      x += col.width
    })
    const rowH = Math.max(lineHeight, Math.min(maxLines * lineHeight, 42))
    ensureSpace(rowH + 2)

    const y = doc.y
    if (isAlt) doc.rect(MARGIN, y, CW, rowH).fill(ROW_ALT)
    doc.moveTo(MARGIN, y + rowH).lineTo(MARGIN + CW, y + rowH).strokeColor(BORDER).lineWidth(0.3).stroke()

    x = MARGIN
    cols.forEach((col, i) => {
      doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
      const val = values[i] ?? ''
      doc.text(val || '—', x + 4, y + 3, {
        width: col.width - 8,
        height: rowH - 4,
        align: col.align ?? 'left',
        lineBreak: true,
        ellipsis: true,
      })
      x += col.width
    })
    doc.y = y + rowH
  }

  function noData(msg: string) {
    doc.fontSize(8.5).font('Helvetica').fillColor(MID)
    doc.text(msg, MARGIN + 8, doc.y + 4)
    doc.moveDown(0.5)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PAGE 1 — Cover header
  // ────────────────────────────────────────────────────────────────────────────
  doc.rect(0, 0, PW, 50).fill(RED)
  doc.fontSize(20).font('Helvetica-Bold').fillColor(WHITE)
  doc.text('babything', MARGIN, 9)
  doc.fontSize(7.5).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
  doc.text('PEDIATRIC REPORT', MARGIN, 31)

  // Date vertically centred on the right
  doc.fontSize(8).fillColor('rgba(255,255,255,0.7)')
  doc.text(fmtDate(opts.generatedAt), MARGIN, 19, { width: CW, align: 'right' })

  doc.y = 66

  // Baby info block
  doc.fontSize(20).font('Helvetica-Bold').fillColor(DARK)
  doc.text(data.baby.name)
  doc.moveDown(0.2)

  doc.fontSize(10).font('Helvetica').fillColor(MID)
  const dobStr = data.baby.dob.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const ageStr = calcAge(data.baby.dob)
  doc.text(`Date of Birth:  ${dobStr}   ·   ${ageStr}`)
  if (data.baby.sex) {
    const sexLabel = data.baby.sex === 'M' ? 'Male' : data.baby.sex === 'F' ? 'Female' : data.baby.sex
    doc.text(`Sex:  ${sexLabel}`)
  }
  const periodStr = opts.since
    ? `${fmtDate(opts.since)} – ${fmtDate(opts.generatedAt)}`
    : `All records through ${fmtDate(opts.generatedAt)}`
  doc.text(`Report Period:  ${periodStr}`)
  doc.moveDown(0.8)

  // Divider
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CW, doc.y).strokeColor(BORDER).lineWidth(1).stroke()
  doc.moveDown(0.8)

  // ────────────────────────────────────────────────────────────────────────────
  // GROWTH
  // ────────────────────────────────────────────────────────────────────────────
  if (opts.sections.includes('growth')) {
    const us = opts.unitSystem ?? 'metric'
    const wUnit = us === 'imperial' ? '(lbs)' : '(kg)'
    const lUnit = us === 'imperial' ? '(in)' : '(cm)'
    sectionHeader('GROWTH MEASUREMENTS')
    const cols: Col[] = [
      { header: 'DATE',              width: 100 },
      { header: `WEIGHT ${wUnit}`,   width: 100, align: 'right' },
      { header: `LENGTH ${lUnit}`,   width: 100, align: 'right' },
      { header: `HEAD ${lUnit}`,     width: 100, align: 'right' },
      { header: 'NOTES',             width: 112 },
    ]
    if (data.growth.length > 0) {
      tableHeader(cols)
      data.growth.forEach((r, i) => {
        tableRow(cols, [
          fmtDateShort(r.measuredAt),
          r.weight   != null ? fmtWeight(r.weight, us)  : '',
          r.length   != null ? fmtLength(r.length, us)  : '',
          r.headCirc != null ? fmtLength(r.headCirc, us) : '',
          r.notes ?? '',
        ], i % 2 === 0)
      })
    } else {
      noData('No growth measurements recorded for this period.')
    }
    doc.moveDown(1)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VACCINES
  // ────────────────────────────────────────────────────────────────────────────
  if (opts.sections.includes('vaccines')) {
    sectionHeader('VACCINE HISTORY')
    const cols: Col[] = [
      { header: 'DATE',       width: 95 },
      { header: 'VACCINE',    width: 175 },
      { header: 'DOSE #',     width: 55, align: 'center' },
      { header: 'LOT NUMBER', width: 95 },
      { header: 'NOTES',      width: 92 },
    ]
    if (data.vaccines.length > 0) {
      tableHeader(cols)
      data.vaccines.forEach((v, i) => {
        tableRow(cols, [
          fmtDateShort(v.administeredAt),
          v.vaccineName,
          v.doseNumber != null ? String(v.doseNumber) : '',
          v.lotNumber ?? '',
          v.notes ?? '',
        ], i % 2 === 0)
      })
    } else {
      noData('No vaccines recorded for this period.')
    }
    doc.moveDown(1)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MEDICATIONS
  // ────────────────────────────────────────────────────────────────────────────
  if (opts.sections.includes('medications')) {
    sectionHeader('MEDICATION HISTORY')
    const cols: Col[] = [
      { header: 'DATE / TIME',  width: 130 },
      { header: 'MEDICATION',   width: 150 },
      { header: 'DOSE',         width: 100 },
      { header: 'NOTES',        width: 132 },
    ]
    if (data.medications.length > 0) {
      tableHeader(cols)
      data.medications.forEach((m, i) => {
        tableRow(cols, [
          fmtDateTime(m.occurredAt),
          m.name,
          `${m.dose} ${m.unit}`,
          m.notes ?? '',
        ], i % 2 === 0)
      })
    } else {
      noData('No medications recorded for this period.')
    }
    doc.moveDown(1)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // APPOINTMENTS
  // ────────────────────────────────────────────────────────────────────────────
  if (opts.sections.includes('appointments')) {
    sectionHeader('APPOINTMENTS')
    const cols: Col[] = [
      { header: 'DATE',      width: 95 },
      { header: 'PROVIDER',  width: 140 },
      { header: 'TYPE',      width: 110 },
      { header: 'NOTES',     width: 167 },
    ]
    if (data.appointments.length > 0) {
      tableHeader(cols)
      data.appointments.forEach((a, i) => {
        // Format vaccines given at this appointment
        const vaccineNote = a.vaccines.length > 0
          ? `Vaccines: ${a.vaccines.map(v => v.vaccineName + (v.doseNumber ? ` #${v.doseNumber}` : '')).join(', ')}`
          : ''
        const notesStr = [a.notes, vaccineNote].filter(Boolean).join('  ·  ')
        tableRow(cols, [
          fmtDateShort(a.date),
          a.doctor ?? '',
          a.type,
          notesStr,
        ], i % 2 === 0)
      })
    } else {
      noData('No appointments recorded for this period.')
    }
    doc.moveDown(1)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FEEDING SUMMARY
  // ────────────────────────────────────────────────────────────────────────────
  if (opts.sections.includes('feedings') && data.feedings) {
    sectionHeader(`FEEDING SUMMARY  (last ${data.feedings.days} days)`)
    const f = data.feedings
    ensureSpace(80)
    const y = doc.y
    const colW = CW / 3

    const statBox = (label: string, value: string, x: number) => {
      doc.rect(x, y, colW - 8, 52).fill(LIGHT)
      doc.fontSize(20).font('Helvetica-Bold').fillColor(RED)
      doc.text(value, x + 8, y + 8, { width: colW - 24, align: 'center' })
      doc.fontSize(8).font('Helvetica').fillColor(MID)
      doc.text(label, x + 8, y + 34, { width: colW - 24, align: 'center' })
    }

    statBox('Avg. feeds / day', f.avgPerDay.toFixed(1), MARGIN)
    statBox('Breast feeds', String(f.breastFeeds), MARGIN + colW)
    statBox('Bottle feeds', String(f.bottleFeeds), MARGIN + colW * 2)
    doc.y = y + 58
    doc.moveDown(1)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SLEEP SUMMARY
  // ────────────────────────────────────────────────────────────────────────────
  if (opts.sections.includes('sleep') && data.sleep) {
    sectionHeader(`SLEEP SUMMARY  (last ${data.sleep.days} days)`)
    const s = data.sleep
    ensureSpace(80)
    const y = doc.y
    const colW = CW / 2

    const statBox2 = (label: string, value: string, x: number) => {
      doc.rect(x, y, colW - 8, 52).fill(LIGHT)
      doc.fontSize(20).font('Helvetica-Bold').fillColor(RED)
      doc.text(value, x + 8, y + 8, { width: colW - 24, align: 'center' })
      doc.fontSize(8).font('Helvetica').fillColor(MID)
      doc.text(label, x + 8, y + 34, { width: colW - 24, align: 'center' })
    }

    statBox2('Avg. sleep / day', `${s.avgHoursPerDay.toFixed(1)} hrs`, MARGIN)
    statBox2('Avg. naps / day',  s.avgNapsPerDay.toFixed(1), MARGIN + colW)
    doc.y = y + 58
    doc.moveDown(1)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Footers on all pages
  // ────────────────────────────────────────────────────────────────────────────
  const totalPages = (doc.bufferedPageRange().count)
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i)
    doc.save()
    const footerY = PH - 35
    doc.moveTo(MARGIN, footerY - 6).lineTo(MARGIN + CW, footerY - 6).strokeColor(BORDER).lineWidth(0.5).stroke()
    doc.fontSize(7.5).font('Helvetica').fillColor(MID)
    doc.text(`Generated by Babything on ${fmtDate(opts.generatedAt)}`, MARGIN, footerY, { width: CW * 0.7, align: 'left' })
    doc.text(`Page ${i + 1} of ${totalPages}`, MARGIN, footerY, { width: CW, align: 'right' })
    doc.restore()
  }

  doc.end()
  return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))))
}
