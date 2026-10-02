import { jsPDF } from 'jspdf';
import ReactNativeBlobUtil from 'react-native-blob-util';

import { supabase } from './supabase';
import { savePdfAndShare } from './pdf';
import { fmtDMY } from '@/utils/datetime';

type Num = number | string | null;

type InvoiceDetailRow = {
  invoice: {
    invoice_number: string;
    issue_date: string | null;
    due_date: string | null;
    subtotal: Num;
    vat_rate: Num;
    vat_amount: Num;
    total: Num;
    customer_note: string | null;
  } | null;
  business: {
    trading_name: string | null;
    vat_number: string | null;
    address_line1: string | null;
    address_line2: string | null;
    county: string | null;
    eircode: string | null;
    bank_name: string | null;
    iban: string | null;
    bic: string | null;
    logo_path: string | null;
    brand_colour_hex: string | null;
    invoice_footer_text: string | null;
  } | null;
  customer: {
    name: string | null;
    address: string | null;
    eircode: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  job: { job_number: string | null; summary: string | null } | null;
  labour_lines:
    | {
        employee_name_snapshot: string | null;
        role_name_snapshot: string | null;
        hours: Num;
        hourly_rate: Num;
        amount: Num;
        is_lump_sum?: boolean | null;
      }[]
    | null;
  material_lines:
    | {
        description: string | null;
        quantity: Num;
        unit: string | null;
        unit_price: Num;
        line_total: Num;
        is_lump_sum?: boolean | null;
      }[]
    | null;
};

const LOGO_BUCKET = 'business-logos';
const NAVY = '#16345A';
const MUTED = '#5A6577';
const RULE = '#E3DED3';

const num = (v: Num) => {
  const n = typeof v === 'string' ? Number(v) : v ?? 0;
  return Number.isFinite(n) ? (n as number) : 0;
};

const euro = (v: Num) =>
  `€${num(v).toLocaleString('en-IE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const qty = (v: Num) => {
  const n = num(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const joinParts = (parts: (string | null | undefined)[]) =>
  parts.map(p => p?.trim()).filter(Boolean).join(', ');

async function loadLogo(path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    const url = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
    const res = await ReactNativeBlobUtil.fetch('GET', url);
    if (res.info().status !== 200) return null;
    const type = res.info().headers['Content-Type'] ?? res.info().headers['content-type'] ?? 'image/png';
    if (!/png|jpe?g/i.test(type)) return null;
    return `data:${type};base64,${res.base64()}`;
  } catch {
    return null;
  }
}

type Line = { description: string; qty: string; rate: string; amount: string };

const linesOf = (d: InvoiceDetailRow): Line[] => [
  ...(d.labour_lines ?? []).map(l => {
    const who = [l.employee_name_snapshot, l.role_name_snapshot]
      .map(s => s?.trim())
      .filter(Boolean)
      .join(' · ');
    return l.is_lump_sum
      ? { description: who || 'Labour', qty: '', rate: '', amount: euro(l.amount) }
      : {
          description: who || 'Labour',
          qty: `${qty(l.hours)} hrs`,
          rate: euro(l.hourly_rate),
          amount: euro(l.amount),
        };
  }),
  ...(d.material_lines ?? []).map(m =>
    m.is_lump_sum
      ? {
          description: m.description?.trim() || 'Materials',
          qty: '',
          rate: '',
          amount: euro(m.line_total),
        }
      : {
          description: m.description?.trim() || 'Material',
          qty: `${qty(m.quantity)}${m.unit ? ` ${m.unit}` : ''}`,
          rate: euro(m.unit_price),
          amount: euro(m.line_total),
        },
  ),
];

function render(d: InvoiceDetailRow, logo: string | null): string {
  const inv = d.invoice!;
  const biz = d.business ?? ({} as NonNullable<InvoiceDetailRow['business']>);
  const cust = d.customer;
  const accent = /^#[0-9a-f]{6}$/i.test(biz.brand_colour_hex ?? '')
    ? (biz.brand_colour_hex as string)
    : NAVY;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const ensure = (needed: number) => {
    if (y + needed > H - M) {
      doc.addPage();
      y = M;
    }
  };

  if (logo) {
    try {
      doc.addImage(logo, logo.includes('png') ? 'PNG' : 'JPEG', M, y, 44, 44);
    } catch {
      logo = null;
    }
  }
  const bx = logo ? M + 56 : M;
  doc.setTextColor(NAVY).setFont('helvetica', 'bold').setFontSize(14);
  doc.text(biz.trading_name?.trim() || 'Invoice', bx, y + 14);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(MUTED);
  const bizAddress = joinParts([biz.address_line1, biz.address_line2, biz.county, biz.eircode]);
  if (bizAddress) doc.text(doc.splitTextToSize(bizAddress, 260), bx, y + 28);
  if (biz.vat_number) doc.text(`VAT ${biz.vat_number}`, bx, y + 40);

  doc.setTextColor(accent).setFont('helvetica', 'bold').setFontSize(22);
  doc.text('INVOICE', W - M, y + 18, { align: 'right' });
  doc.setFontSize(10).setTextColor(NAVY);
  doc.text(inv.invoice_number, W - M, y + 34, { align: 'right' });
  y += 72;

  doc.setDrawColor(RULE).line(M, y, W - M, y);
  y += 20;

  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED);
  doc.text('BILL TO', M, y);
  doc.text('ISSUED', W - M - 150, y);
  doc.text('DUE', W - M - 60, y);
  y += 14;
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(NAVY);
  doc.text(cust?.name?.trim() || 'Customer', M, y);
  doc.setFont('helvetica', 'normal').setFontSize(10);
  doc.text(inv.issue_date ? fmtDMY(inv.issue_date) : '—', W - M - 150, y);
  doc.text(inv.due_date ? fmtDMY(inv.due_date) : '—', W - M - 60, y);
  doc.setFontSize(9).setTextColor(MUTED);
  const custLines = [
    joinParts([cust?.address, cust?.eircode]),
    cust?.email,
    cust?.phone,
  ].filter((s): s is string => !!s && !!s.trim());
  custLines.forEach((line, i) => doc.text(line, M, y + 13 + i * 12));
  y += 18 + custLines.length * 12;

  if (d.job?.job_number || d.job?.summary) {
    y += 6;
    doc.setFontSize(9).setTextColor(MUTED);
    doc.text(
      doc.splitTextToSize(
        [d.job.job_number ? `Job ${d.job.job_number}` : null, d.job.summary]
          .filter(Boolean)
          .join(' · '),
        W - M * 2,
      ),
      M,
      y,
    );
    y += 16;
  }

  y += 12;
  const colQty = W - M - 200;
  const colRate = W - M - 110;
  const colAmt = W - M;
  doc.setFillColor('#F6F2EA').rect(M, y - 12, W - M * 2, 20, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED);
  doc.text('DESCRIPTION', M + 8, y);
  doc.text('QTY', colQty, y, { align: 'right' });
  doc.text('RATE', colRate, y, { align: 'right' });
  doc.text('AMOUNT', colAmt - 8, y, { align: 'right' });
  y += 20;

  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor('#0E1A2D');
  const lines = linesOf(d);
  if (!lines.length) {
    doc.setTextColor(MUTED).text('No line items', M + 8, y);
    y += 18;
  }
  for (const line of lines) {
    const desc = doc.splitTextToSize(line.description, colQty - M - 60) as string[];
    const h = Math.max(1, desc.length) * 12 + 8;
    ensure(h);
    doc.setTextColor('#0E1A2D').text(desc, M + 8, y);
    doc.text(line.qty, colQty, y, { align: 'right' });
    doc.text(line.rate, colRate, y, { align: 'right' });
    doc.text(line.amount, colAmt - 8, y, { align: 'right' });
    y += h;
    doc.setDrawColor('#EFEAE0').line(M, y - 8, W - M, y - 8);
  }

  ensure(90);
  y += 8;
  const labelX = W - M - 150;
  const totalsRow = (label: string, value: string, bold = false) => {
    doc
      .setFont('helvetica', bold ? 'bold' : 'normal')
      .setFontSize(bold ? 12 : 10)
      .setTextColor(bold ? NAVY : MUTED);
    doc.text(label, labelX, y);
    doc.setTextColor(bold ? NAVY : '#0E1A2D');
    doc.text(value, colAmt - 8, y, { align: 'right' });
    y += bold ? 20 : 16;
  };
  totalsRow('Subtotal', euro(inv.subtotal));
  totalsRow(
    `VAT${inv.vat_rate != null ? ` (${qty(inv.vat_rate)}%)` : ''}`,
    euro(inv.vat_amount),
  );
  doc.setDrawColor(RULE).line(labelX, y - 10, W - M, y - 10);
  y += 4;
  totalsRow('Total', euro(inv.total), true);

  if (inv.customer_note?.trim()) {
    const note = doc.splitTextToSize(inv.customer_note.trim(), W - M * 2) as string[];
    ensure(note.length * 12 + 24);
    y += 10;
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED).text('NOTE', M, y);
    y += 12;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor('#0E1A2D').text(note, M, y);
    y += note.length * 12;
  }

  if (biz.iban) {
    ensure(60);
    y += 16;
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED).text('PAYMENT DETAILS', M, y);
    y += 13;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor('#0E1A2D');
    [biz.bank_name, `IBAN ${biz.iban}`, biz.bic ? `BIC ${biz.bic}` : null]
      .filter((s): s is string => !!s)
      .forEach(line => {
        doc.text(line, M, y);
        y += 12;
      });
  }

  if (biz.invoice_footer_text?.trim()) {
    doc.setFontSize(8).setTextColor(MUTED);
    doc.text(
      doc.splitTextToSize(biz.invoice_footer_text.trim(), W - M * 2),
      W / 2,
      H - M / 2 - 8,
      { align: 'center' },
    );
  }

  return doc.output('datauristring').split(',')[1] ?? '';
}

export async function downloadInvoicePdf(invoiceId: string): Promise<void> {
  const { data, error } = await supabase.rpc('get_invoice_detail', {
    p_id: invoiceId,
  });
  if (error) throw new Error(error.message);
  const detail = data as InvoiceDetailRow | null;
  if (!detail?.invoice) throw new Error('That invoice could not be found.');

  const logo = await loadLogo(detail.business?.logo_path ?? null);
  const base64 = render(detail, logo);
  if (!base64) throw new Error('Could not build the PDF.');

  await savePdfAndShare(`Invoice ${detail.invoice.invoice_number}.pdf`, base64);
  await supabase.rpc('mark_invoice_downloaded', { p_id: invoiceId });
}
