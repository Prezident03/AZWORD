$c = Get-Content d:\AZWORD\book.html -Raw

# Add admin nav item before logout button
$adminLink = @"
    <!-- Admin panel (hidden by default, shown for admin users) -->
    <a class="nav-item" href="admin.html" id="book-admin-nav-item" style="display:none">
      Admin panel
    </a>
"@

$c = $c -replace '  <div class="sidebar-bottom">', "$adminLink`n  <div class=""sidebar-bottom"">"

# Add JavaScript to show admin link for admin users
$adminJs = @"
  if (user.email === 'abdurasul1406z@gmail.com') {
    const el = document.getElementById('book-admin-nav-item');
    if (el) el.style.display = 'flex';
  }
"@

$c = $c -replace '  // Load user data', "$adminJs`n`n  // Load user data"

Set-Content d:\AZWORD\book.html $c -NoNewline
Write-Output "Book.html updated with admin link"