import { MainLayout } from './layouts/MainLayout'
import './App.css'

function App() {
  return (
    <MainLayout>
      <section className="welcome">
        <p className="eyebrow">Your next step starts here</p>
        <h1>Build your English, one day at a time.</h1>
        <p>
          Your learning space is ready. Courses, lessons, and practice tools
          will appear here as they are implemented.
        </p>
      </section>
    </MainLayout>
  )
}

export default App
