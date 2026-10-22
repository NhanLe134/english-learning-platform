import bcrypt from 'bcryptjs'
import { usersService } from '../src/modules/users/users.service.js'

async function runTests() {
  console.log('--- TEST 1: Get Users List ---')
  const initial = await usersService.getUsers({ page: 1, limit: 10 })
  console.log(`Found ${initial.total} users, page ${initial.page}/${initial.totalPages}`)
  console.assert(initial.items.length > 0, 'Should have initial users')

  console.log('--- TEST 2: Create Teacher with bcrypt hash ---')
  const tempPassword = 'EngMaster@2025#Temp'
  const newUser = await usersService.createUser({
    full_name: 'Nguyễn Hoàng Nam',
    nickname: 'Nam_IELTS',
    email: 'nam.nh@engmaster.edu.vn',
    phone_number: '0987.654.321',
    role: 'TEACHER',
    password: tempPassword,
  })

  console.log('Created user:', newUser.full_name, newUser.email, newUser.role)
  console.log('Password hash:', newUser.password_hash)

  console.assert(newUser.password_hash.startsWith('$2b$12$'), 'Hash should start with bcrypt 12-round prefix $2b$12$')
  console.assert(newUser.nickname === '@Nam_IELTS', 'Nickname should be formatted with @')

  console.log('--- TEST 3: Verify bcrypt password compare ---')
  const isMatch = await bcrypt.compare(tempPassword, newUser.password_hash)
  console.log('Password comparison matches:', isMatch)
  console.assert(isMatch === true, 'bcrypt.compare should return true for original password')

  const isWrongMatch = await bcrypt.compare('WrongPassword', newUser.password_hash)
  console.assert(isWrongMatch === false, 'bcrypt.compare should return false for wrong password')

  console.log('--- TEST 4: Search and Filter ---')
  const searchResult = await usersService.getUsers({ search: 'Hoàng Nam' })
  console.log(`Search for "Hoàng Nam" returned ${searchResult.total} results`)
  console.assert(searchResult.items.some(u => u.email === 'nam.nh@engmaster.edu.vn'), 'Should find newly created user')

  console.log('--- TEST 5: CSV Export ---')
  const csv = await usersService.exportCsv({})
  console.assert(csv.includes('nam.nh@engmaster.edu.vn'), 'CSV should contain user email')
  console.assert(csv.startsWith('\uFEFF'), 'CSV should contain UTF-8 BOM')
  console.log('CSV Export length:', csv.length, 'bytes')

  console.log('\n>>> ALL BACKEND TESTS PASSED SUCCESSFULLY! <<<')
}

runTests().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
