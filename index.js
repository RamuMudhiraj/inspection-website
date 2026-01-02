//================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  collection,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCpyW8pYupSwSk8gMjMwzzscTB3Z2V2H5o",
  authDomain: "floor-inspection.firebaseapp.com",
  projectId: "floor-inspection",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ================= GLOBAL =================
let isSubmitting = false;
const roomCount = {};

// ================= DOM READY =================
document.addEventListener("DOMContentLoaded", () => {

  // ================= NAVBAR =================
  const navbarDiv = document.querySelector(".navbars");
  if (navbarDiv) {
    navbarDiv.innerHTML = `
      <div class="navbar">
        <div class="logo"><a href="index.html">ABC I/C</a></div>

        <!-- HAMBURGER -->
        <div class="hamburger" id="hamburger">&#9776;</div>

        <ul class="nav-links" id="navLinks">
          <li><a href="wall.html">Wall</a></li>
          <li><a href="celling.html">Ceiling</a></li>
          <li><a href="flooring.html">Flooring</a></li>
          <li><a href="Electric.html">Electric</a></li>
          <li><a href="waterprofing.html">Waterproofing</a></li>
          <li><a href="customerdata.html">Customers</a></li>
        </ul>
      </div>
    `;
  }

  // ================= HAMBURGER TOGGLE =================
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("show");
    });
  }

  // 🔽🔽 KEEP ALL YOUR EXISTING CODE BELOW AS IT IS 🔽🔽


  // ================= CUSTOMER FORM (index.html) =================
  const customerForm = document.getElementById("inspectionForm");
  if (customerForm) {
    customerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (isSubmitting) return;
      isSubmitting = true;

      try {
        const phone = document.getElementById("phone").value;

        await setDoc(doc(db, "customers", phone), {
          name: document.getElementById("customerName").value,
          address: document.getElementById("customerAddress").value,
          phone,
          sqt: document.getElementById("sqt").value,
          createdAt: serverTimestamp()
        });

        localStorage.setItem("activeCustomerPhone", phone);
        alert("Customer saved");
        customerForm.reset();

      } catch (err) {
        alert("Error saving customer");
      }

      isSubmitting = false;
    });
  }

  // ================= SERVICE FORM (flooring, wall, etc) =================
  const serviceForm = document.querySelector(".service-form");
  if (serviceForm && !customerForm) {

    // ----- TABLE -----
    serviceForm.insertAdjacentHTML("afterend", `
      <br>
      <h3 style="margin-left:45%;">Inspection Table</h3>
      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Room</th><th>Service</th><th>Problem</th><th>Comments</th><th>Image</th>
          </tr>
        </thead>
        <tbody id="serviceTableBody"></tbody>
      </table>
      <button id="downloadPdf">Download PDF</button>
      <canvas id="roomChart" height="250"></canvas>
    `);

    const tableBody = document.getElementById("serviceTableBody");
    const canvas = document.getElementById("roomChart");
    const ctx = canvas.getContext("2d");

    function drawGraph() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const rooms = Object.keys(roomCount);
      if (!rooms.length) return;

      canvas.width = rooms.length * 100;
      const max = Math.max(...Object.values(roomCount));

      rooms.forEach((room, i) => {
        const h = (roomCount[room] / max) * 180;
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(i * 80 + 30, 200 - h, 40, h);
        ctx.fillStyle = "#000";
        ctx.fillText(room, i * 80 + 30, 220);
      });
    }

    serviceForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (isSubmitting) return;
      isSubmitting = true;

      try {
        const phone = localStorage.getItem("activeCustomerPhone");
        if (!phone) {
          alert("Add customer first");
          isSubmitting = false;
          return;
        }

        const room = roomType.value;
        const service = serviceType.value;
        const problem = problemType.value;
        const comments = area.value;
        const imgFile = image.files[0];

        let imgBase64 = "";
        if (imgFile) imgBase64 = await toBase64(imgFile);

        tableBody.innerHTML += `
          <tr>
            <td>${room}</td>
            <td>${service}</td>
            <td>${problem}</td>
            <td>${comments}</td>
            <td>${imgBase64 ? `<img src="${imgBase64}" width="60">` : "No Image"}</td>
          </tr>
        `;

        roomCount[room] = (roomCount[room] || 0) + 1;
        drawGraph();

        await addDoc(collection(db, "customers", phone, "inspections"), {
          room, service, problem, comments,
          createdAt: serverTimestamp()
        });

        serviceForm.reset();

      } catch (err) {
        alert("Inspection failed");
      }

      isSubmitting = false;
    });
  }

  // ================= CUSTOMER VIEW PAGE =================
  const customerSelect = document.getElementById("customerSelect");
  if (customerSelect) {
    loadCustomers(customerSelect);

    customerSelect.addEventListener("change", async () => {
      const phone = customerSelect.value;
      const info = document.getElementById("customerInfo");
      const tbody = document.getElementById("inspectionTableBody");

      info.innerHTML = "";
      tbody.innerHTML = "";
      if (!phone) return;

      const snap = await getDocs(collection(db, "customers", phone, "inspections"));
      snap.forEach(d => {
        const i = d.data();
        tbody.innerHTML += `
          <tr>
            <td>${i.room}</td>
            <td>${i.service}</td>
            <td>${i.problem}</td>
            <td>${i.comments}</td>
          </tr>
        `;
      });
    });
  }
});

// ================= HELPERS =================
async function loadCustomers(select) {
  const snap = await getDocs(collection(db, "customers"));
  snap.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.id;
    select.appendChild(opt);
  });
}

function toBase64(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(file);
  });
}

// ================= PDF DOWNLOAD =================
document.addEventListener("click", async (e) => {
  if (e.target.id !== "downloadPdf") return;

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  pdf.setFontSize(16);
  pdf.text("Inspection Report", 10, 15);

  let y = 25;
  let count = 1;

  const rows = document.querySelectorAll("#serviceTableBody tr");

  for (const row of rows) {
    const cols = row.querySelectorAll("td");

    const room = cols[0].innerText;
    const service = cols[1].innerText;
    const problem = cols[2].innerText;
    const comments = cols[3].innerText;
    const img = cols[4].querySelector("img");

    pdf.setFontSize(13);
    pdf.text(`Inspection ${count}`, 10, y);
    y += 8;

    pdf.setFontSize(11);
    pdf.text(`Room     : ${room}`, 12, y); y += 6;
    pdf.text(`Service  : ${service}`, 12, y); y += 6;
    pdf.text(`Problem  : ${problem}`, 12, y); y += 6;
    pdf.text(`Comments : ${comments}`, 12, y); y += 8;

    if (img) {
      pdf.rect(12, y, 60, 40); // border
      pdf.addImage(img.src, "PNG", 13, y + 1, 58, 38); // image
      y += 45;
    }

    pdf.line(10, y, 200, y); // separator
    y += 10;

    if (y > 260) {
      pdf.addPage();
      y = 20;
    }

    count++;
  }

  pdf.save("inspection-report.pdf");
});
