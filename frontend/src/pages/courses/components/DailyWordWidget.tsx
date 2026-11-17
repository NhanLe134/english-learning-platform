import React, { useState } from 'react'
import { BookOpen, Volume2, Bot, ArrowRight, Check } from 'lucide-react'
import type { DailyWordData } from '../student-courses-data'

interface DailyWordWidgetProps {
  data: DailyWordData
  onPracticeAI?: (word: string) => void
}

export const DailyWordWidget: React.FC<DailyWordWidgetProps> = ({
  data,
  onPracticeAI,
}) => {
  const [isPlayingWord, setIsPlayingWord] = useState(false)
  const [isPlayingSentence, setIsPlayingSentence] = useState(false)
  const [practiceTriggered, setPracticeTriggered] = useState(false)

  const speakText = (text: string, isWord: boolean) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = isWord ? 0.85 : 0.95

    if (isWord) {
      setIsPlayingWord(true)
      utterance.onend = () => setIsPlayingWord(false)
      utterance.onerror = () => setIsPlayingWord(false)
    } else {
      setIsPlayingSentence(true)
      utterance.onend = () => setIsPlayingSentence(false)
      utterance.onerror = () => setIsPlayingSentence(false)
    }

    window.speechSynthesis.speak(utterance)
  }

  const handlePracticeClick = () => {
    setPracticeTriggered(true)
    setTimeout(() => setPracticeTriggered(false), 3000)
    if (onPracticeAI) {
      onPracticeAI(data.word)
    }
  }

  return (
    <div className="sidebar-widget-card">
      {/* Widget Header */}
      <div className="widget-header-row">
        <div className="widget-header-left">
          <div className="widget-icon-box">
            <BookOpen size={18} />
          </div>
          <div className="widget-title-text">
            <h3>Daily Word</h3>
            <p>Từ Vựng Mỗi Ngày</p>
          </div>
        </div>

        <span className="widget-badge-date">{data.date}</span>
      </div>

      {/* Vocabulary Display */}
      <div className="word-main-row">
        <h4 className="daily-word-heading">{data.word}</h4>
        <button
          type="button"
          className="audio-speaker-btn"
          onClick={() => speakText(data.word, true)}
          title="Nghe phát âm từ vựng"
          aria-label="Nghe phát âm từ vựng"
        >
          <Volume2 size={18} className={isPlayingWord ? 'animate-pulse text-brand-600' : ''} />
        </button>
        <span className="word-pos-tag">{data.partOfSpeech}</span>
      </div>

      <p className="word-phonetic">{data.phonetic}</p>

      <p className="word-definition">
        <strong>Nghĩa:</strong> {data.meaning}
      </p>

      {/* Real-world Example Card */}
      <div className="word-example-card">
        <div className="example-card-header">
          <span>VÍ DỤ THỰC TẾ</span>
          <button
            type="button"
            className="audio-speaker-btn"
            onClick={() => speakText(data.exampleEn, false)}
            title="Nghe câu ví dụ"
            aria-label="Nghe câu ví dụ"
          >
            <Volume2 size={14} className={isPlayingSentence ? 'animate-pulse text-brand-600' : ''} />
          </button>
        </div>

        <p className="example-sentence-en">“{data.exampleEn}”</p>
        <p className="example-sentence-vi">{data.exampleVi}</p>
      </div>

      {/* AI Pronunciation Practice Button */}
      <button
        type="button"
        className="btn-ai-practice"
        onClick={handlePracticeClick}
      >
        <div className="btn-ai-practice-left">
          {practiceTriggered ? (
            <Check size={16} className="text-emerald-600" />
          ) : (
            <Bot size={16} className="text-brand-600" />
          )}
          <span>
            {practiceTriggered
              ? 'Đang khởi động trợ lý AI...'
              : 'Luyện phát âm từ này cùng trợ lý AI'}
          </span>
        </div>
        <ArrowRight size={14} className="text-ink-400" />
      </button>
    </div>
  )
}
