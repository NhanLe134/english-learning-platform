import { StudentHeader } from '../courses/components/StudentHeader'
import '../courses/student-courses.css'

export function StudentEbookPage() {
  return (
    <div className="student-portal-page">
      <StudentHeader activePage="ebook" />
      <main className="student-portal-content">
        <h1 className="text-2xl font-bold text-ink-900">Ebook</h1>
      </main>
    </div>
  )
}

export default StudentEbookPage
