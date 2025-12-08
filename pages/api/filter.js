import multer from 'multer';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

const upload = multer();
export const config = { api: { bodyParser: false } };

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  upload.single('file')(req, {}, (err) => {
    if (err || !req.file) return res.status(400).send('No file');

    const rows = [];
    require('stream').Readable.from(req.file.buffer)
      .pipe(parse({ from_line: 6, skip_empty_lines: true }))
      .on('data', r => rows.push(r))
      .on('end', () => {
        const result = rows
          .map(r => {
            const name = (r[0] || '').toString().trim();
            const vehicle = (r[1] || '').toString().trim();
            const mileage = (r[3] || '').toString().trim();
            const appt = (r[4] || '').toString().trim();
            const phones = (r[11] || '').toString();

            if (!vehicle) return null;

            // First name only, capitalized
            const parts = name.split(/\s+/);
            const first = parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1).toLowerCase() : '';
            if (!first) return null;

            // 2-digit year
            const yearMatch = vehicle.match(/20(\d{2})/);
            const year = yearMatch ? yearMatch[1] : '';

            // Model (remove year and Toyota)
            const model = vehicle.replace(/20\d{2}\s+/g, '').replace(/Toyota\s+/gi, '').trim();

            // Mileage without commas
            const miles = mileage.replace(/,/g, '');

            // Time only (e.g., "7:00" or "11:30")
            let time = '';
            if (appt) {
              const timeMatch = appt.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
              if (timeMatch) {
                const [, hour, minute, ampm] = timeMatch;
                let h = parseInt(hour);
                if (ampm && ampm.toUpperCase() === 'PM' && h !== 12) {
                  h += 12;
                } else if (ampm && ampm.toUpperCase() === 'AM' && h === 12) {
                  h = 0;
                }
                time = `${h}:${minute}`;
              }
            }

            // Extract phone - last valid 10 or 11 digit number
            const phoneMatches = phones.match(/\d[\d\s\(\)\-\.]+\d/g) || [];
            let phone = '';
            for (let i = phoneMatches.length - 1; i >= 0; i--) {
              const digits = phoneMatches[i].replace(/\D/g, '');
              if (digits.length === 10) {
                phone = '1' + digits;
                break;
              } else if (digits.length === 11 && digits.startsWith('1')) {
                phone = digits;
                break;
              }
            }

            if (!phone) return null;

            return {
              Name: first,
              Year: year,
              Model: model,
              Mileage: miles,
              Time: time,
              Phone: phone
            };
          })
          .filter(Boolean);

        // Sort by year desc, then time
        result.sort((a, b) => {
          const yearDiff = b.Year.localeCompare(a.Year);
          if (yearDiff !== 0) return yearDiff;
          return a.Time.localeCompare(b.Time);
        });

        stringify(result, { header: true }, (e, csv) => {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="Filtered For 11Labs.csv"');
          res.send(csv);
        });
      });
  });
}
