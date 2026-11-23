import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  User,
  BookOpen,
  ArrowLeft,
  Check,
  LoaderCircle,
  FileText,
  FileAudio,
  Download,
  AlertTriangle,
} from 'lucide-react'
import { StudentHeader } from './components/StudentHeader'
import { StudentQuizOverlay } from './components/StudentQuizOverlay'
import type { StudentProfile } from './student-courses-data'
import { useAuth } from '../auth/auth-context'
import { courseCatalogApi } from './services/courseCatalogApi'
import type { CourseReference } from './course-data'
import {
  lessonApi,
  extractGoogleDriveEmbedUrl,
  extractYouTubeVideoId,
  type LessonQuiz,
} from '../them_bai_giang/services/lessonApi'
import {
  DEFAULT_LESSON_THUMBNAIL,
  formatLessonDuration,
  formatPlaybackTime,
  formatSidebarLessonInfo,
  getLessonThumbnail,
  type LatestExerciseResult,
  type StudentLessonItem,
} from './studentLessonHelpers'
import { VideoWatchTracker, type TrackerSnapshot } from './videoWatchTracker'
import './student-course-detail.css'

declare global {
  interface Window {
    YT?: {
      Player: any
      PlayerState: {
        UNSTARTED: number
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

interface StudentCourseDetailPageProps {
  courseSlug?: string
}

let apiLoadedPromise: Promise<void> | null = null

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT && window.YT.Player) {
    return Promise.resolve()
  }
  if (apiLoadedPromise) return apiLoadedPromise

  apiLoadedPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('youtube-iframe-api')
    if (!existing) {
      const tag = document.createElement('script')
      tag.id = 'youtube-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.onerror = () => {
        apiLoadedPromise = null
        reject(new Error('Không thể tải YouTube Player API.'))
      }
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag)
    }

    const previousCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback()
      resolve()
    }

    const timeout = setTimeout(() => {
      clearInterval(interval)
      if (window.YT && window.YT.Player) {
        resolve()
      } else {
        apiLoadedPromise = null
        reject(new Error('YouTube Player API quá thời gian phản hồi.'))
      }
    }, 10000)

    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(interval)
        clearTimeout(timeout)
        resolve()
      }
    }, 100)
  })

  return apiLoadedPromise
}

