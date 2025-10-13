Job Application Tracker
A dynamic, single-page web application designed to help you efficiently track and manage your job applications. This tool uses Google Sheets as a free, live database, allowing you to view, add, update, and delete your applications from a clean, modern interface. It also provides rich data visualizations to give you insights into your job search progress.


Screenshot

![alt text](image.png)

Features
Google Sheets Backend: Uses a Google Sheet as a live, free, and easy-to-manage database.

Google Authentication: Securely sign in with your Google account to manage your private data.

Personalized Experience: Automatically displays your Google profile name and picture.

CRUD Functionality:

Create: Add new job applications through an intuitive form.

Read: View all your applications in a clean, card-based layout.

Update: Instantly change the status of any application.

Delete: Remove applications you no longer need to track.

Live Search & Filter: Instantly search and filter through your applications by job title, company, or portal.

Data Visualization:

Statistics Blocks: At-a-glance view of total applications for each status (Applied, Interviewed, Offer, Rejected).

Portal Pie Chart: See a distribution of which job portals you use most frequently.

Interactive Timeline: A powerful line graph visualizing your application activity (Applied, Interviewed, Offers, Rejections) over time, with filters for different date ranges and a cumulative view toggle.

Tech Stack
Frontend: HTML5, Tailwind CSS, Vanilla JavaScript

Database: Google Sheets

APIs: Google Sheets API v4, Google People API v1

Charting: Chart.js

Authentication: Google Identity Services (GSI) for Web

Setup Instructions
To set up this project for your own use, follow these steps:

1. Prepare Your Google Sheet
Create a new Google Sheet.

In the first row, add the following headers in this exact order:

A1: Job Name

B1: Company

C1: Date

D1: Portal

E1: Status

F1: Last Updated

Click the Share button in the top right.

Under "General access," change it from "Restricted" to "Anyone with the link".

Copy the Spreadsheet ID from the URL. The URL looks like this: https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit.

2. Configure Your Google Cloud Project
Go to the Google Cloud Console.

Create a new project.

Go to APIs & Services > Library.

Search for and enable the following APIs:

Google Sheets API

Google People API

Go to APIs & Services > Credentials.

Click + CREATE CREDENTIALS and select API Key. Copy this key somewhere safe.

Click + CREATE CREDENTIALS again and select OAuth 2.0 Client ID.

For Application type, select Web application.

Under Authorized JavaScript origins, add the URLs where you will host the application. For local testing and GitHub Pages, add the following:

http://localhost

http://127.0.0.1:5500 (or your local server's address)

https://your-github-username.github.io (replace with your actual GitHub username)

Click Create and copy the Client ID.

Go to APIs & Services > OAuth consent screen.

Set the Publishing status to "Testing".

Under Test users, click + ADD USERS and add the Google email address you will use to log in.

3. Configure the index.html File
Open the index.html file.

Scroll down to the <script> tag at the bottom and find the "USER CONFIGURATION SECTION".

Replace the placeholder values for CLIENT_ID, API_KEY, and SPREADSHEET_ID with the credentials you copied in the steps above.

4. Deploy to GitHub Pages
Create a new repository on GitHub.

Upload the index.html file to the repository.

In the repository's Settings, go to the Pages tab.

Under "Branch", select main (or master) and click Save.

Your site will be deployed at https://your-github-username.github.io/your-repository-name/.

License
This project is licensed under the MIT License. See the LICENSE.md file for details.