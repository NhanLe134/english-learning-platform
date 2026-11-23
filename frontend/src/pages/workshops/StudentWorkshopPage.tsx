import { StudentHeader } from '../courses/components/StudentHeader'
import '../courses/student-courses.css'

export function StudentWorkshopPage() {
  return (
    <div className="student-portal-page">
      <StudentHeader activePage="workshop" />
      <main className="student-portal-content">
        <h1 className="text-2xl font-bold text-ink-900">Workshop</h1>
      </main>
    </div>
  )
}

export default StudentWorkshopPage
