const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.urlencoded({ extended: true }));

let storedData = null;

/* ---------------- UPLOAD PAGE ---------------- */
const UPLOAD_HTML = `
<!DOCTYPE html>
<html>
<head>
<title>Upload Manpower</title>
<style>
body{font-family:Segoe UI;background:#eef2f7;margin:0}
.container{padding:40px;text-align:center}
.box{background:white;width:50%;margin:auto;padding:30px;border-radius:8px}
button{padding:12px 25px;background:#1e90ff;color:white;border:none}
</style>
</head>
<body>
<div class="container">
<div class="box">
<h3>Upload Manpower Excel</h3>
<form method="POST" enctype="multipart/form-data">
<input type="file" name="excel" required><br><br>
<button type="submit">Upload</button>
</form>
</div>
</div>
</body>
</html>
`;

/* ---------------- ALLOCATION PAGE ---------------- */
function allocationPage(data) {
return `
<!DOCTYPE html>
<html>
<head>
<title>Allocation</title>
<style>
body{margin:0;font-family:Segoe UI;background:#eef2f7}
table{width:100%;background:white;border-collapse:collapse}
th,td{padding:10px;border:1px solid #ccc;text-align:center}
th{background:#1e90ff;color:white}
.container{padding:40px}
button{padding:12px 25px;background:#1e90ff;color:white;border:none}
</style>
</head>
<body>
<div class="container">
<form method="POST" action="/generate">
<table>
<tr>
  <th>Select</th>
  <th>Area</th>
  <th>Manpower</th>
  <th>%</th>
  <th>Updated</th>
</tr>
${data.map((r,i)=>`
<tr>
<td><input type="checkbox" name="check_${i}"></td>
<td>${r.area}</td>
<td>${r.total}</td>
<td><input type="number" name="percent_${i}" value="100"></td>
<td>${r.total}</td>
</tr>`).join("")}
</table>
<input type="hidden" name="rows" value="${data.length}">
<br><button>Generate Excel</button>
</form>
</div>
</body>
</html>`;
}

/* ---------------- ROUTES ---------------- */
app.get("/", (req,res)=> res.send(UPLOAD_HTML));

app.post("/upload", upload.single("excel"), (req,res)=>{
  const wb = XLSX.read(req.file.buffer);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  storedData = XLSX.utils.sheet_to_json(sheet);
  res.redirect("/allocate");
});

app.get("/allocate", (req,res)=>{
  if(!storedData) return res.redirect("/");
  const data = storedData.map(r=>({
    area: r.Area,
    total: r.Manpower
  }));
  res.send(allocationPage(data));
});

app.post("/generate", (req,res)=>{
  const rows = parseInt(req.body.rows);
  let output = [];

  for(let i=0;i<rows;i++){
    if(req.body["check_"+i]){
      let percent = parseInt(req.body["percent_"+i]);
      let original = storedData[i].Manpower;

      output.push({
        Area: storedData[i].Area,
        Updated_Manpower: Math.round(original * percent / 100)
      });
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(output),
    "Updated"
  );

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=Updated.xlsx"
  );
  res.send(XLSX.write(wb,{ type:"buffer", bookType:"xlsx" }));
});

/* ---------------- RUN ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Server running on", PORT));
