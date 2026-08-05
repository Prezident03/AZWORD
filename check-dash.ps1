$c = Get-Content d:\AZWORD\dashboard.html -Raw
$hasBooks = $c -match 'loadBooks'
$hasRender = $c -match 'function renderFolders'
$hasBooksGrid = $c -match 'books-grid'
$hasAdminItem = $c -match 'admin-nav-item'
Write-Output "loadBooks: $hasBooks"
Write-Output "renderFolders: $hasRender"
Write-Output "books-grid: $hasBooksGrid"
Write-Output "admin-nav-item: $hasAdminItem"