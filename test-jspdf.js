const { jsPDF } = require("jspdf");
require("jspdf-autotable");
const doc = new jsPDF();
doc.text("Hello world!", 10, 10);
doc.autoTable({ head: [['Name', 'Email']], body: [['John', 'john@example.com']] });
console.log(doc.output('datauristring'));
