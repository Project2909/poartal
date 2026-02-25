const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const session = require("express-session");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.urlencoded({ extended: true }));

/* ---------------- SESSION ---------------- */

app.use(session({
    secret: "aadhvi_secret_key",
    resave: false,
    saveUninitialized: true
}));

/* ---------------- AUTH MIDDLEWARE ---------------- */

function auth(req, res, next) {
    if (req.session.loggedIn) next();
    else res.redirect("/login");
}

let storedData = null;

/* ---------------- LOGIN PAGE ---------------- */

const LOGIN_HTML = `
<!DOCTYPE html>
<html>
<head>
<title>Login | AADHVI Technologies</title>
<style>
body{font-family:'Segoe UI';background:#eef2f7;}
.box{
    background:white;width:400px;margin:120px auto;
    padding:30px;border-radius:8px;text-align:center;
}
input{width:90%;padding:10px;margin:10px 0;}
button{background:#1e90ff;color:white;border:none;padding:10px 20px;}
</style>
</head>
<body>
<div class="box">
<h2>Corporate Login</h2>
<form method="POST">
<input name="username" placeholder="Username" required>
<input type="password" name="password" placeholder="Password" required>
<button>Login</button>
</form>
<p style="color:red;">{{ERROR}}</p>
</div>
</body>
</html>
`;

/* ---------------- DASHBOARD ---------------- */

const DASHBOARD_HTML = `
<!DOCTYPE html>
<html>
<head>
<title>Dashboard | AADHVI</title>
<style>
body{font-family:'Segoe UI';margin:0;background:#eef2f7;}
header,footer{background:#0a3d62;color:white;padding:15px 40px;}
nav a{
    color:white;margin-right:20px;
    text-decoration:none;font-weight:bold;
}
.container{padding:40px;}
.card{
    background:white;padding:25px;
    width:300px;border-radius:8px;
}
</style>
</head>
<body>

<header>
AADHVI TECHNOLOGIES – Dashboard
<nav style="float:right;">
<a href="/home">Dashboard</a>
<a href="/">Manpower Allocation</a>
<a href="/work">Work Allocation</a>
<a href="/logout">Logout</a>
</nav>
</header>

<div class="container">
<h2>Welcome, Admin</h2>

<div class="card">
<h3>User Profile</h3>
<p><b>Role:</b> HR Manager</p>
<p><b>Department:</b> Operations</p>
</div>
</div>

<footer>© 2026 AADHVI Technologies</footer>

</body>
</html>
`;

/* ---------------- WORK ALLOCATION (PLACEHOLDER) ---------------- */

const WORK_HTML = `
<!DOCTYPE html>
<html>
<head>
<title>Work Allocation</title>
<style>
body{font-family:'Segoe UI';margin:0;background:#eef2f7;}
header,footer{background:#0a3d62;color:white;padding:15px 40px;}
.container{padding:40px;}
</style>
</head>
<body>
<header>
AADHVI TECHNOLOGIES – Work Allocation
<a href="/home" style="color:white;float:right;">Back</a>
</header>
<div class="container">
<h2>Work Allocation Module</h2>
<p>This module can be extended later.</p>
</div>
<footer>© 2026 AADHVI Technologies</footer>
</body>
</html>
`;

/* ---------------- UPLOAD PAGE ---------------- */

const UPLOAD_HTML = `
<!DOCTYPE html>
<html>
<head>
<title>Manpower Allocation</title>
<style>
body{font-family:'Segoe UI';margin:0;background:#eef2f7;}
header,footer{background:#0a3d62;color:white;padding:15px 40px;}
.container{padding:40px;}
.upload-box{
background:white;padding:30px;width:50%;
margin:auto;text-align:center;border-radius:8px;
}
button{background:#1e90ff;color:white;border:none;padding:12px 25px;}
nav a{color:white;margin-right:20px;text-decoration:none;}
</style>
</head>
<body>

<header>
AADHVI TECHNOLOGIES – Manpower Allocation
<nav style="float:right;">
<a href="/home">Dashboard</a>
<a href="/">Manpower Allocation</a>
<a href="/work">Work Allocation</a>
<a href="/logout">Logout</a>
</nav>
</header>

<div class="container">
<div class="upload-box">
<form method="POST" enctype="multipart/form-data">
<h3>Upload Manpower Excel</h3>
<input type="file" name="excel" required><br><br>
<button>Upload</button>
</form>
</div>
</div>

<footer>© 2026 AADHVI Technologies</footer>
</body>
</html>
`;

