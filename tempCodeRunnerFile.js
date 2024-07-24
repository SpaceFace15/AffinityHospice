const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Serve the HTML file when accessing the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle form submission and generate PDF
app.post('/submit', (req, res) => {
    console.log('POST /submit request received');
    const data = req.body;
    console.log('Received data:', data); // Log the received data

    // Validate incoming data
    if (!data.firstName || !data.lastName || !data.email || !data.startDate || !data.endDate) {
        console.error('Missing required fields');
        return res.status(400).send('Missing required fields');
    }

    const fileName = `${data.firstName}_${data.lastName}_Data.pdf`;
    const filePath = path.join(__dirname, fileName);

    // Create a new PDF document
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Add content to the PDF
    doc.fontSize(20).text('Data to Be Submitted Below', { align: 'center' }).moveDown();
    doc.fontSize(16).text(`Volunteer Name: ${data.firstName} ${data.lastName}`, { align: 'left' }).moveDown();
    doc.fontSize(16).text(`Email: ${data.email}`, { align: 'left' }).moveDown();
    doc.fontSize(16).text(`Start Date: ${data.startDate}`, { align: 'left' }).moveDown();
    doc.fontSize(16).text(`End Date: ${data.endDate}`, { align: 'left' }).moveDown();
    doc.fontSize(16).text('Hours, Miles, Time Spent Driving, Service Type, and Patients Each Day', { align: 'left' }).moveDown();

    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].forEach(day => {
        if (data[`${day.toLowerCase()}Hours`]) {
            doc.fontSize(14).text(`${day}: ${data[`${day.toLowerCase()}Hours`]} hour(s), ${data[`${day.toLowerCase()}Miles`]} mile(s), ${data[`${day.toLowerCase()}DrivingTime`]} minute(s) driving, ${data[`${day.toLowerCase()}ServiceType`]} service, patient(s): ${data[`${day.toLowerCase()}PatientNames`]}`, { align: 'left' }).moveDown();
        }
    });

    // Add totals
    doc.fontSize(16).text('Totals:', { align: 'left' }).moveDown();
    doc.fontSize(14).text(`Total Hours: ${data.totalHours} hour(s)`, { align: 'left' }).moveDown();
    doc.fontSize(14).text(`Total Miles: ${data.totalMiles} mile(s)`, { align: 'left' }).moveDown();
    doc.fontSize(14).text(`Total Driving Time: ${data.totalDrivingTime} minute(s)`, { align: 'left' }).moveDown();
    doc.fontSize(14).text(`Total Services: ${data.totalServices} service(s)`, { align: 'left' }).moveDown();
    doc.fontSize(14).text(`Total Patients: ${data.totalPatients} patient(s)`, { align: 'left' }).moveDown();

    doc.fontSize(16).text('Description of Activities', { align: 'left' }).moveDown();
    doc.fontSize(14).text(data.description, { align: 'left' }).moveDown();
    doc.end();

    // Ensure the PDF is fully written before proceeding
    writeStream.on('finish', () => {
        console.log('PDF created successfully.');
        res.json({ message: 'PDF generated successfully', fileName: fileName });
    });

    writeStream.on('error', (err) => {
        console.error('Error writing PDF:', err);
        res.status(500).send('Error writing PDF');
    });
});

// API to send email with PDF attachment
app.post('/send-email', async (req, res) => {
    console.log('POST /send-email request received');
    const { fileName, email, firstName, lastName } = req.body;

    // Log the request body for debugging
    console.log('Request body:', req.body);

    if (!fileName) {
        console.error('fileName is missing');
        return res.status(400).send('fileName is required');
    }

    const filePath = path.join(__dirname, fileName);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return res.status(404).send('File not found');
    }

    // Set up nodemailer transporter with Outlook's SMTP settings
    let transporter = nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'joshuaschoen@outlook.com', // Your Outlook email
            pass: 'Crumblezilla23!' // Your Outlook password
        },
        tls: {
            ciphers: 'SSLv3'
        }
    });

    // Send email with PDF attachment
    let mailOptions = {
        from: 'joshuaschoen@outlook.com',
        to: email,
        subject: `${firstName} ${lastName}'s PDF`,
        text: 'Please find the attached PDF.',
        attachments: [
            {
                filename: fileName,
                path: filePath
            }
        ]
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        res.json({ message: 'Email sent successfully', fileName: fileName });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Error sending email');
    }
});

// Serve the generated PDF for download
app.get('/download/:fileName', (req, res) => {
    console.log(`GET /download/${req.params.fileName} request received`);
    const filePath = path.join(__dirname, req.params.fileName);
    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).send('Error downloading file');
            } else {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error('Error deleting file:', err);
                    }
                });
            }
        });
    } else {
        console.error(`File not found: ${filePath}`);
        res.status(404).send('File not found');
    }
});

// Health check endpoint
app.get('/health-check', (req, res) => {
    res.status(200).send('Server is running');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});
