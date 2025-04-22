# Parsi Project - Roj Wisher Feature

This feature allows users to track and receive notifications for Parsi calendar birthdays (roj birthdays) of friends and family members.

## Features

- Register with email and optional phone number
- Add birthdays with name, date of birth, and time of birth
- Automatic calculation of Parsi calendar roj and mah dates
- Email notifications for upcoming roj birthdays
- Optional WhatsApp notifications (requires Twilio setup)
- Modern, responsive UI built with React and Tailwind CSS

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- MongoDB (v4 or later)

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Configure email notifications:
   - Open `server.js`
   - Update the email configuration in the `sendEmailNotification` function:
     ```javascript
     const transporter = nodemailer.createTransport({
       service: 'gmail',
       auth: {
         user: 'your-email@gmail.com', // Replace with your email
         pass: 'your-app-password'     // Replace with your app password
       }
     });
     ```

3. (Optional) Configure WhatsApp notifications:
   - Sign up for a Twilio account
   - Install the Twilio SDK: `npm install twilio`
   - Update the `sendWhatsAppNotification` function in `server.js`

### Running the Application

1. Start MongoDB:
   ```
   mongod
   ```

2. Start the server:
   ```
   npm start
   ```

3. Access the application:
   - Open a web browser
   - Navigate to http://localhost:3000
   - Click on "roj wisher" in the navigation menu

## Parsi Calendar Calculation

The application uses a calculation based on the Parsi calendar, which starts from March 21, 1737. The calculation takes into account:

- The date of birth
- Whether the birth occurred before or after 6am (important in Zoroastrian tradition)

Each day in the Parsi calendar has a specific name (roj), and each month also has a name (mah). When a person's birth roj aligns with the current day's roj, it's considered their "roj birthday."

## Notification System

The application includes a scheduled task (using node-cron) that runs daily at 8:00 AM to:

1. Calculate the current day's roj
2. Find all users with a matching birth roj
3. Send notifications via email and/or WhatsApp

## Technology Stack

- Backend: Node.js, Express, MongoDB, Mongoose
- Frontend: React, Tailwind CSS
- Notifications: Nodemailer, Twilio (optional)
- Scheduling: node-cron
