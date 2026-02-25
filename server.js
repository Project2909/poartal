const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const session = require("express-session");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use("/static", express.static(path.join(__dirname, "static")));
app.use(express.urlencoded({ extended: true }));

/* ---------------- SESSION ---------------- */
app.use(session({
    secret: "bhel_secret_key",
    resave: false,
    saveUninitialized: true
}));

/* ---------------- AUTH MIDDLEWARE ---------------- */
function auth(req, res, next) {
    if (req.session.user) next();
    else res.redirect("/login");
}

/* ---------------- IN-MEMORY USERS ---------------- */
const employees = {}; // { empId: { empId, username } }

let storedData = null;

/* ---------------- COMMON LAYOUT ---------------- */
function layout(title, user, content) {
    return `
<!DOCTYPE html>
<html>
<head>
<title>${title}</title>
<style>
body{font-family:'Segoe UI';margin:0;background:#eef2f7;}
header,footer{background:#0a3d62;color:white;padding:15px 40px;}
header nav a{color:white;margin-right:20px;text-decoration:none;}
.user{float:right;font-weight:bold;}
footer{position:fixed;bottom:0;width:100%;text-align:center;}
.container{padding:40px;padding-bottom:90px;}
button{background:#1e90ff;color:white;border:none;padding:10px 20px;}
</style>
</head>
<body>

<header>
<nav>
<a href="/home">Dashboard</a>
<a href="/upload">Manpower Allocation</a>
<a href="/work">Work Allocation</a>
<a href="/logout">Logout</a>
</nav>
<span class="user">${user.username}</span>
</header>

<div class="container">
${content}
</div>

<footer>© 2026 BHEL | Manpower Planning System</footer>

</body>
</html>`;
}

/* ---------------- LOGIN ---------------- */
app.get("/login",(req,res)=>{
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Login</title>
<style>
body{font-family:'Segoe UI';background:#eef2f7;}
.box{background:white;width:400px;margin:120px auto;padding:30px;border-radius:8px;text-align:center;}
input{width:90%;padding:10px;margin:10px 0;}
button{background:#0a3d62;color:white;border:none;padding:10px 25px;}
</style>
</head>
<body>
<div class="box">
<h2>BHEL Employee Login</h2>
<form method="POST">
<input name="empId" placeholder="Employee ID" required>
<input name="username" placeholder="Username" required>
<button>Login</button>
</form>
<p><a href="/signup">Create Account</a></p>
</div>
</body>
</html>
`);
});

app.post("/login",(req,res)=>{
    const { empId, username } = req.body;
    if (employees[empId] && employees[empId].username === username) {
        req.session.user = employees[empId];
        res.redirect("/home");
    } else {
        res.send("Invalid credentials");
    }
});

/* ---------------- SIGNUP ---------------- */
app.get("/signup",(req,res)=>{
    res.send(`
<!DOCTYPE html>
<html>
<head><title>Signup</title></head>
<body style="font-family:'Segoe UI';background:#eef2f7;">
<div style="background:white;width:400px;margin:120px auto;padding:30px;border-radius:8px;text-align:center;">
<h2>Create Employee Account</h2>
<form method="POST">
<input name="empId" placeholder="Employee ID" required><br><br>
<input name="username" placeholder="Username" required><br><br>
<button>Create Account</button>
</form>
</div>
</body>
</html>
`);
});

app.post("/signup",(req,res)=>{
    const { empId, username } = req.body;
    employees[empId] = { empId, username };
    res.redirect("/login");
});

/* ---------------- LOGOUT ---------------- */
app.get("/logout",(req,res)=>{
    req.session.destroy(()=>res.redirect("/login"));
});

/* ---------------- HOME ---------------- */
app.get("/home", auth, (req,res)=>{
    res.send(layout(
        "Home",
        req.session.user,
        `<h2>Welcome ${req.session.user.username}</h2>
         <p>Select a module from the header.</p>`
    ));
});

/* ---------------- UPLOAD (UNCHANGED FLOW) ---------------- */
app.get("/upload", auth, (req,res)=>{
    res.send(layout("Upload", req.session.user, `
<h3>Upload Manpower Excel</h3>
<form method="POST" enctype="multipart/form-data">
<input type="file" name="excel" required><br><br>
<button>Upload</button>
</form>
`));
});

app.post("/upload", auth, upload.single("excel"), (req,res)=>{
    const workbook = XLSX.read(req.file.buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    storedData = XLSX.utils.sheet_to_json(sheet);
    res.redirect("/allocate");
});

/* ---------------- ALLOCATE (UNCHANGED) ---------------- */
app.get("/allocate", auth, (req,res)=>{
    const data = storedData.map(r=>({ area:r.Area, total:r.Manpower }));
    res.send(layout("Allocate", req.session.user, `
<form method="POST" action="/generate">
<table border="1" cellpadding="10">
<tr><th>Select</th><th>Area</th><th>Current</th><th>%</th></tr>
${data.map((r,i)=>`
<tr>
<td><input type="checkbox" name="check_${i}"></td>
<td>${r.area}</td>
<td>${r.total}</td>
<td><input name="percent_${i}" value="100"></td>
</tr>`).join("")}
</table>
<input type="hidden" name="rows" value="${data.length}">
<br><button>Generate Excel</button>
</form>
`));
});

/* ---------------- GENERATE (UNCHANGED) ---------------- */
app.post("/generate", auth, (req,res)=>{
    let output=[];
    storedData.forEach((r,i)=>{
        if(req.body["check_"+i]){
            let p=req.body["percent_"+i];
            output.push({
                Area:r.Area,
                Allocated_Percentage:p,
                Updated_Manpower:Math.round(r.Manpower*p/100)
            });
        }
    });

    const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.json_to_sheet(output);
    XLSX.utils.book_append_sheet(wb,ws,"Updated");
    res.setHeader("Content-Disposition","attachment; filename=Updated.xlsx");
    res.send(XLSX.write(wb,{type:"buffer",bookType:"xlsx"}));
});

/* ---------------- WORK ---------------- */
app.get("/work", auth, (req,res)=>{
    res.send(layout("Work Allocation", req.session.user, "<h3>Work Allocation – Coming Soon</h3>"));
});

/* ---------------- RUN ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Server running on", PORT));
