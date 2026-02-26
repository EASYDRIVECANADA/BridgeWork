import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, TableRow, TableCell, Table, WidthType } from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse inline markdown (bold, italic, code, links)
function parseInlineTokens(tokens) {
  const runs = [];
  for (const t of tokens) {
    if (t.type === 'strong') {
      runs.push(new TextRun({ text: t.text, bold: true }));
    } else if (t.type === 'em') {
      runs.push(new TextRun({ text: t.text, italics: true }));
    } else if (t.type === 'codespan') {
      runs.push(new TextRun({ text: t.text, font: 'Consolas', size: 20, color: '666666' }));
    } else if (t.type === 'link') {
      runs.push(new TextRun({ text: t.text || t.href, color: '2D7FE6', underline: {} }));
    } else {
      runs.push(new TextRun({ text: t.raw || t.text || '' }));
    }
  }
  return runs;
}

// Parse bold/italic from plain text using regex
function parseInlineText(text) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else if (part) {
      runs.push(new TextRun({ text: part }));
    }
  }
  return runs;
}

async function convertMdToDocx(inputFile, outputFile) {
  const md = fs.readFileSync(inputFile, 'utf-8');
  const tokens = marked.lexer(md);
  const children = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        children.push(new Paragraph({
          text: token.text,
          heading: token.depth === 1 ? HeadingLevel.HEADING_1
            : token.depth === 2 ? HeadingLevel.HEADING_2
            : token.depth === 3 ? HeadingLevel.HEADING_3
            : token.depth === 4 ? HeadingLevel.HEADING_4
            : HeadingLevel.HEADING_5,
          spacing: { before: 240, after: 120 },
        }));
        break;

      case 'paragraph': {
        const runs = parseInlineTokens(token.tokens || []);
        children.push(new Paragraph({ children: runs, spacing: { after: 120 } }));
        break;
      }

      case 'blockquote': {
        const bqText = token.tokens
          .map(t => t.tokens ? t.tokens.map(it => it.text || it.raw || '').join('') : (t.text || t.raw || ''))
          .join(' ');
        children.push(new Paragraph({
          children: [new TextRun({ text: bqText, italics: true, color: '555555' })],
          indent: { left: 720 },
          spacing: { before: 120, after: 120 },
        }));
        break;
      }

      case 'list':
        for (const item of token.items) {
          const listText = item.tokens
            .map(t => t.tokens ? t.tokens.map(it => it.text || it.raw || '').join('') : (t.text || t.raw || ''))
            .join(' ');
          const listRuns = parseInlineText(listText);
          children.push(new Paragraph({
            children: [
              new TextRun({ text: token.ordered ? '' : '• ' }),
              ...listRuns,
            ],
            indent: { left: 360 },
            spacing: { after: 60 },
          }));
        }
        break;

      case 'table': {
        const rows = [];
        if (token.header && token.header.length > 0) {
          rows.push(new TableRow({
            children: token.header.map(cell => new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: cell.text || '', bold: true, size: 20 })],
              })],
              width: { size: Math.floor(9000 / token.header.length), type: WidthType.DXA },
            })),
          }));
        }
        if (token.rows) {
          for (const row of token.rows) {
            rows.push(new TableRow({
              children: row.map(cell => new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: cell.text || '', size: 20 })],
                })],
                width: { size: Math.floor(9000 / row.length), type: WidthType.DXA },
              })),
            }));
          }
        }
        if (rows.length > 0) {
          children.push(new Table({ rows, width: { size: 9000, type: WidthType.DXA } }));
          children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
        }
        break;
      }

      case 'code': {
        const lines = token.text.split('\n');
        for (const line of lines) {
          children.push(new Paragraph({
            children: [new TextRun({ text: line, font: 'Consolas', size: 18, color: '333333' })],
            indent: { left: 360 },
            spacing: { after: 0 },
          }));
        }
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
        break;
      }

      case 'hr':
        children.push(new Paragraph({
          children: [new TextRun({ text: '─'.repeat(60), color: 'CCCCCC' })],
          spacing: { before: 200, after: 200 },
        }));
        break;

      case 'space':
        break;

      default:
        if (token.raw && token.raw.trim()) {
          children.push(new Paragraph({ text: token.raw.trim(), spacing: { after: 120 } }));
        }
        break;
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputFile, buffer);
  console.log(`✅ Converted: ${path.basename(inputFile)} → ${path.basename(outputFile)}`);
}

// Convert all doc files
await convertMdToDocx(
  path.join(__dirname, 'Video_Demo_Script.md'),
  path.join(__dirname, 'Video_Demo_Script.docx')
);

await convertMdToDocx(
  path.join(__dirname, 'EOD_Reports.md'),
  path.join(__dirname, 'EOD_Reports.docx')
);

await convertMdToDocx(
  path.join(__dirname, 'Delivery_Timeline_Goals.md'),
  path.join(__dirname, 'Delivery_Timeline_Goals.docx')
);
