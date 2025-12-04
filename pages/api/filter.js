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
            const name = (r[0]||'').toString().trim();
            const vehicle = (r[1]||'').toString().trim();
            const mileage = (r[3]||'').toString();
            const appt = (r[4]||'').toString().trim();
            const phones = (r[11]||'').toString();

            if (!vehicle || /202[56]/.test(vehicle)) return null;

            const parts = name.split(/\s+/);
            const first = parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1).toLowerCase() : '';
            let last = parts.slice(1).join(' ');
            last = last ? last[0].toUpperCase() + last.slice(1).toLowerCase() : '';

            const year = vehicle.match(/20(\d{2})/)?.[1] || '';
            const model = vehicle.replace(/20\d{2}\s+/, '').trim();
            const miles = parseInt(mileage.replace(/,/g,''),10) || 0;

            const digits = (phones.match(/\d{10,11}/g) || []).pop() || '';
            const phone = digits.length===10 ? '1'+digits : digits.length===11 ? digits : '';

            if (!phone) return null;

            return {phone,Tag:'Future Service Appointment',Customer:first,Last_Name:last,Year:year,Vehicle:model,Miles:miles,Appointment:appt};
          })
          .filter(Boolean);

        result.sort((a,b)=>b.Year.localeCompare(a.Year)||a.Appointment.localeCompare(b.Appointment));

        stringify(result,{header:true},(e,csv)=>{
          res.setHeader('Content-Type','text/csv');
          res.setHeader('Content-Disposition','attachment; filename="Filtered For 11Labs.csv"');
          res.send(csv);
        });
      });
  });
}
