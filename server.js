const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const session = require("express-session");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

/* ---------------- MIDDLEWARE ---------------- */
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(path.join(__dirname, "static")));

app.use(
  session({
    secret: "bhel_secret_key",
    resave: false,
    saveUninitialized: true
  })
);

/* ---------------- TEMP USER STORE ---------------- */
const users = {}; // { empId: { name, empId } }
let storedData = null;

/* ---------------- AUTH GUARD ---------------- */
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

/* ---------------- LOGIN PAGE ---------------- */
const LOGIN_HTML = `
<!DOCTYPE html>
<html>
<head>
<title>BHEL</title>
<style>
body{font-family:Segoe UI;background:#eef2f7;}
.box{width:350px;margin:100px auto;background:white;padding:30px;border-radius:8px}
input,button{width:100%;padding:12px;margin-top:10px}
button{background:#1e90ff;color:white;border:none}
</style>
</head>
<body>
<div class="box">
<h2>Employee Login</h2>
<form method="POST">
<input name="name" placeholder="Employee Name" required>
<input name="empId" placeholder="Employee ID" required>
<button type="submit">Sign In / Register</button>
</form>
</div>
</body>
</html>
`;

/* ---------------- HEADER + FOOTER ---------------- */
function header(user) {
  return `
<header style="background:#0a3d62;color:white;padding:15px 40px;
display:flex;justify-content:space-between;align-items:center">
<div>BHEL – Manpower Allocation Portal</div>
<div>${user.name} | <a href="/logout" style="color:white">Logout</a></div>
</header>`;
}

const FOOTER = `
<footer style="background:#0a3d62;color:white;
position:fixed;bottom:0;width:100%;text-align:center;padding:8px">
© 2026 BHEL | Manpower Planning System
</footer>`;

/* ---------------- DASHBOARD ---------------- */
function dashboard(user) {
  return `
<!DOCTYPE html>
<html>
<head>
<title>Dashboard</title>
<style>
body{margin:0;font-family:Segoe UI;background:#eef2f7}
.container{text-align:center;padding:60px}
button{padding:15px 30px;margin:15px;font-size:16px;
background:#1e90ff;color:white;border:none;border-radius:6px}
</style>
</head>
<body>
${header(user)}
<div class="container">
<h2>Welcome, ${user.name}</h2>
<button onclick="location.href='/upload'">Manpower Allocation</button>
<button onclick="location.href='/work'">Work Allocation</button>
</div>
${FOOTER}
</body>
</html>`;
}

/* ---------------- UPLOAD PAGE (UNCHANGED FLOW) ---------------- */
const UPLOAD_HTML = `
<!DOCTYPE html>
<html>
<head>
<title>Upload</title>
<style>
body{font-family:Segoe UI;background:#eef2f7;margin:0}
.container{padding:40px;text-align:center}
.box{background:white;width:50%;margin:auto;padding:30px;border-radius:8px}
button{padding:12px 25px;background:#1e90ff;color:white;border:none}
</style>
</head>
<body>
${header({name:""})}
<div class="container">
<div class="box">
<h3>Upload Manpower Excel</h3>
<form method="POST" enctype="multipart/form-data">
<input type="file" name="excel" required><br><br>
<button type="submit">Upload</button>
</form>
</div>
</div>
${FOOTER}
</body>
</html>
`;

/* ---------------- ALLOCATION PAGE ---------------- */
function allocationPage(data, user) {
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
${header(user)}
<div class="container">
<form method="POST" action="/generate">
<table>
<tr><th>Select</th><th>Area</th><th>Manpower</th><th>%</th><th>Updated</th></tr>
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
${FOOTER}
</body>
</html>`;
}

/* ---------------- ROUTES ---------------- */
app.get("/", (req,res)=> res.redirect("/login"));

app.get("/login",(req,res)=> res.send(LOGIN_HTML));

app.post("/login",(req,res)=>{
  const { name, empId } = req.body;
  users[empId] = { name, empId };
  req.session.user = users[empId];
  res.redirect("/dashboard");
});

app.get("/dashboard", requireLogin, (req,res)=>{
  res.send(dashboard(req.session.user));
});

app.get("/upload", requireLogin, (req,res)=>{
  res.send(UPLOAD_HTML);
});

app.post("/upload", requireLogin, upload.single("excel"), (req,res)=>{
  const wb = XLSX.read(req.file.buffer);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  storedData = XLSX.utils.sheet_to_json(sheet);
  res.redirect("/allocate");
});

app.get("/allocate", requireLogin, (req,res)=>{
  const data = storedData.map(r=>({ area:r.Area, total:r.Manpower }));
  res.send(allocationPage(data, req.session.user));
});

app.post("/generate", requireLogin, (req,res)=>{
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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(output),"Updated");
  res.setHeader("Content-Disposition","attachment; filename=Updated.xlsx");
  res.send(XLSX.write(wb,{type:"buffer",bookType:"xlsx"}));
});

app.get("/work", requireLogin,(req,res)=>{
  res.send("<h2 style='text-align:center'>Work Allocation – Coming Soon</h2>");
});

app.get("/logout",(req,res)=>{
  req.session.destroy(()=> res.redirect("/login"));
});

/* ---------------- RUN ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Server running on", PORT));
