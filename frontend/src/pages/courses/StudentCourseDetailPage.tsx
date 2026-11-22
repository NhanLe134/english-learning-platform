import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Clock,
  User,
  BookOpen,
  ArrowLeft,
  Check,
  LoaderCircle,
  FileText,
  FileAudio,
  Download,
  X,
  AlertTriangle,
} from 'lucide-react'
import { StudentHeader } from './components/StudentHeader'
import type { StudentProfile } from './student-courses-data'
import { useAuth } from '../auth/auth-context'
import { courseCatalogApi } from './services/courseCatalogApi'
import type { CourseReference } from './course-data'
import {
  lessonApi,
  extractGoogleDriveEmbedUrl,
  extractYouTubeVideoId,
} from '../them_bai_giang/services/lessonApi'
import type { QuizQuestion } from './student-course-detail-data'
import {
  DEFAULT_LESSON_THUMBNAIL,
  formatLessonDuration,
  formatPlaybackTime,
  getLessonExercise,
  getLessonThumbnail,
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
  const [playerError, setPlayerError] = useState<string | null>(null)

  // Exercise & completion states (kept distinct from last_position_seconds)
  const [videoCompletedByLesson, setVideoCompletedByLesson] = useState<Record<string, boolean>>({})
  const [isExerciseOpen, setIsExerciseOpen] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswersMap, setSelectedAnswersMap] = useState<Record<string, Record<number, string>>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)

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
  const quizSectionRef = useRef<HTMLDivElement | null>(null)

  const trackerRef = useRef<VideoWatchTracker>(new VideoWatchTracker())
  const playerLessonIdRef = useRef<string>('')
  const ytReadyRef = useRef<boolean>(false)
  const pendingPlayRef = useRef<boolean>(false)
  const pendingRestoreSecondsRef = useRef<number>(0)
  const initialStartParamRef = useRef<number>(0)
  const lastSaveTimeRef = useRef<number>(0)
  const lastSavedKeyRef = useRef<string>('')
  const ytTickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // Sync fullscreen change state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleUpdateProgress = useCallback(
    async (
      lessonId: string,
      seconds: number,
      percent?: number,
      completed?: boolean,
      durationSeconds?: number,
      keepalive = false
    ) => {
      const token = accessTokenRef.current
      if (!lessonId || !token) return
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
          },
          token,
          async () => (await refreshSession()).accessToken,
          keepalive
        )

        setLessonsList((prev) =>
          prev.map((item) => {
            if (item.id !== lessonId) return item
            const newCompleted = item.status === 'completed' || res.is_completed
            const newPercent = newCompleted
              ? 100
              : Math.min(99, Math.max(item.progressPercent, res.progress_percent))
            return {
              ...item,
              lastPositionSeconds: res.last_position_seconds,
              progressPercent: newPercent,
              status: newCompleted ? 'completed' : newPercent > 0 ? 'in_progress' : item.status,
            }
          })
        )
      } catch (err) {
        console.error('Không thể cập nhật tiến độ học tập:', err)
      }
    },
    [refreshSession]
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
      if (!force && !tracker.hasPlaybackActivity()) return

      const curTime = Math.max(0, tracker.getLastValidTime())
      const dur = tracker.getDuration()
      const snapshot = tracker.getSnapshot()
      const roundedSeconds = Math.floor(curTime)
      const dedupeKey = `${lessonId}:${roundedSeconds}:${snapshot.lessonProgressPercent}:${snapshot.isLessonCompleted}`

      if (!force && dedupeKey === lastSavedKeyRef.current) return
      lastSavedKeyRef.current = dedupeKey

      // Keep local list synchronized so returning within the same session restores accurately
      setLessonsList((prev) =>
        prev.map((item) => {
          if (item.id !== lessonId) return item
          const isCompleted = item.status === 'completed' || snapshot.isLessonCompleted
          const nextPercent = isCompleted
            ? 100
            : Math.min(99, Math.max(item.progressPercent, snapshot.lessonProgressPercent))
          return {
            ...item,
            lastPositionSeconds: roundedSeconds,
            progressPercent: nextPercent,
            status: isCompleted ? 'completed' : nextPercent > 0 ? 'in_progress' : item.status,
          }
        })
      )

      void handleUpdateProgressRef.current(
        lessonId,
        roundedSeconds,
        snapshot.lessonProgressPercent,
        snapshot.isLessonCompleted,
        dur > 0 ? dur : undefined,
        keepalive
      )
    },
    []
  )

  const saveCurrentPositionRef = useRef(saveCurrentPosition)
  useEffect(() => {
    saveCurrentPositionRef.current = saveCurrentPosition
  }, [saveCurrentPosition])

  const applyLiveTrackerSnapshot = useCallback((lessonId: string, snap: TrackerSnapshot) => {
    setVideoCurrentTime(snap.currentTime)
    setVideoWatchedPercent(snap.videoWatchedPercent)
    if (snap.duration > 0) {
      setVideoDuration(snap.duration)
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
      setQuizSubmitted(false)
      setCurrentQuestionIndex(0)
      setIsExerciseOpen(true)
      showToastRef.current(
        alreadyCompleted
          ? 'Video đã kết thúc! Bạn có thể làm lại bài kiểm tra ôn tập.'
          : '🎉 Bạn đã xem hết video! Hãy hoàn thành bài kiểm tra để đạt 100%.'
      )
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
  const driveEmbedUrl = !currentYouTubeId
    ? extractGoogleDriveEmbedUrl(currentLessonItem?.videoUrl)
    : null
  const isHtml5Video = Boolean(currentLessonItem?.videoUrl && !currentYouTubeId && !driveEmbedUrl)

  const currentLessonExercise = currentLessonItem
    ? getLessonExercise(currentLessonItem)
    : {
        title: 'Bài tập thực hành',
        subtitle: 'Kiểm tra kiến thức bài học',
        totalQuestions: 2,
        durationMinutes: 5,
        questions: [] as QuizQuestion[],
      }

  const isCurrentLessonVideoCompleted = Boolean(
    currentLessonItem &&
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
        let numberCounter = 1

        const sortedTopics = [...rawTopics].sort((a, b) => a.sort_order - b.sort_order)
        for (const topic of sortedTopics) {
          const sortedLessons = [...(topic.lessons || [])].sort(
            (a, b) => a.sort_order - b.sort_order
          )
          for (const l of sortedLessons) {
            const isCompleted = Boolean(l.progress?.is_completed)
            const rawPct = Number(l.progress?.progress_percent ?? 0)
            const pct = isCompleted ? 100 : Math.min(99, Math.max(0, rawPct))
            const lastPos = Number(l.progress?.last_position_seconds ?? 0)

            if (isCompleted || pct >= 99) {
              initialVideoCompleted[l.id] = true
            }

            flattened.push({
              id: l.id,
              topicId: topic.id,
              topicTitle: topic.title,
              lessonNumber: numberCounter++,
              title: l.title,
              description: l.description,
              videoUrl: l.video_url,
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

        setVideoCompletedByLesson((prev) => ({ ...initialVideoCompleted, ...prev }))
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
  }, [resolvedCourseSlug, accessToken, refreshSession])

  // Initialize YouTube Player API imperatively into ytHostRef (dependencies strictly limited to activeLessonId & currentYouTubeId)
  useEffect(() => {
    if (!activeLessonId || !currentYouTubeId) {
      return
    }

    let isCancelled = false
    const lessonId = activeLessonId
    const targetLesson = lessonsListRef.current.find((l) => l.id === lessonId)

    const { restorePosition } = trackerRef.current.initializeForLesson({
      lessonId,
      duration: targetLesson?.durationSeconds || 0,
      savedPositionSeconds: targetLesson?.lastPositionSeconds || 0,
      savedProgressPercent: targetLesson?.progressPercent || 0,
      isCompleted: targetLesson?.status === 'completed',
    })

    const initialSnap = trackerRef.current.getSnapshot()
    const startSeconds = Math.floor(restorePosition)
    playerLessonIdRef.current = lessonId
    ytReadyRef.current = false
    pendingPlayRef.current = false
    pendingRestoreSecondsRef.current = restorePosition
    initialStartParamRef.current = startSeconds
    lastSavedKeyRef.current = ''
    lastSaveTimeRef.current = 0

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync player UI immediately on lesson change
    setPlayerError(null)
    setIsPlaying(false)
    setVideoCurrentTime(initialSnap.currentTime)
    setVideoDuration(initialSnap.duration)
    setVideoWatchedPercent(initialSnap.videoWatchedPercent)

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
                if (dur > 0) {
                  const { restorePosition: validatedRestore } = trackerRef.current.setDuration(dur)
                  pendingRestoreSecondsRef.current = validatedRestore
                  applyLiveTrackerSnapshotRef.current(
                    lessonId,
                    trackerRef.current.getSnapshot()
                  )

                  if (validatedRestore === 0 && initialStartParamRef.current > 0) {
                    trackerRef.current.beginAuthorizedSeek(0, Date.now())
                    event.target.seekTo?.(0, true)
                    pendingRestoreSecondsRef.current = 0
                  }
                }

                if (pendingPlayRef.current) {
                  pendingPlayRef.current = false
                  event.target.playVideo?.()
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
                    pendingRestoreSecondsRef.current = validatedRestore
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
                  } else if (
                    pendingRestoreSecondsRef.current === 0 &&
                    initialStartParamRef.current > 0 &&
                    !trackerRef.current.hasPlaybackActivity() &&
                    cur > 2
                  ) {
                    trackerRef.current.beginAuthorizedSeek(0, Date.now())
                    event.target.seekTo?.(0, true)
                  }
                  pendingRestoreSecondsRef.current = 0

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
                trackerRef.current.onPauseOrBuffer()
                setIsPlaying(false)
                saveCurrentPositionRef.current(lessonId, false)
              } else if (state === 3) {
                // Buffering: pause watch interval tracking so buffering never counts as watched
                trackerRef.current.onPauseOrBuffer()
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

  // Initialize tracker cleanly when switching to an HTML5 video lesson
  useEffect(() => {
    if (!activeLessonId || !isHtml5Video) {
      return
    }

    const lessonId = activeLessonId
    const targetLesson = lessonsListRef.current.find((l) => l.id === lessonId)
    trackerRef.current.initializeForLesson({
      lessonId,
      duration: targetLesson?.durationSeconds || 0,
      savedPositionSeconds: targetLesson?.lastPositionSeconds || 0,
      savedProgressPercent: targetLesson?.progressPercent || 0,
      isCompleted: targetLesson?.status === 'completed',
    })
    const initialSnap = trackerRef.current.getSnapshot()
    playerLessonIdRef.current = lessonId
    pendingRestoreSecondsRef.current = initialSnap.currentTime
    lastSavedKeyRef.current = ''
    lastSaveTimeRef.current = 0

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync player UI immediately on lesson change
    setPlayerError(null)
    setIsPlaying(false)
    setVideoCurrentTime(initialSnap.currentTime)
    setVideoDuration(initialSnap.duration)
    setVideoWatchedPercent(initialSnap.videoWatchedPercent)
  }, [activeLessonId, isHtml5Video])

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
      if (!player || !ytReadyRef.current) {
        pendingPlayRef.current = !pendingPlayRef.current
        showToastRef.current('Đang tải video, sẽ tự động phát ngay khi sẵn sàng...')
        return
      }
      try {
        const state = player.getPlayerState?.()
        if (state === 1) {
          player.pauseVideo?.()
        } else {
          if (state === 0) {
            trackerRef.current.resetForReplay(Date.now())
            setVideoCurrentTime(0)
            setVideoWatchedPercent(0)
            if (activeLessonIdRef.current) {
              setVideoCompletedByLesson((prev) => ({
                ...prev,
                [activeLessonIdRef.current]: false,
              }))
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
        if (vid.ended) {
          trackerRef.current.resetForReplay(Date.now())
          setVideoCurrentTime(0)
          setVideoWatchedPercent(0)
          if (activeLessonIdRef.current) {
            setVideoCompletedByLesson((prev) => ({
              ...prev,
              [activeLessonIdRef.current]: false,
            }))
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
  }, [currentYouTubeId])

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
      const blockedSeekOrSpeedKeys = new Set([
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
        'j',
        'J',
        'l',
        'L',
        '<',
        '>',
        ',',
        '.',
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'MediaFastForward',
        'MediaRewind',
        'MediaTrackNext',
        'MediaTrackPrevious',
      ])

      if (blockedSeekOrSpeedKeys.has(key)) {
        e.preventDefault()
        e.stopPropagation()
        showToastRef.current('Không được phép tua nhanh hoặc thay đổi tốc độ video.')
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

  // Lesson switching handler — saves active lesson position BEFORE switching ID
  const handleSelectLesson = (lesson: StudentLessonItem) => {
    if (lesson.id === activeLessonId) return

    if (activeLessonId) {
      saveCurrentPosition(activeLessonId, false)
    }

    setActiveLessonId(lesson.id)
    setIsPlaying(false)
    setIsExerciseOpen(false)
    setQuizSubmitted(false)
    setCurrentQuestionIndex(0)
    setPlayerError(null)
    showToast(`Đã chuyển tới ${lesson.title}`)
  }

  // Audio speech synthesis helper inside quiz questions
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast(`Đang phát âm: "${text}"`)
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  // Quiz state & submission handlers
  const currentQuestion: QuizQuestion =
    currentLessonExercise.questions[currentQuestionIndex] ??
    currentLessonExercise.questions[0] ?? {
      id: 1,
      questionNumberStr: 'CÂU 01',
      questionText: 'Đang tải câu hỏi...',
      audioText: '',
      options: [],
      correctOptionId: 'A',
    }

  const selectedAnswers = selectedAnswersMap[activeLessonId] || {}

  const handleSelectOption = (optionId: string) => {
    setSelectedAnswersMap((prev) => ({
      ...prev,
      [activeLessonId]: {
        ...(prev[activeLessonId] || {}),
        [currentQuestionIndex]: optionId,
      },
    }))
  }

  const handleSubmitQuiz = () => {
    if (!currentLessonItem) return
    const questions = currentLessonExercise.questions
    const total = questions.length
    if (total === 0) return

    const firstUnansweredIdx = questions.findIndex((_, idx) => !selectedAnswers[idx])
    if (firstUnansweredIdx !== -1) {
      setCurrentQuestionIndex(firstUnansweredIdx)
      showToast('Vui lòng chọn đáp án cho tất cả câu hỏi trước khi nộp bài.')
      return
    }

    let correctCount = 0
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctOptionId) {
        correctCount++
      }
    })

    setQuizSubmitted(true)

    if (correctCount < total) {
      // Any wrong answer: immediately close popup, reset tracker, and replay video from start
      handleRetryVideo(
        `Bạn trả lời đúng ${correctCount}/${total} câu hỏi. Vì chọn đáp án chưa chính xác, hệ thống tự động phát lại video từ đầu để bạn ôn tập lại!`
      )
      return
    }

    // All answers correct: auto-close popup, mark 100% + is_completed: true, sync sidebar & backend
    const completedLessonId = currentLessonItem.id
    const dur =
      trackerRef.current.getDuration() ||
      currentLessonItem.durationSeconds ||
      videoDuration ||
      0
    const finalPosition = Math.floor(
      Math.max(
        trackerRef.current.getLessonId() === completedLessonId
          ? trackerRef.current.getLastValidTime()
          : currentLessonItem.lastPositionSeconds,
        dur
      )
    )

    if (trackerRef.current.getLessonId() === completedLessonId) {
      trackerRef.current.markLessonCompleted()
    }

    setQuizSubmitted(false)
    setIsExerciseOpen(false)
    setVideoCompletedByLesson((prev) => ({ ...prev, [completedLessonId]: true }))
    setVideoWatchedPercent(100)

    setLessonsList((prev) =>
      prev.map((item) =>
        item.id === completedLessonId
          ? {
              ...item,
              status: 'completed',
              progressPercent: 100,
              lastPositionSeconds: finalPosition,
            }
          : item
      )
    )

    void handleUpdateProgress(
      completedLessonId,
      finalPosition,
      100,
      true,
      dur > 0 ? dur : undefined,
      false
    )
    showToast('🎉 Chính xác 100%! Bạn đã hoàn thành bài học.')
  }

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
    setQuizSubmitted(false)
    setSelectedAnswersMap((prev) => ({
      ...prev,
      [lessonId]: {},
    }))
    setCurrentQuestionIndex(0)

    trackerRef.current.resetForReplay(Date.now())
    setVideoCompletedByLesson((prev) => ({ ...prev, [lessonId]: false }))
    setVideoWatchedPercent(0)
    setVideoCurrentTime(0)

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

    if (lessonId) {
      setLessonsList((prev) =>
        prev.map((item) =>
          item.id === lessonId
            ? {
                ...item,
                lastPositionSeconds: 0,
                ...(alreadyCompleted ? {} : { progressPercent: 0 }),
              }
            : item
        )
      )
      void handleUpdateProgress(
        lessonId,
        0,
        alreadyCompleted ? 100 : 0,
        alreadyCompleted,
        dur > 0 ? dur : undefined,
        false
      )
    }

    showToast(
      customMessage ||
        'Đang phát lại từ đầu để bạn ôn tập trước khi làm bài kiểm tra.'
    )
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
                        const lessonId = currentLessonItem.id
                        target.playbackRate = 1
                        target.muted = isMutedRef.current
                        const dur = Number.isFinite(target.duration) ? target.duration : 0
                        const { restorePosition } = trackerRef.current.setDuration(dur)

                        if (restorePosition > 0 && dur > restorePosition) {
                          trackerRef.current.beginAuthorizedSeek(restorePosition, Date.now())
                          target.currentTime = restorePosition
                        }
                        applyLiveTrackerSnapshot(lessonId, trackerRef.current.getSnapshot())
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
                        if (Math.abs(e.currentTarget.playbackRate - 1) > 0.05) {
                          e.currentTarget.playbackRate = 1
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
                        trackerRef.current.onPauseOrBuffer()
                        setIsPlaying(false)
                        if (!e.currentTarget.ended) {
                          saveCurrentPosition(currentLessonItem.id, false)
                        }
                      }}
                      onTimeUpdate={(e) => {
                        const target = e.currentTarget
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
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                          <Check size={13} /> Đã hoàn thành 100%
                        </span>
                      ) : isCurrentLessonVideoCompleted ? (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                          Đã xem hết • Hoàn thành bài tập để đạt 100%
                        </span>
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

                {/* Bottom Controls Bar (minimal: Play/Pause, Volume, Time, Fullscreen) */}
                {(currentYouTubeId || isHtml5Video) && !playerError && (
                  <div
                    className={`video-bottom-controls ${
                      !isControlsVisible && isPlaying ? 'video-controls-hidden' : ''
                    }`}
                  >
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

                {/* Exercise Popup Overlay over video container */}
                {isExerciseOpen && (
                  <div
                    ref={quizSectionRef}
                    className="absolute inset-0 z-40 bg-white flex flex-col text-ink-900 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                  >
                    {/* Header popup */}
                    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 bg-gray-50/90 shrink-0 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📝</span>
                        <div>
                          <h3 className="text-sm font-bold text-ink-900 leading-tight">
                            {currentLessonExercise.title}
                          </h3>
                          <p className="text-xs text-ink-500 flex items-center gap-1.5 flex-wrap">
                            <span>{currentLessonExercise.subtitle}</span>
                            <span>•</span>
                            <span>{currentLessonExercise.totalQuestions} câu hỏi</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} />
                              {currentLessonExercise.durationMinutes} phút
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsExerciseOpen(false)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors cursor-pointer"
                        title="Đóng bài kiểm tra"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Quiz Questions Body */}
                    <div className="flex-1 overflow-y-auto p-5">
                      {/* Stepper Header with clickable question bubbles */}
                      <div className="quiz-stepper-row mb-3">
                        <div className="quiz-stepper-left">
                          <span className="quiz-stepper-label">
                            CÂU HỎI {currentQuestion.id} / {currentLessonExercise.totalQuestions}
                          </span>
                          <div className="quiz-bubbles-list">
                            {currentLessonExercise.questions.map((q, idx) => {
                              const isAnswered = Boolean(selectedAnswers[idx])
                              const isActive = idx === currentQuestionIndex
                              return (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() => setCurrentQuestionIndex(idx)}
                                  className={`quiz-bubble ${
                                    isActive ? 'active' : isAnswered ? 'completed' : 'pending'
                                  }`}
                                  aria-label={`Câu ${idx + 1}`}
                                >
                                  {idx + 1}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <span className="quiz-stepper-count">
                          {currentQuestionIndex + 1} / {currentLessonExercise.totalQuestions} câu
                        </span>
                      </div>

                      {/* Question Box */}
                      <div className="quiz-question-box">
                        <span className="question-tag-pill">
                          {currentQuestion.questionNumberStr}
                        </span>
                        <h3 className="question-text-heading">{currentQuestion.questionText}</h3>

                        {/* Audio Listen Box */}
                        {currentQuestion.audioText && (
                          <div className="quiz-audio-pronounce-card">
                            <button
                              type="button"
                              className="audio-icon-circle"
                              onClick={() => speakText(currentQuestion.audioText)}
                              title="Nghe câu hỏi tiếng Anh"
                              aria-label="Nghe câu hỏi"
                            >
                              <Volume2 size={15} />
                            </button>
                            <div className="audio-label-text">
                              <span>Nghe phát âm mẫu: </span>
                              <strong>"{currentQuestion.audioText}"</strong>
                            </div>
                          </div>
                        )}

                        {/* Options List */}
                        <div className="quiz-options-group" role="radiogroup" aria-label="Các đáp án">
                          {currentQuestion.options.map((option) => {
                            const isSelected = selectedAnswers[currentQuestionIndex] === option.id

                            return (
                              <button
                                key={option.id}
                                type="button"
                                className={`quiz-option-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleSelectOption(option.id)}
                                role="radio"
                                aria-checked={isSelected}
                              >
                                <span className="quiz-option-left">
                                  <span className="quiz-radio-outer">
                                    {isSelected && <span className="quiz-radio-inner" />}
                                  </span>
                                  <span className="quiz-option-text">{option.text}</span>
                                </span>
                                <span className="quiz-option-letter-badge">{option.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Navigation & Submit Action Row */}
                      <div className="quiz-actions-footer mt-4">
                        <div className="quiz-nav-buttons-group">
                          <button
                            type="button"
                            className="btn-quiz-nav cursor-pointer"
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                          >
                            <span>← Câu trước</span>
                          </button>
                          <button
                            type="button"
                            className="btn-quiz-nav cursor-pointer"
                            disabled={
                              currentQuestionIndex === currentLessonExercise.questions.length - 1
                            }
                            onClick={() =>
                              setCurrentQuestionIndex((prev) =>
                                Math.min(currentLessonExercise.questions.length - 1, prev + 1)
                              )
                            }
                          >
                            <span>Câu tiếp theo →</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn-submit-quiz cursor-pointer"
                          onClick={handleSubmitQuiz}
                        >
                          <Check size={15} />
                          <span>
                            {quizSubmitted ? 'Nộp lại bài kiểm tra' : 'Nộp Bài Kiểm Tra'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
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
                          <span>⏱ {lesson.duration} • </span>
                          {isCompleted ? (
                            <strong className="text-emerald-600 font-semibold">
                              Đã Hoàn Thành ✓ (100%)
                            </strong>
                          ) : isSelected ? (
                            <span className="text-brand-600 font-medium">
                              ĐANG CHỌN / ĐANG HỌC ({lesson.progressPercent}%)
                            </span>
                          ) : lesson.progressPercent > 0 ? (
                            <span className="text-brand-600 font-medium">
                              Đang Học ({lesson.progressPercent}%)
                            </span>
                          ) : (
                            <span>Chưa Bắt Đầu (0%)</span>
                          )}
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
