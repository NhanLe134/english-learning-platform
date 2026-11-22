$base = "http://localhost:5000/api"
# Admin login
$loginBody = @{email="admin@example.com"; password="admin123"} | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Headers @{'Content-Type'='application/json'} -Body $loginBody -ErrorAction Stop
Write-Host "Admin login status: $($loginRes.success)"
$adminToken = $loginRes.data.accessToken
# Fetch my-courses for admin (should be empty or admin may have none)
$coursesRes = Invoke-RestMethod -Uri "$base/courses/my-courses" -Method GET -Headers @{'Authorization'="Bearer $adminToken"; 'Accept'='application/json'} -ErrorAction Stop
Write-Host "My-courses status: $($coursesRes.success)"
Write-Host "Courses payload: $(ConvertTo-Json $coursesRes -Depth 5)"
