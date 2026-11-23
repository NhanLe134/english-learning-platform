export interface WatchedInterval {
  start: number
  end: number
}

export interface TrackerInitOptions {
  lessonId: string
  duration: number
  savedPositionSeconds: number
  savedProgressPercent: number
  isCompleted: boolean
  savedFurthestSeconds?: number
}

export interface TrackerSnapshot {
  lessonId: string
  duration: number
  currentTime: number
  watchedSeconds: number
  videoWatchedPercent: number
  lessonProgressPercent: number
  videoCompleted: boolean
  isLessonCompleted: boolean
}

export interface TrackerTickResult {
  seekBlocked: boolean
  revertToSeconds: number
  currentTime: number
  videoWatchedPercent: number
  lessonProgressPercent: number
}

export interface TrackerSeekCheckResult {
  allowed: boolean
  revertToSeconds: number
}

export interface TrackerEndedResult {
  genuine: boolean
  shouldOpenExercise: boolean
  revertToSeconds: number
  snapshot: TrackerSnapshot
}

const AUTHORIZED_SEEK_SETTLE_TOLERANCE_SEC = 2.0
const AUTHORIZED_SEEK_WINDOW_MS = 2500
const PLAYBACK_BACKWARD_JITTER_SEC = 1.25
const EOF_RESET_THRESHOLD_SEC = 1.5
const ENDED_TAIL_TOLERANCE_SEC = 2.5
const GENUINE_WATCH_RATIO = 0.95

function mergeInterval(intervals: WatchedInterval[], start: number, end: number): WatchedInterval[] {
  if (!(end > start)) return intervals
  const sorted = [...intervals, { start, end }].sort((a, b) => a.start - b.start)
  const merged: WatchedInterval[] = []
  for (const seg of sorted) {
    const prev = merged[merged.length - 1]
    if (!prev || seg.start > prev.end + 0.05) {
      merged.push({ start: seg.start, end: seg.end })
    } else if (seg.end > prev.end) {
      prev.end = seg.end
    }
  }
  return merged
}

function sumIntervals(intervals: WatchedInterval[]): number {
  let total = 0
  for (const seg of intervals) {
    total += Math.max(0, seg.end - seg.start)
  }
  return total
}

/**
 * Pure state machine tracking genuine continuous playback, blocking seeks and speed changes,
 * computing real-time watched intervals, and guarding exercise auto-open on genuine video completion.
 */
export class VideoWatchTracker {
  private lessonId = ''
  private duration = 0
  private intervals: WatchedInterval[] = []
  private lastValidTime = 0
  private furthestWatchedTime = 0
  private lastTickWallMs: number | null = null
  private isPlaying = false
  private hasPlayedInSession = false
  private hasPositionChanged = false
  private authorizedSeekTarget: number | null = null
  private authorizedSeekExpiresAtMs = 0
  private persistedProgressPercent = 0
  private videoCompleted = false
  private isLessonCompleted = false
  private exerciseOpenedForAttempt = false

  initializeForLesson(opts: TrackerInitOptions): { restorePosition: number } {
    this.lessonId = opts.lessonId
    this.duration = opts.duration > 0 && Number.isFinite(opts.duration) ? opts.duration : 0
    this.isLessonCompleted = Boolean(opts.isCompleted)
    this.videoCompleted = this.isLessonCompleted || opts.savedProgressPercent >= 99
    this.persistedProgressPercent = this.isLessonCompleted
      ? 100
      : Math.min(99, Math.max(0, Math.round(opts.savedProgressPercent || 0)))

    const rawSaved = opts.savedPositionSeconds > 0 && Number.isFinite(opts.savedPositionSeconds)
      ? opts.savedPositionSeconds
      : 0

    // Do not restore right at EOF so a resumed video does not immediately fail or appear stuck at the end
    const safeRestore =
      this.duration > 0 && rawSaved >= this.duration - EOF_RESET_THRESHOLD_SEC
        ? 0
        : rawSaved

    this.lastValidTime = safeRestore

    const persistedWatchedFromPct = this.duration > 0
      ? (this.persistedProgressPercent / 100) * this.duration
      : 0
    const hasExactFurthest =
      typeof opts.savedFurthestSeconds === 'number' &&
      Number.isFinite(opts.savedFurthestSeconds) &&
      opts.savedFurthestSeconds >= 0
    const initialFurthest = hasExactFurthest
      ? Math.max(rawSaved, safeRestore, opts.savedFurthestSeconds!)
      : Math.max(rawSaved, safeRestore, persistedWatchedFromPct)

    this.furthestWatchedTime = (this.isLessonCompleted || this.videoCompleted) && this.duration > 0
      ? this.duration
      : this.duration > 0
      ? Math.min(this.duration, initialFurthest)
      : initialFurthest

    this.intervals =
      this.furthestWatchedTime > 0
        ? [{ start: 0, end: this.duration > 0 ? Math.min(this.duration, this.furthestWatchedTime) : this.furthestWatchedTime }]
        : []
    this.isPlaying = false
    this.hasPlayedInSession = false
    this.hasPositionChanged = false
    this.lastTickWallMs = null
    this.authorizedSeekTarget = null
    this.authorizedSeekExpiresAtMs = 0
    this.exerciseOpenedForAttempt = false

    return { restorePosition: safeRestore }
  }

