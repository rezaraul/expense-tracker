# Expense Tracker v4

This release adds:
- Backup reminder banner
- Empty-database restore prompt
- Last-backup status
- One-tap encrypted backup creation with the iOS share/save sheet
- Manual iCloud Drive saving through the iPhone Files interface
- Migration attempt from the Version 3 IndexedDB database
- Clear notice that each Safari/Home Screen copy has separate local storage
- Configurable backup reminders every 3, 7, 14, or 30 days

## Important
A GitHub Pages web app cannot silently or automatically write to iCloud Drive in the background. Apple requires the user to choose the save destination. Version 4 opens the iPhone share/save flow so you can save the encrypted backup to iCloud Drive.

## Updating
Upload all files to the root of the existing GitHub repository and replace the existing files.