/* ---------------- ALLOCATION PAGE ---------------- */

function allocationPage(data){
return `
<!DOCTYPE html>
<html>
<head>
<title>Allocation</title>
<style>
body{font-family:'Segoe UI';margin:0;background:#eef2f7;}
header,footer{background:#0a3d62;color:white;padding:15px 40px;}
.container{padding:40px;}
table{border-collapse:collapse;width:100%;background:white;}
th,td{padding:12px;border:1px solid #ccc;text-align:center;}
th{background:#1e90ff;color:white;}
input[type=number]{width:70px;}
button{background:#1e90ff;color:white;border:none;padding:12px 25px;}
nav a{color:white;margin-right:20px;text-decoration:none;}
</style>
</head>
<body>

<header>
AADHVI TECHNOLOGIES – Allocation
<nav style="float:right;">
<a href="/home">Dashboard</a>
<a href="/">Manpower Allocation</a>
<a href="/work">Work Allocation</a>
<a href="/logout">Logout</a>
</nav>
</header>

<div class="container">
<form method="POST" action="/generate">
<table>
<tr><th>Select</th><th>Area</th><th>Current</th><th>%</th><th>Updated</th></tr>
${data.map((r,i)=>`
<tr>
<td><input type="checkbox" name="check_${i}"></td>
<td>${r.area}</td>
<td>${r.total}</td>
<td><input type="number" name="percent_${i}" value="100" oninput="calc(${i})"></td>
<td><input name="updated_${i}" value="${r.total}" readonly></td>
</tr>`).join("")}
</table>
<input type="hidden" name="rows" value="${data.length}">
<button>Generate Excel</button>
</form>
</div>

<footer>© 2026 AADHVI Technologies</footer>

<script>
const data=${JSON.stringify(data)};
function calc(i){
let p=document.getElementsByName("percent_"+i)[0].value;
document.getElementsByName("updated_"+i)[0].value=Math.round(data[i].total*p/100);
}
</script>

</body>
</html>`;
}

/* ---------------- ROUTES ---------------- */

app.get("/login",(req,res)=>{
    res.send(LOGIN_HTML.replace("{{ERROR}}",""));
});

app.post("/login",(req,res)=>{
    const {username,password}=req.body;
    if(username==="admin" && password==="admin123"){
        req.session.loggedIn=true;
        res.redirect("/home");
    } else {
        res.send(LOGIN_HTML.replace("{{ERROR}}","Invalid credentials"));
    }
});

app.get("/logout",(req,res)=>{
    req.session.destroy(()=>res.redirect("/login"));
});

app.get("/home",auth,(req,res)=>res.send(DASHBOARD_HTML));
app.get("/work",auth,(req,res)=>res.send(WORK_HTML));

app.get("/",auth,(req,res)=>res.send(UPLOAD_HTML));

app.post("/",auth,upload.single("excel"),(req,res)=>{
    const wb=XLSX.read(req.file.buffer);
    const sheet=wb.Sheets[wb.SheetNames[0]];
    storedData=XLSX.utils.sheet_to_json(sheet);
    res.redirect("/allocate");
});

app.get("/allocate",auth,(req,res)=>{
    res.send(allocationPage(storedData.map(r=>({area:r.Area,total:r.Manpower}))));
});

app.post("/generate",auth,(req,res)=>{
    const rows=parseInt(req.body.rows);
    let output=[];
    for(let i=0;i<rows;i++){
        if(req.body["check_"+i]){
            let p=req.body["percent_"+i];
            let o=storedData[i].Manpower;
            output.push({
                Area:storedData[i].Area,
                Allocated_Percentage:p,
                Updated_Manpower:Math.round(o*p/100)
            });
        }
    }
    const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.json_to_sheet(output);
    XLSX.utils.book_append_sheet(wb,ws,"Updated");
    res.setHeader("Content-Disposition","attachment; filename=Updated_Manpower.xlsx");
    res.send(XLSX.write(wb,{type:"buffer",bookType:"xlsx"}));
});

/* ---------------- RUN ---------------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log("Server running on",PORT));
