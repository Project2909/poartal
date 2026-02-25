const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.urlencoded({ extended: true }));

let storedData = null;

/* ---------------- UPLOAD PAGE ---------------- */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Manpower Upload</title>
<style>
body{font-family:Segoe UI;background:#eef2f7;margin:0}
.container{padding:60px;text-align:center}
.box{background:white;width:450px;margin:auto;padding:30px;border-radius:8px}
button{padding:12px 25px;background:#1e90ff;color:white;border:none;border-radius:5px}
</style>
</head>
<body>
<div class="container">
  <div class="box">
    <h2>Upload Manpower Excel</h2>
    <form method="POST" action="/upload" enctype="multipart/form-data">
      <input type="file" name="excel" required><br><br>
      <button type="submit">Upload</button>
    </form>
  </div>
</div>
</body>
</html>
`);
});

/* ---------------- READ EXCEL & EXTRACT ---------------- */
app.post("/upload", upload.single("excel"), (req, res) => {
  const workbook = XLSX.read(req.file.buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  storedData = XLSX.utils.sheet_to_json(sheet);

  res.redirect("/view");
});

/* ---------------- DISPLAY MANPOWER DATA ---------------- */
app.get("/view", (req, res) => {
  if (!storedData) return res.redirect("/");

  const data = storedData.map(r => ({
    area: r.Area,
    manpower: r.Manpower
  }));

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Manpower Data</title>
<style>
body{font-family:Segoe UI;background:#eef2f7;margin:0}
table{width:70%;margin:60px auto;background:white;border-collapse:collapse}
th,td{padding:12px;border:1px solid #ccc;text-align:center}
th{background:#1e90ff;color:white}
</style>
</head>
<body>
<h2 style="text-align:center">Extracted Manpower Data</h2>
<table>
<tr><th>Area</th><th>Manpower</th></tr>
${data.map(d => `
<tr>
  <td>${d.area}</td>
  <td>${d.manpower}</td>
</tr>`).join("")}
</table>
</body>
</html>
`);
});

/* ---------------- RUN SERVER ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
