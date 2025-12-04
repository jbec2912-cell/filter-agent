// pages/api/filter.js
import multer from 'multer';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

const upload = multer();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  upload.single('file')(req, {}, (err) => {
    if (err || !req.file) {
      return res.status(400).send('No file uploaded');
    }

    const records = [];

    require('stream').Readable.from(req.file.buffer)
      .pipe(parse({ from_line: 6, relax_column_count: true, skip_empty_lines: true }))
      .on('data', (row) => records.push(row))
      .on('end', () => {
        const filtered = records
          .map((r) => ({
            customer: (r[0] || '').toString().trim(),
            vehicle: (r[1] || '').toString().trim(),
            vin: (r[2] || '').toString().trim(),
            mileage: (r[3] || '').toString().trim(),
            appointment: (r[4] || '').toString().trim(),
            rate: (r[5] || '').toString().trim(),
            pl: (r[6] || '').toString().trim(),
            purchase_date: (r[7] || '').toString().trim(),
            bank_name: (r[8] || '').toString().trim(),
            payment: (r[9] || '').toString().trim(),
            sales_person: (r[10] || '').toString().trim(),
            phone_numbers: (r[11] || '').toString().trim(),
            service_advisor: (r[12] || '').toString().trim(),
          }))
          .filter((r) => r.vehicle && !r.vehicle.includes('2025') && !r.vehicle.includes('2026'))
          .filter((r) => {
            if (!r.purchase_date) return true;
            const bought = new Date(r.purchase_date);
            if (isNaN(bought)) return true;
            const months = (new Date().getFullYear() - bought.getFullYear()) * 12 + (new Date().getMonth() - bought.getMonth());
            return months >= 12;
          });

        const final = filtered.map((r) => {
          const nameParts = r.customer.split(/\s+/);
          const customer = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase() : '';
          let last_name = nameParts.slice(1).join(' ');
          last_name = last_name ? last_name.charAt(0).toUpperCase() + last_name.slice(1).toLowerCase() : '';

          const year = r.vehicle.match(/20(\d{2})/) ? r.vehicle.match(/20(\d{2})/)[1] : '';
          const vehicle = r.vehicle.replace(/20\d{2}\s*/, '').trim();
          const miles = parseInt(r.mileage.replace(/,/g, ''), 10) || 0;

          const phoneMatch = (r.phone_numbers.match(/\d{10,11}/g) || []).pop() || '';
          const phone_number = phoneMatch.length === 10 ? '1' + phoneMatch : phoneMatch;

          if (!phone_number) return null;

          return {
            phone_number,
            Tag: 'Future Service Appointment',
            Customer: customer,
            Last_Name: last_name,
            Year: year,
            Vehicle: vehicle,
            Miles: miles,
            Appointment: r.appointment,
          };
        }).filter(Boolean);

        final.sort((a, b) => b.Year.localeCompare(a.Year) || a.Appointment.localeCompare(b.Appointment));

        stringify(final, { header: true }, (err, output) => {
          if (err) return res.status(500).send('CSV error');
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="Filtered For 11Labs.csv"');
          res.status(200).send(output);
        });
      });
  });
}