export const StudentCourseDetailPage: React.FC<StudentCourseDetailPageProps> = ({
  courseSlug,
}) => {
  const { accessToken, refreshSession, user } = useAuth()

  const resolvedCourseSlug =
    courseSlug ||
    new URLSearchParams(window.location.search).get('courseSlug') ||
    window.location.pathname.split('/').filter(Boolean).pop() ||
    'ngu-phap-tieng-anh'

  const headerStudent: StudentProfile = {
    name: user?.fullName || '',
    role: 'Học viên',
    email: user?.email,
    avatarUrl: user?.avatarUrl ?? null,
    streakDays: 0,
    weeklyGoalPercent: 0,
  }

  // Course and Lesson API state
  const [course, setCourse] = useState<CourseReference | null>(null)
  const [lessonsList, setLessonsList] = useState<StudentLessonItem[]>([])

  // Giải mã video_token học viên nhận từ API thành URL video thật.
  // Token = base64 của chuỗi URL đảo ngược (khớp maHoaVideoToken backend).
  function giaiMaVideoToken(token?: string | null): string {
    if (!token) return ''
    try {
      return atob(token).split('').reverse().join('')
    } catch {
      return ''
    }
  }
  const [activeLessonId, setActiveLessonId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const latestRequest = useRef(0)

  // Interactive video UI states
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoWatchedPercent, setVideoWatchedPercent] = useState(0)
  const [maxSeekableTime, setMaxSeekableTime] = useState(0)
  const [playerError, setPlayerError] = useState<string | null>(null)

  // Exercise & completion states (kept distinct from last_position_seconds)
  const [videoCompletedByLesson, setVideoCompletedByLesson] = useState<Record<string, boolean>>({})
  const [isExerciseOpen, setIsExerciseOpen] = useState(false)

  // Quiz thật từ backend (GET /lessons/:id/quiz — không kèm đáp án đúng)
  const [lessonQuiz, setLessonQuiz] = useState<LessonQuiz | null>(null)

  // Trạng thái bài tập/tiến độ từ bản merge (remote): khóa-mở bài tập + kết quả gần nhất
  const [unlockedExerciseMap, setUnlockedExerciseMap] = useState<Record<string, boolean>>({})
  const [latestExerciseResultMap, setLatestExerciseResultMap] = useState<
    Record<string, LatestExerciseResult>
  >({})

  // Tab & discussion state
  const [activeTab, setActiveTab] = useState<'objectives' | 'attachments' | 'discussion'>('objectives')
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<
    Array<{ id: string; author: string; role: string; content: string; time: string }>
  >([])

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500)
  }, [])

  const resetControlsTimeout = useCallback(() => {
    setIsControlsVisible(true)
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
      hideControlsTimeoutRef.current = null
    }
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false)
      }, 2500)
    }
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying) {
      setIsControlsVisible(true)
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
        hideControlsTimeoutRef.current = null
      }
    } else {
      resetControlsTimeout()
    }
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
        hideControlsTimeoutRef.current = null
      }
    }
  }, [isPlaying, resetControlsTimeout])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current)
    }
  }, [])

  // Refs for stable player access and race-free saving
  const videoContainerRef = useRef<HTMLDivElement | null>(null)
  const ytHostRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerRef = useRef<any>(null)

  const trackerRef = useRef<VideoWatchTracker>(new VideoWatchTracker())
  const playerLessonIdRef = useRef<string>('')
  const ytReadyRef = useRef<boolean>(false)
  const pendingPlayRef = useRef<boolean>(false)
  const isRestoringPositionRef = useRef<boolean>(false)
  const pendingRestoreSecondsRef = useRef<number>(0)
  const initialStartParamRef = useRef<number>(0)
  const lastSaveTimeRef = useRef<number>(0)
  const lastSavedKeyRef = useRef<string>('')
  const ytTickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRequestSeqRef = useRef<Record<string, number>>({})
  const savedLessonStateRef = useRef<
    Record<
      string,
      {
        lastPositionSeconds: number
        furthestWatchedTime: number
        progressPercent: number
        isCompleted: boolean
      }
    >
  >({})
  const isDraggingScrubberRef = useRef<boolean>(false)
  const scrubberBlockedToastShownRef = useRef<boolean>(false)
  const userIdRef = useRef<string>(user?.id || 'anon')
  useEffect(() => {
    userIdRef.current = user?.id || 'anon'
  }, [user?.id])

  const lessonsListRef = useRef<StudentLessonItem[]>(lessonsList)
  useEffect(() => {
    lessonsListRef.current = lessonsList
  }, [lessonsList])

  const accessTokenRef = useRef<string | null>(accessToken)
  useEffect(() => {
    accessTokenRef.current = accessToken
  }, [accessToken])

  const isMutedRef = useRef<boolean>(isMuted)
  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  const activeLessonIdRef = useRef<string>(activeLessonId)
  useEffect(() => {
    activeLessonIdRef.current = activeLessonId
  }, [activeLessonId])

  const isExerciseOpenRef = useRef<boolean>(isExerciseOpen)
  useEffect(() => {
    isExerciseOpenRef.current = isExerciseOpen
  }, [isExerciseOpen])

  const playerErrorRef = useRef<string | null>(playerError)
  useEffect(() => {
    playerErrorRef.current = playerError
  }, [playerError])

  const videoCurrentTimeRef = useRef<number>(videoCurrentTime)
  useEffect(() => {
    videoCurrentTimeRef.current = videoCurrentTime
  }, [videoCurrentTime])

  const videoDurationRef = useRef<number>(videoDuration)
  useEffect(() => {
    videoDurationRef.current = videoDuration
  }, [videoDuration])

  // Sync fullscreen change state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const getPendingCacheKey = useCallback((lessonId: string) => {
    return `lesson_playback_pending:${userIdRef.current}:${lessonId}`
  }, [])

  const getLatestExerciseKey = useCallback((lessonId: string) => {
    return `lesson_latest_exercise:${userIdRef.current}:${lessonId}`
  }, [])

  const writeLatestExerciseResult = useCallback(
    (lessonId: string, result: LatestExerciseResult) => {
      try {
        localStorage.setItem(getLatestExerciseKey(lessonId), JSON.stringify(result))
      } catch {
        // ignore storage quota errors
      }
    },
    [getLatestExerciseKey]
  )

  const readLatestExerciseResult = useCallback(
    (lessonId: string): LatestExerciseResult | null => {
      try {
        const raw = localStorage.getItem(getLatestExerciseKey(lessonId))
        if (!raw) return null
        const parsed = JSON.parse(raw) as { scorePercent?: unknown; passed?: unknown }
        const scorePercent = Number(parsed.scorePercent)
        if (!Number.isFinite(scorePercent)) return null
        return {
          scorePercent: Math.min(100, Math.max(0, Math.round(scorePercent))),
          passed: Boolean(parsed.passed),
        }
      } catch {
        return null
      }
    },
    [getLatestExerciseKey]
  )

  const writePendingPlaybackCache = useCallback(
    (
      lessonId: string,
      data: { lastPositionSeconds: number; furthestWatchedTime: number; progressPercent: number }
    ) => {
      try {
        localStorage.setItem(
          getPendingCacheKey(lessonId),
          JSON.stringify({ ...data, savedAt: Date.now() })
        )
      } catch {
        // ignore storage quota errors
      }
    },
    [getPendingCacheKey]
  )

  const clearPendingPlaybackCache = useCallback(
    (lessonId: string) => {
      try {
        localStorage.removeItem(getPendingCacheKey(lessonId))
      } catch {
        // ignore
      }
    },
    [getPendingCacheKey]
  )

  const readPendingPlaybackCache = useCallback(
    (
      lessonId: string
    ): { lastPositionSeconds: number; furthestWatchedTime: number; progressPercent: number } | null => {
      try {
        const raw = localStorage.getItem(getPendingCacheKey(lessonId))
        if (!raw) return null
        const parsed = JSON.parse(raw) as {
          lastPositionSeconds?: unknown
          furthestWatchedTime?: unknown
          progressPercent?: unknown
          savedAt?: unknown
        }
        const savedAt = Number(parsed.savedAt ?? 0)
        // Ignore stale pending cache older than 24 hours
        if (!Number.isFinite(savedAt) || Date.now() - savedAt > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(getPendingCacheKey(lessonId))
          return null
        }
        const lastPositionSeconds = Number(parsed.lastPositionSeconds ?? 0)
        const furthestWatchedTime = Number(parsed.furthestWatchedTime ?? 0)
        const progressPercent = Number(parsed.progressPercent ?? 0)
        if (
          !Number.isFinite(lastPositionSeconds) ||
          !Number.isFinite(furthestWatchedTime) ||
          !Number.isFinite(progressPercent)
        ) {
          return null
        }
        return {
          lastPositionSeconds: Math.max(0, Math.floor(lastPositionSeconds)),
          furthestWatchedTime: Math.max(0, furthestWatchedTime),
          progressPercent: Math.min(99, Math.max(0, Math.round(progressPercent))),
        }
      } catch {
        return null
      }
    },
    [getPendingCacheKey]
  )

  const sampleActivePlayerTime = useCallback((lessonId: string) => {
    if (!lessonId || playerLessonIdRef.current !== lessonId) return
    if (isRestoringPositionRef.current || pendingRestoreSecondsRef.current > 0) return
    const tracker = trackerRef.current
    if (tracker.getLessonId() !== lessonId) return

    if (currentYouTubeIdRef.current && playerRef.current && ytReadyRef.current) {
      try {
        const state = playerRef.current.getPlayerState?.()
        if (state === 1) {
          const cur = Number(playerRef.current.getCurrentTime?.() || 0)
          const rate = Number(playerRef.current.getPlaybackRate?.() || 1)
          if (Number.isFinite(cur) && cur >= 0) {
            tracker.onTimeSample(cur, Date.now(), rate)
          }
        }
      } catch {
        // ignore
      }
    } else if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
      const cur = videoRef.current.currentTime
      const rate = videoRef.current.playbackRate || 1
      if (Number.isFinite(cur) && cur >= 0) {
        tracker.onTimeSample(cur, Date.now(), rate)
      }
    }
  }, [])

  const handleUpdateProgress = useCallback(
    async (
      lessonId: string,
      seconds: number,
      percent?: number,
      completed?: boolean,
      durationSeconds?: number,
      keepalive = false,
      resetProgress = false
    ) => {
      const token = accessTokenRef.current
      if (!lessonId || !token) return
      const seq = (progressRequestSeqRef.current[lessonId] || 0) + 1
      progressRequestSeqRef.current[lessonId] = seq
      try {
        const roundedSeconds = Math.max(0, Math.floor(seconds))
        const res = await lessonApi.updateProgress(
          lessonId,
          {
            last_position_seconds: roundedSeconds,
            progress_percent: percent,
            is_completed: completed,
            duration_seconds:
              durationSeconds && durationSeconds > 0 ? Math.round(durationSeconds) : undefined,
            reset_progress: resetProgress,
          },
          token,
          async () => (await refreshSession()).accessToken,
          keepalive
        )

        // Ignore stale async responses that resolved out of order
        if (progressRequestSeqRef.current[lessonId] !== seq) return

        clearPendingPlaybackCache(lessonId)
        if (resetProgress && !res.is_completed && res.progress_percent === 0) {
          try {
            localStorage.removeItem(`lesson_retry_required:${lessonId}`)
          } catch {
            // ignore
          }
        }

        const isActiveLesson =
          playerLessonIdRef.current === lessonId && trackerRef.current.getLessonId() === lessonId

        setLessonsList((prev) =>
          prev.map((item) => {
            if (item.id !== lessonId) return item
            const newCompleted = item.status === 'completed' || res.is_completed
            const newPercent = newCompleted
              ? 100
              : resetProgress
              ? res.progress_percent
              : Math.min(99, Math.max(item.progressPercent, res.progress_percent))
            const resolvedPosition =
              !resetProgress && isActiveLesson && trackerRef.current.hasUnsavedChanges()
                ? Math.floor(trackerRef.current.getLastValidTime())
                : res.last_position_seconds
            return {
              ...item,
              lastPositionSeconds: resolvedPosition,
              progressPercent: newPercent,
              status: newCompleted ? 'completed' : newPercent > 0 ? 'in_progress' : 'not_started',
            }
          })
        )
      } catch (err) {
        console.error('Không thể cập nhật tiến độ học tập:', err)
      }
    },
    [refreshSession, clearPendingPlaybackCache]
  )

  const handleUpdateProgressRef = useRef(handleUpdateProgress)
  useEffect(() => {
    handleUpdateProgressRef.current = handleUpdateProgress
  }, [handleUpdateProgress])

  /**
   * Persist the student's current playback position for a specific lesson ID without
   * altering any other lesson or downgrading completed progress.
   */
  const saveCurrentPosition = useCallback(
    (lessonId: string, keepalive = false, force = false) => {
      if (!lessonId || !accessTokenRef.current) return
      if (playerLessonIdRef.current !== lessonId) return

      const tracker = trackerRef.current
      if (tracker.getLessonId() !== lessonId) return
      sampleActivePlayerTime(lessonId)
      if (!force && !tracker.hasUnsavedChanges()) return

      const curTime = Math.max(0, tracker.getLastValidTime())
      const dur = tracker.getDuration()
      const snapshot = tracker.getSnapshot()
      const roundedSeconds = Math.floor(curTime)
      const dedupeKey = `${lessonId}:${roundedSeconds}:${snapshot.lessonProgressPercent}:${snapshot.isLessonCompleted}`

      if (!force && dedupeKey === lastSavedKeyRef.current) return
      lastSavedKeyRef.current = dedupeKey

      if (roundedSeconds > 0 || snapshot.lessonProgressPercent > 0) {
        try {
          localStorage.removeItem(`lesson_retry_required:${lessonId}`)
        } catch {
          // ignore
        }
      }

      const existingLesson = lessonsListRef.current.find((item) => item.id === lessonId)
      const isCompleted = Boolean(existingLesson?.status === 'completed') || snapshot.isLessonCompleted
      const nextPercent = isCompleted
        ? 100
        : Math.min(99, Math.max(existingLesson?.progressPercent || 0, snapshot.lessonProgressPercent))

      savedLessonStateRef.current[lessonId] = {
        lastPositionSeconds: roundedSeconds,
        furthestWatchedTime: Math.max(
          savedLessonStateRef.current[lessonId]?.furthestWatchedTime || 0,
          tracker.getFurthestWatchedTime()
        ),
        progressPercent: nextPercent,
        isCompleted,
      }

      if (!isCompleted) {
        writePendingPlaybackCache(lessonId, {
          lastPositionSeconds: roundedSeconds,
          furthestWatchedTime: savedLessonStateRef.current[lessonId]!.furthestWatchedTime,
          progressPercent: nextPercent,
        })
      }

      // Keep local list synchronized so returning within the same session restores accurately
      setLessonsList((prev) =>
        prev.map((item) => {
          if (item.id !== lessonId) return item
          const itemCompleted = item.status === 'completed' || snapshot.isLessonCompleted
          const itemNextPercent = itemCompleted
            ? 100
            : Math.min(99, Math.max(item.progressPercent, snapshot.lessonProgressPercent))
          return {
            ...item,
            lastPositionSeconds: roundedSeconds,
            progressPercent: itemNextPercent,
            status: itemCompleted ? 'completed' : itemNextPercent > 0 ? 'in_progress' : 'not_started',
          }
        })
      )

      void handleUpdateProgressRef.current(
        lessonId,
        roundedSeconds,
        nextPercent,
        isCompleted,
        dur > 0 ? dur : undefined,
        keepalive
      )
    },
    [sampleActivePlayerTime, writePendingPlaybackCache]
  )

  const saveCurrentPositionRef = useRef(saveCurrentPosition)
  useEffect(() => {
    saveCurrentPositionRef.current = saveCurrentPosition
  }, [saveCurrentPosition])

  const applyLiveTrackerSnapshot = useCallback((lessonId: string, snap: TrackerSnapshot) => {
    setVideoCurrentTime(snap.currentTime)
    setVideoWatchedPercent(snap.videoWatchedPercent)
    setMaxSeekableTime(trackerRef.current.getMaxSeekableTime())
    if (snap.duration > 0) {
      setVideoDuration(snap.duration)
    }

    const existingSaved = savedLessonStateRef.current[lessonId]
    const mergedCompleted = Boolean(existingSaved?.isCompleted) || snap.isLessonCompleted
    savedLessonStateRef.current[lessonId] = {
      lastPositionSeconds: Math.floor(snap.currentTime),
      furthestWatchedTime: Math.max(
        existingSaved?.furthestWatchedTime || 0,
        trackerRef.current.getFurthestWatchedTime()
      ),
      progressPercent: mergedCompleted
        ? 100
        : Math.min(99, Math.max(existingSaved?.progressPercent || 0, snap.lessonProgressPercent)),
      isCompleted: mergedCompleted,
    }

    setLessonsList((prev) => {
      let changed = false
      const next = prev.map((item) => {
        if (item.id !== lessonId) return item
        const nextDurSec =
          snap.duration > 0 && (!item.durationSeconds || item.durationSeconds <= 0)
            ? Math.round(snap.duration)
            : item.durationSeconds
        const nextDurLabel =
          nextDurSec !== item.durationSeconds
            ? formatLessonDuration(nextDurSec)
            : item.duration
        const nextCompleted = item.status === 'completed' || snap.isLessonCompleted
        const nextPct = nextCompleted
          ? 100
          : Math.min(99, Math.max(item.progressPercent, snap.lessonProgressPercent))
        const nextPos = Math.floor(snap.currentTime)

        if (
          nextDurSec === item.durationSeconds &&
          nextPct === item.progressPercent &&
          nextPos === item.lastPositionSeconds &&
          nextCompleted === (item.status === 'completed')
        ) {
          return item
        }
        changed = true
        return {
          ...item,
          durationSeconds: nextDurSec,
          duration: nextDurLabel,
          lastPositionSeconds: nextPos,
          progressPercent: nextPct,
          status: nextCompleted ? 'completed' : nextPct > 0 ? 'in_progress' : item.status,
        }
      })
      return changed ? next : prev
    })
  }, [])

  const applyLiveTrackerSnapshotRef = useRef(applyLiveTrackerSnapshot)
  useEffect(() => {
    applyLiveTrackerSnapshotRef.current = applyLiveTrackerSnapshot
  }, [applyLiveTrackerSnapshot])

  const showToastRef = useRef(showToast)
  useEffect(() => {
    showToastRef.current = showToast
  }, [showToast])

  /**
   * Handles genuine player ending: verifies continuous watched progress via VideoWatchTracker,
   * rejects skipped ends, caps progress at 99% until exercises pass, and auto-opens the exercise popup.
   */
  const handlePlayerEnded = useCallback((lessonId: string, rawDurationSeconds: number) => {
    if (playerLessonIdRef.current !== lessonId) return
    const tracker = trackerRef.current
    if (tracker.getLessonId() !== lessonId) return

    if (rawDurationSeconds > 0 && tracker.getDuration() <= 0) {
      tracker.setDuration(rawDurationSeconds)
    }

    const res = tracker.onEnded(Date.now())
    if (!res.genuine) {
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        try {
          playerRef.current.seekTo(res.revertToSeconds, true)
          playerRef.current.pauseVideo?.()
        } catch {
          // ignore
        }
      } else if (videoRef.current) {
        videoRef.current.currentTime = res.revertToSeconds
        videoRef.current.pause()
      }
      setIsPlaying(false)
      applyLiveTrackerSnapshotRef.current(lessonId, res.snapshot)
      showToastRef.current('Vui lòng xem hết toàn bộ nội dung video trước khi làm bài tập.')
      return
    }

    setIsPlaying(false)
    setVideoCompletedByLesson((prev) => ({ ...prev, [lessonId]: true }))
    applyLiveTrackerSnapshotRef.current(lessonId, res.snapshot)

    const targetLesson = lessonsListRef.current.find((l) => l.id === lessonId)
    const alreadyCompleted = Boolean(targetLesson?.status === 'completed')
    const dur = res.snapshot.duration || targetLesson?.durationSeconds || 0

    void handleUpdateProgressRef.current(
      lessonId,
      Math.floor(dur),
      alreadyCompleted ? 100 : 99,
      alreadyCompleted,
      dur > 0 ? dur : undefined,
      false
    )

    if (res.shouldOpenExercise) {
      if (quizStatusRef.current === 'ready') {
        setIsExerciseOpen(true)
        showToastRef.current(
          alreadyCompleted
            ? 'Video đã kết thúc! Bạn có thể làm lại bài kiểm tra ôn tập.'
            : '🎉 Bạn đã xem hết video! Hãy hoàn thành bài kiểm tra để đạt 100%.'
        )
      } else if (quizStatusRef.current === 'loading') {
        // Quiz đang tải — vẫn mở, overlay sẽ hiện "Đang tải câu hỏi..."
        setIsExerciseOpen(true)
      } else if (quizStatusRef.current === 'error') {
        showToastRef.current(`Video đã kết thúc nhưng không tải được bài kiểm tra: ${quizErrorRef.current}`)
      } else {
        showToastRef.current('Video đã kết thúc. Bài giảng này hiện chưa có bài kiểm tra trắc nghiệm.')
      }
    }
  }, [])

  const handlePlayerEndedRef = useRef(handlePlayerEnded)
  useEffect(() => {
    handlePlayerEndedRef.current = handlePlayerEnded
  }, [handlePlayerEnded])

  // Current lesson derivation
  const currentLessonItem: StudentLessonItem | null =
    lessonsList.find((l) => l.id === activeLessonId) || lessonsList[0] || null

  const currentYouTubeId = extractYouTubeVideoId(currentLessonItem?.videoUrl)
  const currentYouTubeIdRef = useRef<string | null>(currentYouTubeId)
  useEffect(() => {
    currentYouTubeIdRef.current = currentYouTubeId
  }, [currentYouTubeId])
  const driveEmbedUrl = !currentYouTubeId
    ? extractGoogleDriveEmbedUrl(currentLessonItem?.videoUrl)
    : null
  const isHtml5Video = Boolean(currentLessonItem?.videoUrl && !currentYouTubeId && !driveEmbedUrl)

  // Bài chưa hoàn thành nhưng nộp quiz trượt lần trước → phải xem lại video từ đầu
  const isRetryRequired = Boolean(
    currentLessonItem &&
      currentLessonItem.status !== 'completed' &&
      typeof window !== 'undefined' &&
      localStorage.getItem(`lesson_retry_required:${currentLessonItem.id}`) === 'true'
  )

  const isCurrentLessonVideoCompleted = Boolean(
    currentLessonItem &&
      !isRetryRequired &&
      (videoCompletedByLesson[currentLessonItem.id] ??
        (currentLessonItem.status === 'completed' || currentLessonItem.progressPercent >= 99))
  )

  // Fetch course & published lessons from API
  useEffect(() => {
    let cancelled = false
    const requestId = ++latestRequest.current

    async function loadCourseAndLessons() {
      try {
        setLoading(true)
        setError(null)

        let loadedCourse: CourseReference | null = null
        try {
          loadedCourse = await courseCatalogApi.get(resolvedCourseSlug, accessToken || undefined)
          if (!cancelled && requestId === latestRequest.current) {
            setCourse(loadedCourse)
          }
        } catch (courseError) {
          console.warn(
            '[StudentCourseDetail] Course catalog lookup failed, trying enrolled courses fallback:',
            courseError
          )
          if (accessToken) {
            try {
              const myCourses = await courseCatalogApi.getMyCourses(accessToken)
              const match = myCourses.find(
                (c) =>
                  c.slug === resolvedCourseSlug ||
                  c.course_id === resolvedCourseSlug ||
                  c.id === resolvedCourseSlug
              )
              if (match) {
                loadedCourse = {
                  id: match.course_id,
                  slug: match.slug,
                  title: match.title,
                  details: `${match.total_lessons} bài học · ${match.category} · ${match.level}`,
                  thumbnailUrl: match.thumbnail_url,
                  instructor: match.teacher?.full_name || 'Giảng viên',
                  instructorAvatarUrl: match.teacher?.avatar_url ?? null,
                  price: 0,
                  originalPrice: 0,
                  description: '',
                  category: match.category,
                  level: match.level,
                  targetAudience: '',
                  totalLessons: match.total_lessons,
                  modules: [],
                  highlights: [],
                  isPopular: false,
                  iconType: 'award',
                }
                if (!cancelled && requestId === latestRequest.current) {
                  setCourse(loadedCourse)
                }
              }
            } catch {
              // ignore
            }
          }
        }

        const targetIdentifier = loadedCourse?.id || resolvedCourseSlug
        const rawTopics = await lessonApi.getTopics(
          targetIdentifier,
          accessToken,
          async () => (await refreshSession()).accessToken
        )
        if (cancelled || requestId !== latestRequest.current) return

        const flattened: StudentLessonItem[] = []
        const initialVideoCompleted: Record<string, boolean> = {}
        const initialUnlockedExercise: Record<string, boolean> = {}
        let numberCounter = 1

        const sortedTopics = [...rawTopics].sort((a, b) => a.sort_order - b.sort_order)
        for (const topic of sortedTopics) {
          const sortedLessons = [...(topic.lessons || [])].sort(
            (a, b) => a.sort_order - b.sort_order
          )
          for (const l of sortedLessons) {
            const isCompleted = Boolean(l.progress?.is_completed)
            const isLessonRetryRequired =
              !isCompleted &&
              typeof window !== 'undefined' &&
              localStorage.getItem(`lesson_retry_required:${l.id}`) === 'true'

            const apiPct = Number(l.progress?.progress_percent ?? 0)
            const apiPos = Number(l.progress?.last_position_seconds ?? 0)

            if (isCompleted) {
              try {
                localStorage.removeItem(`lesson_retry_required:${l.id}`)
              } catch {
                // ignore
              }
              clearPendingPlaybackCache(l.id)
            } else if (isLessonRetryRequired) {
              clearPendingPlaybackCache(l.id)
              if (apiPct > 0 || apiPos > 0) {
                void handleUpdateProgressRef.current(
                  l.id,
                  0,
                  0,
                  false,
                  l.duration_seconds || undefined,
                  false,
                  true
                )
              } else {
                try {
                  localStorage.removeItem(`lesson_retry_required:${l.id}`)
                } catch {
                  // ignore
                }
              }
            }

            const pendingCache = !isCompleted && !isLessonRetryRequired
              ? readPendingPlaybackCache(l.id)
              : null

            const rawPct = isLessonRetryRequired
              ? 0
              : Math.max(apiPct, pendingCache?.progressPercent ?? 0)
            const pct = isCompleted ? 100 : Math.min(99, Math.max(0, rawPct))
            const lastPos = isLessonRetryRequired
              ? 0
              : pendingCache
              ? pendingCache.lastPositionSeconds
              : apiPos
            const furthestFromPct =
              l.duration_seconds && l.duration_seconds > 0 ? (pct / 100) * l.duration_seconds : 0
            const savedFurthest = isCompleted
              ? l.duration_seconds || lastPos
              : isLessonRetryRequired
              ? 0
              : Math.max(lastPos, furthestFromPct, pendingCache?.furthestWatchedTime ?? 0)

            savedLessonStateRef.current[l.id] = {
              lastPositionSeconds: lastPos,
              furthestWatchedTime: savedFurthest,
              progressPercent: pct,
              isCompleted,
            }

            if (isCompleted || (!isLessonRetryRequired && pct >= 99)) {
              initialVideoCompleted[l.id] = true
              initialUnlockedExercise[l.id] = true
            }

            flattened.push({
              id: l.id,
              topicId: topic.id,
              topicTitle: topic.title,
              lessonNumber: numberCounter++,
              title: l.title,
              description: l.description,
              videoUrl: giaiMaVideoToken(l.video_token ?? l.video_url),
              thumbnailUrl: l.thumbnail_url || null,
              duration: formatLessonDuration(l.duration_seconds),
              durationSeconds: l.duration_seconds || 0,
              materials: l.materials || [],
              sortOrder: l.sort_order,
              status: isCompleted ? 'completed' : pct > 0 ? 'in_progress' : 'not_started',
              progressPercent: pct,
              lastPositionSeconds: lastPos,
            })
          }
        }

        // Kết quả bài tập gần nhất lưu tại chỗ (sidebar hiện điểm lần làm cuối)
        const initialLatestExerciseResults: Record<string, LatestExerciseResult> = {}
        for (const l of flattened) {
          const savedExercise = readLatestExerciseResult(l.id)
          if (savedExercise) {
            initialLatestExerciseResults[l.id] = savedExercise
          }
        }
        setLatestExerciseResultMap((prev) => ({ ...initialLatestExerciseResults, ...prev }))
        setVideoCompletedByLesson((prev) => ({ ...initialVideoCompleted, ...prev }))
        setUnlockedExerciseMap((prev) => ({ ...initialUnlockedExercise, ...prev }))
        setLessonsList(flattened)
        if (flattened.length > 0) {
          setActiveLessonId((prev) => {
            const exists = flattened.some((item) => item.id === prev)
            return exists ? prev : flattened[0]!.id
          })
        }
      } catch (err) {
        if (cancelled || requestId !== latestRequest.current) return
        setError(err instanceof Error ? err.message : 'Không thể tải thông tin bài học.')
      } finally {
        if (!cancelled && requestId === latestRequest.current) {
          setLoading(false)
        }
      }
    }

    void loadCourseAndLessons()

    return () => {
      cancelled = true
    }
  }, [
    resolvedCourseSlug,
    accessToken,
    refreshSession,
    clearPendingPlaybackCache,
    readPendingPlaybackCache,
    readLatestExerciseResult,
  ])

  // Initialize YouTube Player API imperatively into ytHostRef (dependencies strictly limited to activeLessonId & currentYouTubeId)
  useEffect(() => {
    if (!activeLessonId || !currentYouTubeId) {
      return
    }

    let isCancelled = false
    const lessonId = activeLessonId
    const targetLesson = lessonsListRef.current.find((l) => l.id === lessonId)

    const isRetry =
      targetLesson?.status !== 'completed' &&
      typeof window !== 'undefined' &&
      localStorage.getItem(`lesson_retry_required:${lessonId}`) === 'true'
    const cachedState = savedLessonStateRef.current[lessonId]
    const isLessonDone = Boolean(targetLesson?.status === 'completed' || cachedState?.isCompleted)
    const savedPos = isRetry
      ? 0
      : cachedState
      ? cachedState.lastPositionSeconds
      : targetLesson?.lastPositionSeconds || 0
    const savedPct = isRetry
      ? 0
      : isLessonDone
      ? 100
      : Math.max(targetLesson?.progressPercent || 0, cachedState?.progressPercent || 0)
    const savedFurthest = isRetry ? 0 : cachedState?.furthestWatchedTime

    const { restorePosition } = trackerRef.current.initializeForLesson({
      lessonId,
      duration: targetLesson?.durationSeconds || 0,
      savedPositionSeconds: savedPos,
      savedProgressPercent: savedPct,
      isCompleted: isLessonDone,
      savedFurthestSeconds: savedFurthest,
    })

    const initialSnap = trackerRef.current.getSnapshot()
    const startSeconds = Math.floor(restorePosition)
    playerLessonIdRef.current = lessonId
    ytReadyRef.current = false
    pendingPlayRef.current = false
    isRestoringPositionRef.current = restorePosition > 0
    pendingRestoreSecondsRef.current = restorePosition
    initialStartParamRef.current = startSeconds
    lastSavedKeyRef.current = ''
    lastSaveTimeRef.current = 0
    if (restorePosition > 0) {
      trackerRef.current.beginAuthorizedSeek(restorePosition, Date.now())
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync player UI immediately on lesson change
    setPlayerError(null)
    setIsPlaying(false)
    setVideoCurrentTime(initialSnap.currentTime)
    setVideoDuration(initialSnap.duration)
    setVideoWatchedPercent(initialSnap.videoWatchedPercent)
    setMaxSeekableTime(trackerRef.current.getMaxSeekableTime())

    const hostEl = ytHostRef.current
    if (!hostEl) return

    hostEl.innerHTML = ''
    const mountDiv = document.createElement('div')
    mountDiv.style.width = '100%'
    mountDiv.style.height = '100%'
    hostEl.appendChild(mountDiv)

    void loadYouTubeIframeApi()
      .then(() => {
        if (isCancelled || !hostEl.contains(mountDiv) || !window.YT?.Player) return

        const playerVars: Record<string, string | number> = {
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
          cc_load_policy: 0,
          origin: window.location.origin,
        }
        if (startSeconds > 0) {
          playerVars.start = startSeconds
        }

        playerRef.current = new window.YT.Player(mountDiv, {
          width: '100%',
          height: '100%',
          videoId: currentYouTubeId,
          playerVars,
          events: {
            onReady: (event: any) => {
              if (isCancelled) return
              ytReadyRef.current = true
              try {
                const iframe = event.target.getIframe?.() as HTMLIFrameElement | null
                if (iframe) {
                  iframe.tabIndex = -1
                  iframe.setAttribute(
                    'allow',
                    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                  )
                }

                event.target.setPlaybackRate?.(1)
                if (isMutedRef.current) {
                  event.target.mute?.()
                } else {
                  event.target.unMute?.()
                }

                const dur = Number(event.target.getDuration?.() || 0)
                let targetRestore = pendingRestoreSecondsRef.current
                if (dur > 0) {
                  const { restorePosition: validatedRestore } = trackerRef.current.setDuration(dur)
                  pendingRestoreSecondsRef.current = validatedRestore
                  targetRestore = validatedRestore
                }

                // Use cueVideoById instead of seekTo in onReady so YouTube never starts playing from 0:00
                // while positioning its native red progress bar and start timestamp.
                const targetStartSeconds = Math.floor(targetRestore)
                if (Math.abs(targetStartSeconds - initialStartParamRef.current) >= 1) {
                  isRestoringPositionRef.current = true
                  initialStartParamRef.current = targetStartSeconds
                  trackerRef.current.beginAuthorizedSeek(targetRestore, Date.now())
                  event.target.cueVideoById?.({
                    videoId: currentYouTubeId,
                    startSeconds: targetStartSeconds,
                  })
                  applyLiveTrackerSnapshotRef.current(
                    lessonId,
                    trackerRef.current.getSnapshot()
                  )
                } else {
                  isRestoringPositionRef.current = false
                  applyLiveTrackerSnapshotRef.current(
                    lessonId,
                    trackerRef.current.getSnapshot()
                  )
                  if (pendingPlayRef.current) {
                    pendingPlayRef.current = false
                    event.target.playVideo?.()
                  }
                }
              } catch {
                // ignore
              }
            },
            onPlaybackRateChange: (event: any) => {
              if (isCancelled) return
              if (typeof event.data === 'number' && Math.abs(event.data - 1) > 0.05) {
                try {
                  event.target.setPlaybackRate?.(1)
                } catch {
                  // ignore
                }
                showToastRef.current('Tốc độ phát được cố định ở 1.0x.')
              }
            },
            onStateChange: (event: any) => {
              if (isCancelled) return
              const state = event.data

              if (ytTickIntervalRef.current) {
                clearInterval(ytTickIntervalRef.current)
                ytTickIntervalRef.current = null
              }

              // -1: UNSTARTED, 0: ENDED, 1: PLAYING, 2: PAUSED, 3: BUFFERING, 5: CUED
              if (state === 1) {
                try {
                  const dur = Number(event.target.getDuration?.() || 0)
                  if (dur > 0 && trackerRef.current.getDuration() <= 0) {
                    const { restorePosition: validatedRestore } = trackerRef.current.setDuration(dur)
                    if (pendingRestoreSecondsRef.current > 0) {
                      pendingRestoreSecondsRef.current = validatedRestore
                    }
                  }

                  const cur = Number(event.target.getCurrentTime?.() || 0)
                  if (
                    pendingRestoreSecondsRef.current > 0 &&
                    Math.abs(cur - pendingRestoreSecondsRef.current) > 1.5
                  ) {
                    trackerRef.current.beginAuthorizedSeek(
                      pendingRestoreSecondsRef.current,
                      Date.now()
                    )
                    event.target.seekTo?.(pendingRestoreSecondsRef.current, true)
                    return
                  }

                  if (
                    pendingRestoreSecondsRef.current === 0 &&
                    initialStartParamRef.current > 0 &&
                    !trackerRef.current.hasPlaybackActivity() &&
                    cur > 2
                  ) {
                    trackerRef.current.beginAuthorizedSeek(0, Date.now())
                    event.target.seekTo?.(0, true)
                    return
                  }

                  if (pendingRestoreSecondsRef.current > 0) {
                    pendingRestoreSecondsRef.current = 0
                  }
                  isRestoringPositionRef.current = false

                  const rate = Number(event.target.getPlaybackRate?.() || 1)
                  if (Math.abs(rate - 1) > 0.05) {
                    event.target.setPlaybackRate?.(1)
                  }
                } catch {
                  // ignore
                }

                trackerRef.current.onPlay(Date.now())
                setIsPlaying(true)

                ytTickIntervalRef.current = setInterval(() => {
                  if (isCancelled || !playerRef.current) return
                  try {
                    const rate = Number(playerRef.current.getPlaybackRate?.() || 1)
                    if (Math.abs(rate - 1) > 0.05) {
                      playerRef.current.setPlaybackRate?.(1)
                    }
                    const dur = Number(playerRef.current.getDuration?.() || 0)
                    if (dur > 0 && trackerRef.current.getDuration() <= 0) {
                      trackerRef.current.setDuration(dur)
                    }
                    const cur = Number(playerRef.current.getCurrentTime?.() || 0)
                    const tick = trackerRef.current.onTimeSample(cur, Date.now(), rate)
                    if (tick.seekBlocked) {
                      playerRef.current.seekTo?.(tick.revertToSeconds, true)
                      showToastRef.current('Không thể tua nhanh hoặc kéo thanh thời gian video.')
                    }
                    applyLiveTrackerSnapshotRef.current(
                      lessonId,
                      trackerRef.current.getSnapshot()
                    )

                    const now = Date.now()
                    if (now - lastSaveTimeRef.current >= 5000) {
                      lastSaveTimeRef.current = now
                      saveCurrentPositionRef.current(lessonId, false)
                    }
                  } catch {
                    // ignore
                  }
                }, 250)
              } else if (state === 2) {
                try {
                  const cur = Number(event.target.getCurrentTime?.() || 0)
                  const rate = Number(event.target.getPlaybackRate?.() || 1)
                  if (
                    !isRestoringPositionRef.current &&
                    pendingRestoreSecondsRef.current === 0 &&
                    Number.isFinite(cur) &&
                    cur >= 0
                  ) {
                    trackerRef.current.onTimeSample(cur, Date.now(), rate)
                  }
                } catch {
                  // ignore
                }
                trackerRef.current.onPauseOrBuffer()
                setIsPlaying(false)
                applyLiveTrackerSnapshotRef.current(
                  lessonId,
                  trackerRef.current.getSnapshot()
                )
                saveCurrentPositionRef.current(lessonId, false, true)
              } else if (state === 3) {
                // Buffering: pause watch interval tracking so buffering never counts as watched
                trackerRef.current.onPauseOrBuffer()
              } else if (state === 5) {
                // Cued: YouTube confirmed cueVideoById at target startSeconds without playing from 0:00
                if (isRestoringPositionRef.current) {
                  isRestoringPositionRef.current = false
                  applyLiveTrackerSnapshotRef.current(
                    lessonId,
                    trackerRef.current.getSnapshot()
                  )
                  if (pendingPlayRef.current) {
                    pendingPlayRef.current = false
                    try {
                      event.target.playVideo?.()
                    } catch {
                      // ignore
                    }
                  }
                }
              } else if (state === 0) {
                let dur = trackerRef.current.getDuration()
                try {
                  dur = Number(event.target.getDuration?.() || 0) || dur
                } catch {
                  // ignore
                }
                handlePlayerEndedRef.current(lessonId, dur)
              }
            },
            onError: (event: any) => {
              if (isCancelled) return
              setIsPlaying(false)
              const code = event.data
              if (code === 101 || code === 150) {
                setPlayerError('Chủ sở hữu video không cho phép phát nhúng trên trang web khác.')
              } else if (code === 100) {
                setPlayerError('Video YouTube không tồn tại hoặc đã bị gỡ bỏ.')
              } else if (code === 2) {
                setPlayerError('Đường dẫn video YouTube không hợp lệ.')
              } else {
                setPlayerError('Không thể phát video YouTube này.')
              }
            },
          },
        })
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          setPlayerError(err instanceof Error ? err.message : 'Không thể khởi tạo trình phát YouTube.')
        }
      })

    return () => {
      isCancelled = true
      if (ytTickIntervalRef.current) {
        clearInterval(ytTickIntervalRef.current)
        ytTickIntervalRef.current = null
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy?.()
        } catch {
          // ignore
        }
        playerRef.current = null
      }
      ytReadyRef.current = false
      pendingPlayRef.current = false
      if (hostEl) {
        hostEl.innerHTML = ''
      }
    }
  }, [activeLessonId, currentYouTubeId])

  const applyPendingHtml5Restore = useCallback(
    (target: HTMLVideoElement, lessonId: string) => {
      if (playerLessonIdRef.current !== lessonId) return
      const dur = Number.isFinite(target.duration) && target.duration > 0 ? target.duration : 0
      if (dur > 0) {
        const { restorePosition: validatedRestore } = trackerRef.current.setDuration(dur)
        if (pendingRestoreSecondsRef.current > 0) {
          pendingRestoreSecondsRef.current = validatedRestore
        }
      }

      const targetRestore = pendingRestoreSecondsRef.current
      if (targetRestore > 0 && (dur <= 0 || dur > targetRestore)) {
        if (Math.abs(target.currentTime - targetRestore) > 0.5) {
          if (!target.paused) {
            target.pause()
          }
          isRestoringPositionRef.current = true
          trackerRef.current.beginAuthorizedSeek(targetRestore, Date.now())
          try {
            target.currentTime = targetRestore
          } catch {
            // Browser may not allow seeking until more media data is loaded; onCanPlay/onLoadedData will retry
          }
        } else {
          pendingRestoreSecondsRef.current = 0
          isRestoringPositionRef.current = false
          if (pendingPlayRef.current) {
            pendingPlayRef.current = false
            target.playbackRate = 1
            void target.play().catch(() => {})
          }
        }
      } else {
        pendingRestoreSecondsRef.current = 0
        isRestoringPositionRef.current = false
      }
      applyLiveTrackerSnapshotRef.current(lessonId, trackerRef.current.getSnapshot())
    },
    []
  )

  // Initialize tracker cleanly when switching to an HTML5 video lesson
  useEffect(() => {
    if (!activeLessonId || !isHtml5Video) {
      return
    }

    const lessonId = activeLessonId
    const targetLesson = lessonsListRef.current.find((l) => l.id === lessonId)
    const isRetry =
      targetLesson?.status !== 'completed' &&
      typeof window !== 'undefined' &&
      localStorage.getItem(`lesson_retry_required:${lessonId}`) === 'true'
    const cachedState = savedLessonStateRef.current[lessonId]
    const isLessonDone = Boolean(targetLesson?.status === 'completed' || cachedState?.isCompleted)
    const savedPos = isRetry
      ? 0
      : cachedState
      ? cachedState.lastPositionSeconds
      : targetLesson?.lastPositionSeconds || 0
    const savedPct = isRetry
      ? 0
      : isLessonDone
      ? 100
      : Math.max(targetLesson?.progressPercent || 0, cachedState?.progressPercent || 0)
    const savedFurthest = isRetry ? 0 : cachedState?.furthestWatchedTime

    const { restorePosition } = trackerRef.current.initializeForLesson({
      lessonId,
      duration: targetLesson?.durationSeconds || 0,
      savedPositionSeconds: savedPos,
      savedProgressPercent: savedPct,
      isCompleted: isLessonDone,
      savedFurthestSeconds: savedFurthest,
    })
    const initialSnap = trackerRef.current.getSnapshot()
    playerLessonIdRef.current = lessonId
    pendingPlayRef.current = false
    isRestoringPositionRef.current = restorePosition > 0
    pendingRestoreSecondsRef.current = restorePosition
    lastSavedKeyRef.current = ''
    lastSaveTimeRef.current = 0
    if (restorePosition > 0) {
      trackerRef.current.beginAuthorizedSeek(restorePosition, Date.now())
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync player UI immediately on lesson change
    setPlayerError(null)
    setIsPlaying(false)
    setVideoCurrentTime(initialSnap.currentTime)
    setVideoDuration(initialSnap.duration)
    setVideoWatchedPercent(initialSnap.videoWatchedPercent)
    setMaxSeekableTime(trackerRef.current.getMaxSeekableTime())

    if (videoRef.current && videoRef.current.readyState >= 1) {
      applyPendingHtml5Restore(videoRef.current, lessonId)
    }
  }, [activeLessonId, isHtml5Video, applyPendingHtml5Restore])

  // Automatically save current playback position when leaving, hiding tab, or unmounting
  useEffect(() => {
    const handleUnloadSave = () => {
      if (activeLessonIdRef.current) {
        saveCurrentPositionRef.current(activeLessonIdRef.current, true)
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && activeLessonIdRef.current) {
        saveCurrentPositionRef.current(activeLessonIdRef.current, true)
      }
    }

    window.addEventListener('beforeunload', handleUnloadSave)
    window.addEventListener('pagehide', handleUnloadSave)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      handleUnloadSave()
      window.removeEventListener('beforeunload', handleUnloadSave)
      window.removeEventListener('pagehide', handleUnloadSave)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Controlled Play/Pause toggle supporting both YouTube Player API and HTML5 video
  const handleTogglePlayPause = useCallback(() => {
    if (isExerciseOpenRef.current || playerErrorRef.current) return

    if (currentYouTubeId) {
      const player = playerRef.current
      if (!player || !ytReadyRef.current || isRestoringPositionRef.current) {
        pendingPlayRef.current = !pendingPlayRef.current
        showToastRef.current('Đang khôi phục vị trí video, sẽ tự động phát ngay khi sẵn sàng...')
        return
      }
      try {
        const state = player.getPlayerState?.()
        if (state === 1) {
          player.pauseVideo?.()
        } else {
          if (state === 0) {
            const wasCompleted =
              trackerRef.current.isVideoCompleted() ||
              Boolean(currentLessonItem?.status === 'completed')

            if (!wasCompleted) {
              trackerRef.current.resetForReplay(Date.now())
              setVideoCurrentTime(0)
              setVideoWatchedPercent(0)
              if (activeLessonIdRef.current) {
                setVideoCompletedByLesson((prev) => ({
                  ...prev,
                  [activeLessonIdRef.current]: false,
                }))
              }
            } else {
              trackerRef.current.beginAuthorizedSeek(0, Date.now())
              setVideoCurrentTime(0)
            }
            player.seekTo?.(0, true)
          }
          player.playVideo?.()
        }
      } catch {
        // ignore
      }
      return
    }

    const vid = videoRef.current
    if (vid) {
      if (vid.paused || vid.ended) {
        if (isRestoringPositionRef.current || pendingRestoreSecondsRef.current > 0) {
          pendingPlayRef.current = true
          if (vid.readyState >= 1 && activeLessonIdRef.current) {
            applyPendingHtml5Restore(vid, activeLessonIdRef.current)
          }
          return
        }
        if (vid.ended) {
          const wasCompleted =
            trackerRef.current.isVideoCompleted() ||
            Boolean(currentLessonItem?.status === 'completed')

          if (!wasCompleted) {
            trackerRef.current.resetForReplay(Date.now())
            setVideoCurrentTime(0)
            setVideoWatchedPercent(0)
            if (activeLessonIdRef.current) {
              setVideoCompletedByLesson((prev) => ({
                ...prev,
                [activeLessonIdRef.current]: false,
              }))
            }
          } else {
            trackerRef.current.beginAuthorizedSeek(0, Date.now())
            setVideoCurrentTime(0)
          }
          vid.currentTime = 0
        }
        vid.playbackRate = 1
        void vid.play().catch(() => {
          showToastRef.current('Trình duyệt không thể tự phát video. Vui lòng thử nhấn Play lại.')
        })
      } else {
        vid.pause()
      }
    }
  }, [currentLessonItem, currentYouTubeId, applyPendingHtml5Restore])

  const seekToScrubberClientX = useCallback(
    (scrubberEl: HTMLDivElement, clientX: number, allowBlockedToast: boolean) => {
      if (isExerciseOpenRef.current || playerErrorRef.current) return
      if (currentYouTubeId && !ytReadyRef.current) return
      const dur = trackerRef.current.getDuration() || videoDuration
      if (dur <= 0) return

      const rect = scrubberEl.getBoundingClientRect()
      if (rect.width <= 0) return

      const clickRatio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      const targetSeconds = Math.round(clickRatio * dur)
      const maxSeekable = trackerRef.current.getMaxSeekableTime()

      if (targetSeconds > maxSeekable + 0.5) {
        if (allowBlockedToast) {
          showToast('Không thể tua vượt quá thời lượng video đã xem.')
        }
        return
      }

      const seekSuccess = trackerRef.current.beginAuthorizedSeek(targetSeconds, Date.now(), true)
      if (!seekSuccess) {
        if (allowBlockedToast) {
          showToast('Không thể tua vượt quá thời lượng video đã xem.')
        }
        return
      }

      pendingRestoreSecondsRef.current = 0
      isRestoringPositionRef.current = false
      const safeTarget = trackerRef.current.getLastValidTime()
      setVideoCurrentTime(safeTarget)

      if (currentYouTubeId) {
        playerRef.current?.seekTo?.(safeTarget, true)
      } else if (videoRef.current) {
        videoRef.current.currentTime = safeTarget
      }

      if (activeLessonIdRef.current) {
        applyLiveTrackerSnapshotRef.current(
          activeLessonIdRef.current,
          trackerRef.current.getSnapshot()
        )
        if (!isPlaying) {
          saveCurrentPositionRef.current(activeLessonIdRef.current, false, true)
        }
      }
    },
    [currentYouTubeId, videoDuration, isPlaying, showToast]
  )

  const handleSeekScrubber = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      seekToScrubberClientX(e.currentTarget, e.clientX, true)
    },
    [seekToScrubberClientX]
  )

  const handleScrubberPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isExerciseOpenRef.current || playerErrorRef.current) return
      isDraggingScrubberRef.current = true
      scrubberBlockedToastShownRef.current = false
      e.currentTarget.setPointerCapture?.(e.pointerId)
      seekToScrubberClientX(e.currentTarget, e.clientX, true)
    },
    [seekToScrubberClientX]
  )

  const handleScrubberPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingScrubberRef.current) return
      const dur = trackerRef.current.getDuration() || videoDuration
      const rect = e.currentTarget.getBoundingClientRect()
      if (dur > 0 && rect.width > 0) {
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
        const target = Math.round(ratio * dur)
        const maxSeekable = trackerRef.current.getMaxSeekableTime()
        if (target > maxSeekable + 0.5) {
          if (!scrubberBlockedToastShownRef.current) {
            scrubberBlockedToastShownRef.current = true
            showToast('Không thể tua vượt quá thời lượng video đã xem.')
          }
          return
        }
      }
      seekToScrubberClientX(e.currentTarget, e.clientX, false)
    },
    [seekToScrubberClientX, videoDuration, showToast]
  )

  const handleScrubberPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingScrubberRef.current) return
      isDraggingScrubberRef.current = false
      scrubberBlockedToastShownRef.current = false
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture?.(e.pointerId)
      }
      if (activeLessonIdRef.current) {
        saveCurrentPositionRef.current(activeLessonIdRef.current, false, true)
      }
    },
    []
  )

  const handleTogglePlayPauseRef = useRef(handleTogglePlayPause)
  useEffect(() => {
    handleTogglePlayPauseRef.current = handleTogglePlayPause
  }, [handleTogglePlayPause])

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMutedRef.current
    setIsMuted(nextMuted)
    if (playerRef.current && ytReadyRef.current) {
      try {
        if (nextMuted) {
          playerRef.current.mute?.()
        } else {
          playerRef.current.unMute?.()
        }
      } catch {
        // ignore
      }
    }
    if (videoRef.current) {
      videoRef.current.muted = nextMuted
    }
  }, [])

  const handleToggleFullscreen = useCallback(() => {
    const container = videoContainerRef.current
    if (!container) return
    if (document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => {})
    } else if (container.requestFullscreen) {
      void container.requestFullscreen().catch(() => {
        showToastRef.current('Trình duyệt không hỗ trợ chế độ toàn màn hình tại đây.')
      })
    }
  }, [])

  // Prevent keyboard shortcuts from seeking, fast-forwarding, or changing speed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isExerciseOpenRef.current || playerErrorRef.current) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      const key = e.key

      if (
        key === 'ArrowLeft' ||
        key === 'j' ||
        key === 'J' ||
        key === 'MediaRewind' ||
        key === 'Home' ||
        key === '0'
      ) {
        e.preventDefault()
        e.stopPropagation()
        const target =
          key === 'Home' || key === '0'
            ? 0
            : Math.max(0, videoCurrentTimeRef.current - (key === 'j' || key === 'J' ? 10 : 5))
        if (!trackerRef.current.beginAuthorizedSeek(target, Date.now(), true)) {
          return
        }
        pendingRestoreSecondsRef.current = 0
        isRestoringPositionRef.current = false
        const safeTarget = trackerRef.current.getLastValidTime()
        setVideoCurrentTime(safeTarget)
        if (currentYouTubeIdRef.current) {
          playerRef.current?.seekTo?.(safeTarget, true)
        } else if (videoRef.current) {
          videoRef.current.currentTime = safeTarget
        }
        if (activeLessonIdRef.current) {
          applyLiveTrackerSnapshotRef.current(
            activeLessonIdRef.current,
            trackerRef.current.getSnapshot()
          )
        }
        return
      }

      if (
        key === 'ArrowRight' ||
        key === 'l' ||
        key === 'L' ||
        key === 'MediaFastForward' ||
        key === 'End'
      ) {
        e.preventDefault()
        e.stopPropagation()
        const dur = trackerRef.current.getDuration() || videoDurationRef.current
        const maxSeekable = trackerRef.current.getMaxSeekableTime()
        const target =
          key === 'End'
            ? dur
            : videoCurrentTimeRef.current + (key === 'l' || key === 'L' ? 10 : 5)

        if (target > maxSeekable + 0.5 || !trackerRef.current.beginAuthorizedSeek(target, Date.now(), true)) {
          showToastRef.current('Không thể tua vượt quá thời lượng video đã xem.')
          return
        }

        pendingRestoreSecondsRef.current = 0
        isRestoringPositionRef.current = false
        const safeTarget = trackerRef.current.getLastValidTime()
        setVideoCurrentTime(safeTarget)
        if (currentYouTubeIdRef.current) {
          playerRef.current?.seekTo?.(safeTarget, true)
        } else if (videoRef.current) {
          videoRef.current.currentTime = safeTarget
        }
        if (activeLessonIdRef.current) {
          applyLiveTrackerSnapshotRef.current(
            activeLessonIdRef.current,
            trackerRef.current.getSnapshot()
          )
        }
        return
      }

      const blockedSpeedKeys = new Set([
        '<',
        '>',
        ',',
        '.',
        'MediaTrackNext',
        'MediaTrackPrevious',
      ])

      if (blockedSpeedKeys.has(key)) {
        e.preventDefault()
        e.stopPropagation()
        showToastRef.current('Không thể thay đổi tốc độ video.')
        return
      }

      if (key === ' ' || key === 'k' || key === 'K') {
        if (
          key === ' ' &&
          target &&
          (target.tagName === 'BUTTON' || target.tagName === 'A')
        ) {
          return
        }
        e.preventDefault()
        e.stopPropagation()
        handleTogglePlayPauseRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  // Tải quiz thật của bài học đang mở (không kèm đáp án đúng — chấm điểm server-side)
  const [quizStatus, setQuizStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [quizErrorMessage, setQuizErrorMessage] = useState('')
  const quizStatusRef = useRef<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const quizErrorRef = useRef('')
  useEffect(() => {
    quizStatusRef.current = quizStatus
  }, [quizStatus])
  useEffect(() => {
    quizErrorRef.current = quizErrorMessage
  }, [quizErrorMessage])

  useEffect(() => {
    if (!activeLessonId || !accessToken) return
    let cancelled = false
    setQuizStatus('loading')
    setQuizErrorMessage('')
    setLessonQuiz(null)
    lessonApi
      .getQuiz(activeLessonId, accessToken, async () => (await refreshSession()).accessToken)
      .then((quiz) => {
        if (cancelled) return
        if (quiz && quiz.questions.length > 0) {
          setLessonQuiz(quiz)
          setQuizStatus('ready')
        } else {
          setQuizStatus('missing')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQuizStatus('error')
          setQuizErrorMessage(err instanceof Error ? err.message : 'Không thể tải bài kiểm tra.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeLessonId, accessToken, refreshSession])

  // Lesson switching handler — saves active lesson position BEFORE switching ID
  // (force=true so the position is persisted even if the 5s throttle/dedupe would skip it)
  const handleSelectLesson = (lesson: StudentLessonItem) => {
    if (lesson.id === activeLessonId) return

    if (activeLessonId) {
      sampleActivePlayerTime(activeLessonId)
      if (playerRef.current && ytReadyRef.current) {
        try {
          playerRef.current.pauseVideo?.()
        } catch {
          // ignore
        }
      } else if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause()
      }
      saveCurrentPosition(activeLessonId, false, true)
    }

    setActiveLessonId(lesson.id)
    setIsPlaying(false)
    setIsExerciseOpen(false)
    setPlayerError(null)

    // Bài đã hoàn thành → bài tập luôn mở lại được (làm lại ôn tập)
    if (lesson.status === 'completed') {
      setUnlockedExerciseMap((prev) => ({ ...prev, [lesson.id]: true }))
    }

    showToast(`Đã chuyển tới ${lesson.title}`)
  }

  /**
   * Nộp quiz trượt (đúng < 60%) → phát lại video từ đầu:
   * - Bài CHƯA hoàn thành: reset tiến độ về 0%, đánh dấu "phải học lại" (lesson_retry_required),
   *   khóa bài tập, xóa cache vị trí phát, phát lại từ 0:00 (kế thừa từ bản merge remote)
   * - Bài ĐÃ hoàn thành: chỉ đóng popup làm lại, giữ nguyên tiến độ 100%
   */
  const handleRetryVideo = (customMessage?: string) => {
    const lessonId = activeLessonId
    const targetLesson = lessonsListRef.current.find((l) => l.id === lessonId)
    const alreadyCompleted = Boolean(targetLesson?.status === 'completed')
    const dur =
      trackerRef.current.getDuration() ||
      targetLesson?.durationSeconds ||
      videoDuration ||
      0

    setIsExerciseOpen(false)

    if (alreadyCompleted) {
      // Làm lại trên bài đã hoàn thành — không reset tiến độ
      setIsExerciseOpen(true)
      showToast(customMessage || 'Bạn có thể làm lại bài kiểm tra ôn tập.')
      return
    }

    // Đánh dấu phải học lại + xóa cache vị trí phát
    try {
      localStorage.setItem(`lesson_retry_required:${lessonId}`, 'true')
    } catch {
      // ignore
    }
    clearPendingPlaybackCache(lessonId)
    savedLessonStateRef.current[lessonId] = {
      lastPositionSeconds: 0,
      furthestWatchedTime: 0,
      progressPercent: 0,
      isCompleted: false,
    }
    pendingRestoreSecondsRef.current = 0
    isRestoringPositionRef.current = false
    lastSavedKeyRef.current = ''
    lastSaveTimeRef.current = 0

    // Reset tracker (chặn tua qua phần chưa xem) & UI
    trackerRef.current.resetForRequiredReplay(Date.now())
    setVideoWatchedPercent(0)
    setVideoCurrentTime(0)
    setMaxSeekableTime(0)
    setVideoCompletedByLesson((prev) => ({ ...prev, [lessonId]: false }))
    setUnlockedExerciseMap((prev) => ({ ...prev, [lessonId]: false }))

    // Sidebar: tiến độ bài này về 0%
    setLessonsList((prev) =>
      prev.map((item) =>
        item.id === lessonId
          ? { ...item, status: 'not_started', progressPercent: 0, lastPositionSeconds: 0 }
          : item
      )
    )

    // Lưu tiến độ reset lên backend
    void handleUpdateProgress(lessonId, 0, 0, false, dur > 0 ? dur : undefined, false, true)

    // Phát lại từ đầu
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.playbackRate = 1
      void videoRef.current.play().catch(() => {})
    } else if (playerRef.current && ytReadyRef.current) {
      try {
        playerRef.current.seekTo?.(0, true)
        playerRef.current.playVideo?.()
      } catch {
        // ignore
      }
    }

    showToast(customMessage || 'Video phát lại từ đầu để bạn ôn tập và làm lại bài kiểm tra.')
  }

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const newComment = {
      id: `c-${Date.now()}`,
      author: user?.fullName || 'Học viên',
      role: 'Học viên',
      content: commentText.trim(),
      time: 'Vừa xong',
    }
    setComments((prev) => [...prev, newComment])
    setCommentText('')
    showToast('Đã gửi câu hỏi thảo luận tới giảng viên!')
  }

  const actualTotalLessons = lessonsList.length > 0 ? lessonsList.length : course?.totalLessons || 0
  const completedLessonsCount = lessonsList.filter((l) => l.status === 'completed').length
  const overallProgressPercent =
    actualTotalLessons > 0 ? Math.round((completedLessonsCount / actualTotalLessons) * 100) : 0

  const instructorName = course?.instructor || 'Đang cập nhật'
  const instructorAvatar = course?.instructorAvatarUrl || course?.thumbnailUrl || null
  const courseTitle = course?.title || 'Đang cập nhật'

  // Loading state
  if (loading) {
    return (
      <div className="student-detail-page">
        <StudentHeader student={headerStudent} />
        <main className="student-detail-content flex flex-col items-center justify-center py-28 text-center">
          <LoaderCircle size={36} className="animate-spin text-brand-600 mb-4" />
          <h2 className="text-sm font-bold text-ink-900 mb-1">
            Đang tải bài giảng và tài liệu học tập...
          </h2>
          <p className="text-xs text-ink-500">Vui lòng chờ trong giây lát.</p>
        </main>
      </div>
    )
  }

  // Error state
  if (error) {
    const isUnauthorized =
      error.toLowerCase().includes('chưa đăng ký') ||
      error.toLowerCase().includes('thanh toán') ||
      error.includes('403')
    return (
      <div className="student-detail-page">
        <StudentHeader student={headerStudent} />
        <main className="student-detail-content max-w-xl mx-auto py-20 text-center">
          <div className="p-8 bg-white rounded-2xl border border-rose-200 shadow-sm">
            <h2 className="text-base font-bold text-ink-900 mb-2">Không thể truy cập bài học</h2>
            <p className="text-xs text-rose-600 mb-6 leading-relaxed">{error}</p>
            <div className="flex justify-center gap-3">
              <a
                href={isUnauthorized ? '/courses' : '/student/courses'}
                className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition-colors"
              >
                {isUnauthorized ? 'Xem danh sách khóa học' : 'Quay lại Khóa Học Của Tôi'}
              </a>
              {!isUnauthorized && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2.5 border border-gray-300 bg-white rounded-xl text-xs font-bold text-ink-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Thử lại
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="student-detail-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-brand-600 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Student Navigation Header */}
      <StudentHeader student={headerStudent} />

      {/* Main Container */}
      <main className="student-detail-content">
        {/* Breadcrumb & Back Link Row */}
        <div className="student-breadcrumb-row">
          <nav aria-label="Breadcrumb" className="student-breadcrumbs">
            <a href="/student/courses" className="student-breadcrumb-link">
              🎓 Khóa Học Của Tôi
            </a>
            <span className="student-breadcrumb-separator">›</span>
            <a href="/student/courses" className="student-breadcrumb-link">
              {courseTitle}
            </a>
            {currentLessonItem && (
              <>
                <span className="student-breadcrumb-separator">›</span>
                <span className="student-breadcrumb-current">{currentLessonItem.title}</span>
              </>
            )}
          </nav>

          <a href="/student/courses" className="student-back-link">
            <ArrowLeft size={14} />
            <span>Quay lại Khóa Học Của Tôi</span>
          </a>
        </div>

        {/* Course Header Banner & Progress Card */}
        <section className="course-detail-header-card" aria-label="Thông tin khóa học">
          <div className="course-detail-title-group">
            <h1 className="course-main-title">{courseTitle}</h1>
            <div className="course-meta-row">
              <div className="course-meta-item">
                <User size={14} className="text-brand-600" />
                <span>
                  Giảng viên: <strong>{instructorName}</strong>
                </span>
              </div>
              <div className="course-meta-item">
                <BookOpen size={14} className="text-brand-600" />
                <span>{actualTotalLessons} Bài Học chuẩn hóa</span>
              </div>
            </div>
          </div>

          {/* Right Progress Card */}
          <div className="course-overall-progress-card">
            <div className="overall-progress-top-row">
              <span className="overall-progress-label">Tiến độ tổng thể</span>
              <span className="overall-progress-percent">
                {completedLessonsCount}/{actualTotalLessons} bài ({overallProgressPercent}%)
              </span>
            </div>
            <div className="overall-progress-track">
              <div
                className="overall-progress-fill"
                style={{ width: `${overallProgressPercent}%` }}
              />
            </div>
            <div className="overall-progress-bottom-meta">
              <span className="meta-completed-lessons">
                {completedLessonsCount} bài đã hoàn thành
              </span>
              <span className="meta-current-step">
                {currentLessonItem
                  ? `Bài ${currentLessonItem.lessonNumber}: ${currentLessonItem.title}`
                  : 'Đang học'}
              </span>
            </div>
          </div>
        </section>

        {/* Two-column Main Grid */}
        <div className="student-detail-grid">
          {/* Left Column (Video Player + Tabs) */}
          <div className="learning-main-column">
            {/* Section A: Video Player Frame */}
            <section aria-label="Khu vực xem bài giảng">
              <div
                ref={videoContainerRef}
                className={`video-player-container ${!isControlsVisible && isPlaying ? 'controls-hidden' : ''}`}
                onMouseMove={resetControlsTimeout}
                onMouseEnter={resetControlsTimeout}
                onTouchStart={resetControlsTimeout}
                onMouseLeave={() => {
                  if (isPlaying) {
                    setIsControlsVisible(false)
                  }
                }}
              >
                {/* Video screen surface */}
                <div className="video-screen-content">
                  {playerError ? (
                    <div className="h-full w-full rounded-2xl bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
                      <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                        <AlertTriangle size={24} />
                      </div>
                      <h3 className="text-sm font-bold mb-1">Không thể phát video bài học</h3>
                      <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                        {playerError}
                      </p>
                      {currentLessonItem?.videoUrl && (
                        <a
                          href={currentLessonItem.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors"
                        >
                          Mở video trên tab mới ↗
                        </a>
                      )}
                    </div>
                  ) : currentYouTubeId ? (
                    <div ref={ytHostRef} className="h-full w-full" />
                  ) : driveEmbedUrl && currentLessonItem?.videoUrl ? (
                    <iframe
                      key={`drive-${currentLessonItem.id}`}
                      src={driveEmbedUrl}
                      title={currentLessonItem.title || 'Video bài giảng'}
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      className="h-full w-full rounded-2xl border-0"
                    />
                  ) : isHtml5Video && currentLessonItem?.videoUrl ? (
                    <video
                      key={currentLessonItem.id}
                      ref={videoRef}
                      src={currentLessonItem.videoUrl}
                      controls={false}
                      controlsList="nodownload noplaybackrate"
                      disablePictureInPicture
                      playsInline
                      muted={isMuted}
                      onContextMenu={(e) => e.preventDefault()}
                      className="h-full w-full rounded-2xl object-contain bg-black"
                      onLoadedMetadata={(e) => {
                        const target = e.currentTarget
                        target.playbackRate = 1
                        target.muted = isMutedRef.current
                        applyPendingHtml5Restore(target, currentLessonItem.id)
                      }}
                      onLoadedData={(e) => {
                        if (pendingRestoreSecondsRef.current > 0) {
                          applyPendingHtml5Restore(e.currentTarget, currentLessonItem.id)
                        }
                      }}
                      onCanPlay={(e) => {
                        if (pendingRestoreSecondsRef.current > 0) {
                          applyPendingHtml5Restore(e.currentTarget, currentLessonItem.id)
                        }
                      }}
                      onSeeked={(e) => {
                        const target = e.currentTarget
                        if (
                          pendingRestoreSecondsRef.current > 0 &&
                          Math.abs(target.currentTime - pendingRestoreSecondsRef.current) <= 1.5
                        ) {
                          pendingRestoreSecondsRef.current = 0
                          isRestoringPositionRef.current = false
                          trackerRef.current.onTimeSample(
                            target.currentTime,
                            Date.now(),
                            target.playbackRate
                          )
                          applyLiveTrackerSnapshot(
                            currentLessonItem.id,
                            trackerRef.current.getSnapshot()
                          )
                          if (pendingPlayRef.current) {
                            pendingPlayRef.current = false
                            target.playbackRate = 1
                            void target.play().catch(() => {})
                          }
                        }
                      }}
                      onSeeking={(e) => {
                        const target = e.currentTarget
                        const check = trackerRef.current.onSeeking(target.currentTime, Date.now())
                        if (!check.allowed) {
                          target.currentTime = check.revertToSeconds
                          showToast('Không thể tua nhanh hoặc kéo thanh thời gian video.')
                        }
                      }}
                      onRateChange={(e) => {
                        if (Math.abs(e.currentTarget.playbackRate - 1) > 0.05) {
                          e.currentTarget.playbackRate = 1
                          showToast('Tốc độ phát được cố định ở 1.0x.')
                        }
                      }}
                      onPlay={(e) => {
                        const target = e.currentTarget
                        if (
                          isRestoringPositionRef.current ||
                          (pendingRestoreSecondsRef.current > 0 &&
                            Math.abs(target.currentTime - pendingRestoreSecondsRef.current) > 1.5)
                        ) {
                          target.pause()
                          pendingPlayRef.current = true
                          applyPendingHtml5Restore(target, currentLessonItem.id)
                          return
                        }
                        if (Math.abs(target.playbackRate - 1) > 0.05) {
                          target.playbackRate = 1
                        }
                        trackerRef.current.onPlay(Date.now())
                        setIsPlaying(true)
                      }}
                      onWaiting={() => {
                        trackerRef.current.onPauseOrBuffer()
                      }}
                      onStalled={() => {
                        trackerRef.current.onPauseOrBuffer()
                      }}
                      onPause={(e) => {
                        const target = e.currentTarget
                        if (
                          !isRestoringPositionRef.current &&
                          pendingRestoreSecondsRef.current === 0 &&
                          !target.ended &&
                          Number.isFinite(target.currentTime) &&
                          target.currentTime >= 0
                        ) {
                          trackerRef.current.onTimeSample(
                            target.currentTime,
                            Date.now(),
                            target.playbackRate || 1
                          )
                        }
                        trackerRef.current.onPauseOrBuffer()
                        setIsPlaying(false)
                        applyLiveTrackerSnapshot(
                          currentLessonItem.id,
                          trackerRef.current.getSnapshot()
                        )
                        if (!target.ended) {
                          saveCurrentPosition(currentLessonItem.id, false, true)
                        }
                      }}
                      onTimeUpdate={(e) => {
                        const target = e.currentTarget
                        if (
                          pendingRestoreSecondsRef.current > 0 &&
                          Math.abs(target.currentTime - pendingRestoreSecondsRef.current) > 1.5
                        ) {
                          applyPendingHtml5Restore(target, currentLessonItem.id)
                          return
                        }
                        if (Math.abs(target.playbackRate - 1) > 0.05) {
                          target.playbackRate = 1
                        }
                        const tick = trackerRef.current.onTimeSample(
                          target.currentTime,
                          Date.now(),
                          target.playbackRate
                        )
                        if (tick.seekBlocked) {
                          target.currentTime = tick.revertToSeconds
                          showToast('Không thể tua nhanh hoặc kéo thanh thời gian video.')
                        }
                        applyLiveTrackerSnapshot(
                          currentLessonItem.id,
                          trackerRef.current.getSnapshot()
                        )

                        const now = Date.now()
                        if (now - lastSaveTimeRef.current >= 5000) {
                          lastSaveTimeRef.current = now
                          saveCurrentPosition(currentLessonItem.id, false)
                        }
                      }}
                      onEnded={(e) => {
                        const dur =
                          e.currentTarget.duration || trackerRef.current.getDuration() || 0
                        handlePlayerEnded(currentLessonItem.id, dur)
                      }}
                      onError={() => {
                        setIsPlaying(false)
                        setPlayerError('Không thể phát tệp video bài giảng này.')
                      }}
                    />
                  ) : (
                    <>
                      {instructorAvatar && (
                        <img
                          src={instructorAvatar}
                          alt=""
                          className="video-bg-img"
                        />
                      )}
                      <div className="video-overlay-gradient" />
                      <div className="mock-board-container flex flex-col items-center justify-center p-6 text-center">
                        <div className="board-title mb-2">
                          {currentLessonItem ? currentLessonItem.title : 'Chưa có bài giảng'}
                        </div>
                        <p className="text-xs text-white/80">
                          {currentLessonItem
                            ? 'Bài giảng này chưa có liên kết video từ giảng viên.'
                            : 'Khóa học hiện chưa có bài giảng nào.'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Interaction shield blocks native iframe seeking, context menu, and double-tap skips */}
                {(currentYouTubeId || isHtml5Video) && !playerError && !isExerciseOpen && (
                  <div
                    className="video-interaction-shield"
                    onClick={() => {
                      resetControlsTimeout()
                      handleTogglePlayPause()
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    aria-hidden="true"
                  />
                )}

                {/* Top Video Overlay Bar */}
                {currentLessonItem && (
                  <div className="video-top-overlay">
                    <div className="video-lesson-badge">
                      <span className="lesson-chip-red">Bài {currentLessonItem.lessonNumber}</span>
                      <span>{currentLessonItem.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentLessonItem.status === 'completed' ? (
                        <button
                          type="button"
                          onClick={() => setIsExerciseOpen(true)}
                          className="flex items-center gap-1 rounded-full bg-emerald-500/90 hover:bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm cursor-pointer transition-colors"
                          title="Làm lại bài tập"
                        >
                          <Check size={13} /> Đã hoàn thành 100% • Làm lại bài tập
                        </button>
                      ) : isCurrentLessonVideoCompleted || unlockedExerciseMap[currentLessonItem.id] ? (
                        <button
                          type="button"
                          onClick={() => setIsExerciseOpen(true)}
                          className="flex items-center gap-1 rounded-full bg-amber-500/90 hover:bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm cursor-pointer transition-colors"
                          title="Mở bài tập để làm tiếp"
                        >
                          📝 Làm bài tập{lessonQuiz ? ` (${lessonQuiz.questions.length} câu)` : ''}
                        </button>
                      ) : (
                        <span
                          className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white/85"
                          title="Bài kiểm tra chỉ tự động mở khi bạn xem hết video"
                        >
                          <span>🔒</span> Xem hết video để tự động mở bài tập ({videoWatchedPercent}%)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Center Big Play Button when paused (for both YouTube and HTML5) */}
                {(currentYouTubeId || isHtml5Video) &&
                  !isPlaying &&
                  !playerError &&
                  !isExerciseOpen && (
                    <button
                      type="button"
                      className="video-center-play-btn"
                      onClick={() => {
                        resetControlsTimeout()
                        handleTogglePlayPause()
                      }}
                      title="Phát video"
                      aria-label="Phát video"
                    >
                      <Play size={28} className="ml-1" />
                    </button>
                  )}

                {/* Bottom Controls Bar */}
                {(currentYouTubeId || isHtml5Video) && !playerError && (
                  <div
                    className={`video-bottom-controls ${
                      !isControlsVisible && isPlaying ? 'video-controls-hidden' : ''
                    }`}
                  >
                    {/* Interactive Scrubber Bar */}
                    <div
                      className="video-progress-scrubber"
                      onClick={handleSeekScrubber}
                      onPointerDown={handleScrubberPointerDown}
                      onPointerMove={handleScrubberPointerMove}
                      onPointerUp={handleScrubberPointerUp}
                      onPointerCancel={handleScrubberPointerUp}
                      role="slider"
                      tabIndex={0}
                      aria-label="Tiến độ video"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={
                        videoDuration > 0
                          ? Math.round((videoCurrentTime / videoDuration) * 100)
                          : 0
                      }
                    >
                      <div
                        className="scrubber-watched-track"
                        style={{
                          width: `${
                            videoDuration > 0
                              ? Math.min(
                                  100,
                                  (maxSeekableTime / videoDuration) * 100
                                )
                              : 0
                          }%`,
                        }}
                      />
                      <div
                        className="scrubber-fill"
                        style={{
                          width: `${
                            videoDuration > 0
                              ? Math.min(100, (videoCurrentTime / videoDuration) * 100)
                              : 0
                          }%`,
                        }}
                      >
                        <span className="scrubber-thumb" />
                      </div>
                    </div>

                    <div className="video-controls-row">
                      <div className="video-controls-left">
                        <button
                          type="button"
                          className="control-icon-btn"
                          onClick={() => {
                            resetControlsTimeout()
                            handleTogglePlayPause()
                          }}
                          aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                        >
                          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                        </button>

                        <button
                          type="button"
                          className="control-icon-btn"
                          onClick={() => {
                            resetControlsTimeout()
                            handleToggleMute()
                          }}
                          aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                        >
                          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>

                        <span className="video-timestamp">
                          {formatPlaybackTime(videoCurrentTime)} /{' '}
                          {videoDuration > 0
                            ? formatPlaybackTime(videoDuration)
                            : currentLessonItem?.duration &&
                              currentLessonItem.duration !== 'Chưa cập nhật'
                            ? currentLessonItem.duration
                            : '--:--'}
                        </span>
                      </div>

                      <div className="video-controls-right">
                        {/* Video Drive nhúng không có sự kiện kết thúc → nút mở quiz thủ công */}
                        {driveEmbedUrl &&
                          !currentYouTubeId &&
                          !isHtml5Video &&
                          quizStatus === 'ready' && (
                            <button
                              type="button"
                              className="control-icon-btn"
                              onClick={() => {
                                resetControlsTimeout()
                                setIsExerciseOpen(true)
                              }}
                              title="Làm bài tập trắc nghiệm"
                              aria-label="Làm bài tập trắc nghiệm"
                            >
                              <FileText size={18} />
                            </button>
                          )}
                        <button
                          type="button"
                          className="control-icon-btn"
                          onClick={() => {
                            resetControlsTimeout()
                            handleToggleFullscreen()
                          }}
                          aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                        >
                          {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Exercise Popup Overlay over video container — thẻ nhỏ căn giữa */}
                {isExerciseOpen && !lessonQuiz && quizStatus === 'loading' && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink-900/70 backdrop-blur-sm">
                    <div className="flex items-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-ink-700 shadow-2xl">
                      <LoaderCircle size={16} className="animate-spin" />
                      Đang tải câu hỏi…
                    </div>
                  </div>
                )}
                {isExerciseOpen && lessonQuiz && (
                  <StudentQuizOverlay
                    questions={lessonQuiz.questions}
                    lessonTitle={currentLessonItem?.title ?? ''}
                    onClose={() => setIsExerciseOpen(false)}
                    onSubmit={async (answers) => {
                      const result = await lessonApi.submitQuiz(
                        activeLessonId,
                        answers,
                        accessToken,
                        async () => (await refreshSession()).accessToken,
                      )
                      // Lưu kết quả lần làm gần nhất — sidebar hiển thị điểm này
                      const latestResult: LatestExerciseResult = {
                        scorePercent: result.score_percent,
                        passed: result.passed,
                      }
                      writeLatestExerciseResult(activeLessonId, latestResult)
                      setLatestExerciseResultMap((prev) => ({
                        ...prev,
                        [activeLessonId]: latestResult,
                      }))
                      return result
                    }}
                    onPassed={() => {
                      const completedLessonId = currentLessonItem?.id
                      const dur =
                        trackerRef.current.getDuration() ||
                        currentLessonItem?.durationSeconds ||
                        videoDuration ||
                        0
                      const finalPosition = Math.floor(
                        Math.max(
                          trackerRef.current.getLessonId() === completedLessonId
                            ? trackerRef.current.getLastValidTime()
                            : currentLessonItem?.lastPositionSeconds ?? 0,
                          dur
                        )
                      )
                      if (completedLessonId) {
                        if (trackerRef.current.getLessonId() === completedLessonId) {
                          trackerRef.current.markLessonCompleted()
                        }
                        setIsExerciseOpen(false)
                        setVideoCompletedByLesson((prev) => ({ ...prev, [completedLessonId]: true }))
                        setVideoWatchedPercent(100)
                        setLessonsList((prev) =>
                          prev.map((item) =>
                            item.id === completedLessonId
                              ? { ...item, status: 'completed', progressPercent: 100, lastPositionSeconds: finalPosition }
                              : item,
                          ),
                        )
                        void handleUpdateProgress(
                          completedLessonId,
                          finalPosition,
                          100,
                          true,
                          dur > 0 ? dur : undefined,
                          false,
                        )
                        showToast('🎉 Chính xác! Bạn đã hoàn thành bài học.')
                      }
                    }}
                    onFailed={(message) => handleRetryVideo(message)}
                  />
                )}
              </div>

            </section>

            {/* Section C: Tabbed Content & Objectives */}
            <section className="course-tabs-section" aria-label="Nội dung bổ trợ bài học">
              <div className="course-tabs-header" role="tablist">
                <button
                  type="button"
                  className={`course-tab-btn ${activeTab === 'objectives' ? 'active' : ''}`}
                  onClick={() => setActiveTab('objectives')}
                  role="tab"
                  aria-selected={activeTab === 'objectives'}
                >
                  <span>🎯 Mục Tiêu Bài Học & Ghi Chú</span>
                </button>

                <button
                  type="button"
                  className={`course-tab-btn ${activeTab === 'attachments' ? 'active' : ''}`}
                  onClick={() => setActiveTab('attachments')}
                  role="tab"
                  aria-selected={activeTab === 'attachments'}
                >
                  <span>📁 Tài Liệu Đính Kèm (PDF, Audio MP3)</span>
                  <span className="tab-count-badge">
                    {currentLessonItem?.materials?.length || 0}
                  </span>
                </button>
              </div>

              <div className="course-tab-body">
                {activeTab === 'objectives' && (
                  <div className="flex flex-col gap-3">
                    <h3 className="tab-lead-heading">
                      Mục tiêu trọng tâm: {currentLessonItem ? currentLessonItem.title : courseTitle}
                    </h3>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm text-ink-700 leading-relaxed whitespace-pre-line">
                      {currentLessonItem?.description ? (
                        currentLessonItem.description
                      ) : (
                        <span className="text-xs text-ink-400 italic">
                          Chưa có ghi chú hoặc mục tiêu bài học cho bài giảng này.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'attachments' && (
                  <div className="flex flex-col gap-3">
                    {currentLessonItem?.materials && currentLessonItem.materials.length > 0 ? (
                      currentLessonItem.materials.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-600">
                              {file.file_type.toLowerCase().includes('pdf') ? (
                                <FileText size={18} />
                              ) : file.file_type.toLowerCase().includes('mp3') ? (
                                <FileAudio size={18} />
                              ) : (
                                <Download size={18} />
                              )}
                            </span>
                            <span>
                              <strong className="block text-xs text-ink-900">{file.name}</strong>
                              <small className="text-ink-500">
                                Định dạng {file.file_type.toUpperCase()}
                              </small>
                            </span>
                          </div>
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-ink-700 hover:text-brand-600 transition-colors"
                          >
                            <Download size={13} /> Tải về
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-xs text-ink-500 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                        Bài giảng này chưa có tài liệu đính kèm từ giảng viên.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'discussion' && (
                  <div className="flex flex-col gap-4">
                    {comments.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {comments.map((comment) => (
                          <article key={comment.id} className="rounded-xl border border-gray-100 p-4">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <strong className="text-xs text-ink-900">
                                {comment.author}{' '}
                                <span className="font-normal text-ink-500">· {comment.role}</span>
                              </strong>
                              <span className="text-[11px] text-ink-500">{comment.time}</span>
                            </div>
                            <p className="text-sm text-ink-700">{comment.content}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-ink-500 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                        Chưa có câu hỏi hoặc thảo luận nào cho bài giảng này.
                      </div>
                    )}
                    <form onSubmit={handleAddComment} className="flex flex-col gap-2">
                      <label htmlFor="course-comment" className="text-xs font-bold text-ink-700">
                        Đặt câu hỏi hoặc chia sẻ
                      </label>
                      <textarea
                        id="course-comment"
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 p-3 text-sm"
                        placeholder="Viết bình luận của bạn..."
                      />
                      <button type="submit" className="btn-submit-quiz self-end">
                        Gửi bình luận
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column (Curriculum Sidebar - "Danh Sách Bài Học") */}
          <aside className="curriculum-sidebar-card">
            <div className="curriculum-header-row">
              <h2 className="curriculum-title-text">
                <BookOpen size={18} className="text-brand-600" />
                <span>Danh Sách Bài Học</span>
              </h2>
              <span className="curriculum-total-chip">{actualTotalLessons} bài</span>
            </div>

            {/* Note banner */}
            <div className="curriculum-notice-banner">
              <span className="text-sm">💡</span>
              <span>
                Học viên có thể tự do mở bất kỳ bài học nào để học tập theo lộ trình cá nhân.
              </span>
            </div>

            {/* Lessons List Stack */}
            <div className="curriculum-lessons-stack">
              {lessonsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-500">
                  Khóa học hiện chưa có bài giảng nào được công bố.
                </div>
              ) : (
                lessonsList.map((lesson) => {
                  const isSelected = lesson.id === activeLessonId
                  const isCompleted = lesson.status === 'completed'
                  const sidebarInfo = formatSidebarLessonInfo(
                    lesson,
                    latestExerciseResultMap[lesson.id]
                  )

                  return (
                    <div
                      key={lesson.id}
                      className={`curriculum-lesson-item ${
                        isSelected ? 'active' : isCompleted ? 'completed' : ''
                      }`}
                      onClick={() => handleSelectLesson(lesson)}
                    >
                      <div className="lesson-thumbnail">
                        <img
                          src={getLessonThumbnail(
                            lesson,
                            course?.thumbnailUrl || DEFAULT_LESSON_THUMBNAIL
                          )}
                          alt={lesson.title}
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget
                            const fallback = course?.thumbnailUrl || DEFAULT_LESSON_THUMBNAIL
                            if (!target.src.endsWith(fallback)) {
                              target.src = fallback
                            }
                          }}
                        />
                        <span className="lesson-thumbnail-duration">
                          {lesson.duration !== 'Chưa cập nhật' ? lesson.duration : '--:--'}
                        </span>
                        <span className="lesson-thumbnail-play">
                          <Play size={10} fill="currentColor" />
                        </span>
                      </div>
                      <div className="lesson-item-text-group">
                        <h4 className="lesson-item-title">{lesson.title}</h4>
                        <div className="lesson-item-meta">
                          <div className="lesson-meta-line">
                            <span>{sidebarInfo.durationText} · </span>
                            <span
                              className={
                                sidebarInfo.isCompleted
                                  ? 'text-emerald-600 font-semibold'
                                  : 'text-brand-600 font-medium'
                              }
                            >
                              {sidebarInfo.statusText}
                            </span>
                          </div>
                          <div className="lesson-meta-line lesson-meta-secondary">
                            {sidebarInfo.playbackPositionLine}
                          </div>
                          <div className="lesson-meta-line">
                            <span>Bài tập: {sidebarInfo.exerciseScorePercent}% · </span>
                            <span
                              className={
                                sidebarInfo.exercisePassed
                                  ? 'text-emerald-600 font-semibold'
                                  : 'text-ink-500 font-medium'
                              }
                            >
                              {sidebarInfo.exerciseStatusText}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default StudentCourseDetailPage