  setDuration(durationSeconds: number): { restorePosition: number } {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return { restorePosition: this.lastValidTime }
    }
    this.duration = durationSeconds

    if (this.isLessonCompleted || this.videoCompleted) {
      this.furthestWatchedTime = durationSeconds
    } else {
      const persistedWatchedFromPct = (this.persistedProgressPercent / 100) * durationSeconds
      this.furthestWatchedTime = Math.min(
        durationSeconds,
        Math.max(this.furthestWatchedTime, persistedWatchedFromPct)
      )
    }

    if (!this.hasPlayedInSession) {
      if (this.lastValidTime >= durationSeconds - EOF_RESET_THRESHOLD_SEC) {
        this.lastValidTime = 0
      }
      if (this.furthestWatchedTime > 0) {
        this.intervals = [{ start: 0, end: Math.min(durationSeconds, this.furthestWatchedTime) }]
      }
    } else if (this.intervals.length > 0) {
      this.intervals = this.intervals
        .map((seg) => ({
          start: Math.min(seg.start, durationSeconds),
          end: Math.min(seg.end, durationSeconds),
        }))
        .filter((seg) => seg.end > seg.start)
    }

    return { restorePosition: this.lastValidTime }
  }

  getMaxSeekableTime(): number {
    if (this.isLessonCompleted || this.videoCompleted) {
      return this.duration > 0 ? this.duration : this.furthestWatchedTime
    }
    return this.furthestWatchedTime
  }

  getFurthestWatchedTime(): number {
    return this.furthestWatchedTime
  }

  beginAuthorizedSeek(targetSeconds: number, nowMs: number, markPositionChanged = false): boolean {
    const maxAllowed = this.getMaxSeekableTime()
    const clampedTarget = Math.max(0, targetSeconds)
    if (clampedTarget > maxAllowed + 0.5) {
      return false
    }
    const safeTarget = Math.min(maxAllowed, clampedTarget)
    this.authorizedSeekTarget = safeTarget
    this.authorizedSeekExpiresAtMs = nowMs + AUTHORIZED_SEEK_WINDOW_MS
    this.lastValidTime = safeTarget
    this.lastTickWallMs = null
    if (markPositionChanged) {
      this.hasPositionChanged = true
    }
    return true
  }

  onPlay(nowMs: number): void {
    this.isPlaying = true
    this.hasPlayedInSession = true
    this.lastTickWallMs = nowMs
  }

  onPauseOrBuffer(): void {
    this.isPlaying = false
    this.lastTickWallMs = null
  }

  onSeeking(requestedTime: number, nowMs: number): TrackerSeekCheckResult {
    const maxAllowed = this.getMaxSeekableTime()

    if (
      this.authorizedSeekTarget !== null &&
      nowMs <= this.authorizedSeekExpiresAtMs &&
      Math.abs(requestedTime - this.authorizedSeekTarget) <= AUTHORIZED_SEEK_SETTLE_TOLERANCE_SEC
    ) {
      return { allowed: true, revertToSeconds: requestedTime }
    }

    // Allow seeking backward to any position within [0, furthestWatchedTime]
    if (requestedTime >= 0 && requestedTime <= maxAllowed + 0.5) {
      return { allowed: true, revertToSeconds: Math.min(requestedTime, maxAllowed) }
    }

    // Seeking forward beyond watched progress is blocked
    return { allowed: false, revertToSeconds: this.lastValidTime }
  }

  onTimeSample(currentTime: number, nowMs: number, playbackRate = 1): TrackerTickResult {
    const safeTime = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : this.lastValidTime
    const maxAllowed = this.getMaxSeekableTime()

    if (this.authorizedSeekTarget !== null) {
      if (Math.abs(safeTime - this.authorizedSeekTarget) <= AUTHORIZED_SEEK_SETTLE_TOLERANCE_SEC) {
        const settledTime =
          !this.isLessonCompleted && !this.videoCompleted && !this.isPlaying
            ? Math.min(safeTime, maxAllowed)
            : safeTime
        this.lastValidTime = settledTime
        this.authorizedSeekTarget = null
        this.authorizedSeekExpiresAtMs = 0
        if (this.isPlaying) {
          this.lastTickWallMs = nowMs
        }
        const snap = this.getSnapshot()
        return {
          seekBlocked: false,
          revertToSeconds: settledTime,
          currentTime: settledTime,
          videoWatchedPercent: snap.videoWatchedPercent,
          lessonProgressPercent: snap.lessonProgressPercent,
        }
      }
      if (nowMs <= this.authorizedSeekExpiresAtMs) {
        const snap = this.getSnapshot()
        return {
          seekBlocked: false,
          revertToSeconds: this.lastValidTime,
          currentTime: this.lastValidTime,
          videoWatchedPercent: snap.videoWatchedPercent,
          lessonProgressPercent: snap.lessonProgressPercent,
        }
      }
      this.authorizedSeekTarget = null
      this.authorizedSeekExpiresAtMs = 0
    }

    // Ignore playback time at non-1x speed and snap back if jumping ahead
    if (Math.abs(playbackRate - 1) > 0.05) {
      this.onPauseOrBuffer()
      const snap = this.getSnapshot()
      return {
        seekBlocked: true,
        revertToSeconds: this.lastValidTime,
        currentTime: this.lastValidTime,
        videoWatchedPercent: snap.videoWatchedPercent,
        lessonProgressPercent: snap.lessonProgressPercent,
      }
    }

    // If not playing (paused state):
    if (!this.isPlaying) {
      if (Math.abs(safeTime - this.lastValidTime) > PLAYBACK_BACKWARD_JITTER_SEC) {
        if (safeTime <= maxAllowed + 0.5) {
          const clampedPausedTime = Math.min(safeTime, maxAllowed)
          this.lastValidTime = clampedPausedTime
          const snap = this.getSnapshot()
          return {
            seekBlocked: false,
            revertToSeconds: clampedPausedTime,
            currentTime: clampedPausedTime,
            videoWatchedPercent: snap.videoWatchedPercent,
            lessonProgressPercent: snap.lessonProgressPercent,
          }
        }
        const snap = this.getSnapshot()
        return {
          seekBlocked: true,
          revertToSeconds: this.lastValidTime,
          currentTime: this.lastValidTime,
          videoWatchedPercent: snap.videoWatchedPercent,
          lessonProgressPercent: snap.lessonProgressPercent,
        }
      }
      const snap = this.getSnapshot()
      return {
        seekBlocked: false,
        revertToSeconds: this.lastValidTime,
        currentTime: this.lastValidTime,
        videoWatchedPercent: snap.videoWatchedPercent,
        lessonProgressPercent: snap.lessonProgressPercent,
      }
    }

    const elapsedWallSec =
      this.lastTickWallMs !== null ? Math.max(0, (nowMs - this.lastTickWallMs) / 1000) : 0.5
    const maxForwardDelta = Math.min(6.0, elapsedWallSec * 1.25 + 1.5)
    const delta = safeTime - this.lastValidTime

    // Forward seek beyond maxForwardDelta:
    if (delta > maxForwardDelta) {
      // If jump is within previously watched progress, allow it
      if (safeTime <= maxAllowed + 0.5) {
        const clampedForwardTime = Math.min(safeTime, maxAllowed)
        this.lastValidTime = clampedForwardTime
        this.lastTickWallMs = nowMs
        const snap = this.getSnapshot()
        return {
          seekBlocked: false,
          revertToSeconds: clampedForwardTime,
          currentTime: clampedForwardTime,
          videoWatchedPercent: snap.videoWatchedPercent,
          lessonProgressPercent: snap.lessonProgressPercent,
        }
      }

      // Jump beyond watched progress: block it
      const snap = this.getSnapshot()
      return {
        seekBlocked: true,
        revertToSeconds: this.lastValidTime,
        currentTime: this.lastValidTime,
        videoWatchedPercent: snap.videoWatchedPercent,
        lessonProgressPercent: snap.lessonProgressPercent,
      }
    }

    // Backward seek during playback (delta < 0):
    if (delta < 0) {
      this.lastValidTime = Math.max(0, safeTime)
      this.lastTickWallMs = nowMs
      const snap = this.getSnapshot()
      return {
        seekBlocked: false,
        revertToSeconds: this.lastValidTime,
        currentTime: this.lastValidTime,
        videoWatchedPercent: snap.videoWatchedPercent,
        lessonProgressPercent: snap.lessonProgressPercent,
      }
    }

    // Normal forward playback:
    if (delta > 0) {
      this.intervals = mergeInterval(this.intervals, this.lastValidTime, safeTime)
      this.lastValidTime = safeTime
      if (safeTime > this.furthestWatchedTime) {
        this.furthestWatchedTime = safeTime
      }
    }
    this.lastTickWallMs = nowMs

    const snap = this.getSnapshot()
    return {
      seekBlocked: false,
      revertToSeconds: this.lastValidTime,
      currentTime: this.lastValidTime,
      videoWatchedPercent: snap.videoWatchedPercent,
      lessonProgressPercent: snap.lessonProgressPercent,
    }
  }

  onEnded(_nowMs: number): TrackerEndedResult {
    const dur = this.duration
    if (dur <= 0) {
      this.isPlaying = false
      this.lastTickWallMs = null
      return {
        genuine: false,
        shouldOpenExercise: false,
        revertToSeconds: this.lastValidTime,
        snapshot: this.getSnapshot(),
      }
    }

    if (
      (this.isPlaying || this.hasPlayedInSession) &&
      this.lastValidTime >= dur - ENDED_TAIL_TOLERANCE_SEC &&
      this.lastValidTime < dur
    ) {
      this.intervals = mergeInterval(this.intervals, this.lastValidTime, dur)
      this.lastValidTime = dur
    }

    this.isPlaying = false
    this.lastTickWallMs = null

    const watchedSeconds = sumIntervals(this.intervals)
    const isGenuine =
      this.hasPlayedInSession &&
      (watchedSeconds / dur >= GENUINE_WATCH_RATIO || dur - watchedSeconds <= EOF_RESET_THRESHOLD_SEC) &&
      this.lastValidTime >= dur - ENDED_TAIL_TOLERANCE_SEC

    if (!isGenuine) {
      return {
        genuine: false,
        shouldOpenExercise: false,
        revertToSeconds: this.lastValidTime,
        snapshot: this.getSnapshot(),
      }
    }

    this.videoCompleted = true
    this.furthestWatchedTime = Math.max(this.furthestWatchedTime, dur)
    const shouldOpenExercise = !this.exerciseOpenedForAttempt
    this.exerciseOpenedForAttempt = true

    return {
      genuine: true,
      shouldOpenExercise,
      revertToSeconds: dur,
      snapshot: this.getSnapshot(),
    }
  }

  markLessonCompleted(): void {
    this.isLessonCompleted = true
    this.videoCompleted = true
    this.persistedProgressPercent = 100
    if (this.duration > 0) {
      this.furthestWatchedTime = this.duration
    }
  }

  resetForReplay(nowMs: number): void {
    this.intervals = []
    this.videoCompleted = false
    this.exerciseOpenedForAttempt = false
    if (!this.isLessonCompleted) {
      this.furthestWatchedTime = 0
      this.persistedProgressPercent = 0
    }
    this.beginAuthorizedSeek(0, nowMs)
  }

  resetForRequiredReplay(nowMs: number): void {
    if (this.isLessonCompleted) return
    this.intervals = []
    this.videoCompleted = false
    this.exerciseOpenedForAttempt = false
    this.furthestWatchedTime = 0
    this.persistedProgressPercent = 0
    this.lastValidTime = 0
    this.hasPlayedInSession = false
    this.hasPositionChanged = false
    this.beginAuthorizedSeek(0, nowMs)
  }

  getLessonId(): string {
    return this.lessonId
  }

  getDuration(): number {
    return this.duration
  }

  getLastValidTime(): number {
    return this.lastValidTime
  }

  hasPlaybackActivity(): boolean {
    return this.hasPlayedInSession
  }

  hasUnsavedChanges(): boolean {
    return this.hasPlayedInSession || this.hasPositionChanged
  }

  isVideoCompleted(): boolean {
    return this.videoCompleted
  }

  getSnapshot(): TrackerSnapshot {
    const watchedSeconds = Math.max(sumIntervals(this.intervals), this.furthestWatchedTime)
    const videoWatchedPercent = (this.videoCompleted || this.isLessonCompleted)
      ? 100
      : this.duration > 0
      ? Math.min(99, Math.max(0, Math.round((watchedSeconds / this.duration) * 100)))
      : 0

    const lessonProgressPercent = this.isLessonCompleted
      ? 100
      : Math.min(99, Math.max(this.persistedProgressPercent, videoWatchedPercent))

    return {
      lessonId: this.lessonId,
      duration: this.duration,
      currentTime: this.lastValidTime,
      watchedSeconds,
      videoWatchedPercent,
      lessonProgressPercent,
      videoCompleted: this.videoCompleted,
      isLessonCompleted: this.isLessonCompleted,
    }
  }
}
