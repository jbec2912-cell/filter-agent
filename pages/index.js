export default function Home() {
  return (
    <>
      <style jsx global>{`
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 80px 20px; 
          background: #f9f9f9;
          margin: 0;
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        p { color: #666; }
        input, button { 
          padding: 15px; 
          font-size: 18px; 
          margin: 10px; 
        }
        button { 
          background: #0066ff; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
        }
        button:hover { background: #0052cc; }
        #status { color: #666; font-weight: bold; }
      `}</style>
      <h1>Lakeland Toyota → ElevenLabs Filter</h1>
      <p>Upload raw CSV → get filtered file</p>
      <input type="file" id="fileInput" accept=".csv" />
      <br /><br />
      <button id="processBtn">Process & Download</button>
      <p id="status"></p>
      
      <script dangerouslySetInnerHTML={{__html: `
        document.getElementById('processBtn').onclick = async function() {
          const file = document.getElementById('fileInput').files[0];
          if (!file) {
            alert('Please select a CSV file');
            return;
          }
          
          document.getElementById('status').innerText = 'Processing...';
          
          const form = new FormData();
          form.append('file', file);
          
          try {
            const response = await fetch('/api/filter', {
              method: 'POST',
              body: form
            });
            
            if (!response.ok) {
              throw new Error('Processing failed');
            }
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Filtered For 11Labs.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            document.getElementById('status').innerText = 'Downloaded!';
          } catch (error) {
            document.getElementById('status').innerText = 'Error: ' + error.message;
          }
        };
      `}} />
    </>
  );
}
