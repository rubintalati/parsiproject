const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

/**
 * Send email using nodemailer
 * @param {Object} options - Email options (to, subject, text)
 */
const sendEmail = async (options) => {
  try {
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD || process.env.SMTP_EMAIL.includes('your-email')) {
      console.log('Email credentials not configured. Saving reset link to file instead.');
      
      // Create a fallback method that saves password reset links to a file
      const resetLinksDir = path.join(__dirname, '..', 'reset-links');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(resetLinksDir)) {
        fs.mkdirSync(resetLinksDir, { recursive: true });
      }
      
      // Save the reset link to a file with the user's email as the filename
      const filename = path.join(resetLinksDir, `${options.email.replace(/[@.]/g, '_')}.txt`);
      
      fs.writeFileSync(
        filename,
        `To: ${options.email}\nSubject: ${options.subject}\n\n${options.message}\n\nGenerated at: ${new Date().toLocaleString()}`
      );
      
      console.log(`Reset link saved to file: ${filename}`);
      return;
    }
    
    // Create reusable transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Define email options
    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message
    };

    // Send email
    const info = await transporter.sendMail(message);

    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail;
