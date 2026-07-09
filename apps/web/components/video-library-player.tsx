"use client"

import {
  BadgeCheck,
  Captions,
  ChevronRight,
  Clock3,
  Download,
  Gauge,
  ListVideo,
  Maximize2,
  Pause,
  PictureInPicture2,
  Play,
  RefreshCw,
  Search,
  SkipBack,
  SkipForward,
  UploadCloud,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react"
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import type {
  VideoLibraryItem,
  VideoLibraryPayload,
} from "@/lib/video-library"
import { cn } from "@/lib/utils"

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2]

const playerCopy = {
  en: {
    library: "Walkthrough library",
    search: "Search videos",
    all: "All",
    videos: "videos",
    nowPlaying: "Now playing",
    playThis: "Open this video",
    nextVideo: "Next in the journey",
    continue: "Continue the walkthrough",
    finishedTitle: "Walkthrough complete",
    finishedBody:
      "You have reached the launch-readiness chapter. Start again from the business overview when you want to present the full story to a client.",
    restart: "Restart from the first video",
    currentStep: "Current step",
    supabaseReady: "Ready for review",
    localFallback: "Draft preview",
    pendingTitle: "Video file is being prepared",
    pendingBody:
      "This item is listed in the playlist and will become playable as soon as the media file is available.",
    chapters: "Chapters",
    captionsOn: "Captions on",
    captionsOff: "Captions off",
    noCaptions: "No captions",
    speed: "Speed",
    duration: "Duration",
    download: "Download video",
    fullscreen: "Fullscreen",
    pictureInPicture: "Picture in picture",
    replay: "Replay",
    back: "Back 10 seconds",
    forward: "Forward 10 seconds",
    play: "Play",
    pause: "Pause",
    mute: "Mute",
    unmute: "Unmute",
    readyForUpload: "Walkthrough library",
  },
  de: {
    library: "Produktführung",
    search: "Videos suchen",
    all: "Alle",
    videos: "Videos",
    nowPlaying: "Aktuell",
    playThis: "Dieses Video öffnen",
    nextVideo: "Nächster Schritt",
    continue: "Produktrundgang fortsetzen",
    finishedTitle: "Produktrundgang abgeschlossen",
    finishedBody:
      "Sie sind beim Kapitel zur Go-live-Bereitschaft angekommen. Starten Sie wieder beim Management-Überblick, wenn Sie die gesamte Geschichte einem Kunden zeigen möchten.",
    restart: "Wieder beim ersten Video starten",
    currentStep: "Aktiver Schritt",
    supabaseReady: "Bereit zur Prüfung",
    localFallback: "Entwurfsansicht",
    pendingTitle: "Videodatei wird vorbereitet",
    pendingBody:
      "Dieser Eintrag bleibt in der Playlist sichtbar und wird abspielbar, sobald die Mediendatei bereitsteht.",
    chapters: "Kapitel",
    captionsOn: "Untertitel an",
    captionsOff: "Untertitel aus",
    noCaptions: "Keine Untertitel",
    speed: "Tempo",
    duration: "Dauer",
    download: "Video herunterladen",
    fullscreen: "Vollbild",
    pictureInPicture: "Bild im Bild",
    replay: "Neu starten",
    back: "10 Sekunden zurueck",
    forward: "10 Sekunden vor",
    play: "Abspielen",
    pause: "Pause",
    mute: "Stumm",
    unmute: "Ton an",
    readyForUpload: "Produktführung",
  },
  tr: {
    library: "Ürün turu kütüphanesi",
    search: "Video ara",
    all: "Tümü",
    videos: "video",
    nowPlaying: "Şu an oynatılıyor",
    playThis: "Bu videoya geç",
    nextVideo: "Sıradaki adım",
    continue: "Ürün turuna devam et",
    finishedTitle: "Ürün turu tamamlandı",
    finishedBody:
      "Canlıya geçiş hazırlığı bölümüne ulaştınız. Tüm hikayeyi müşteriye yeniden anlatmak için yönetim özetinden tekrar başlayabilirsiniz.",
    restart: "İlk videodan tekrar başlat",
    currentStep: "Aktif adım",
    supabaseReady: "İncelemeye hazır",
    localFallback: "Taslak önizleme",
    pendingTitle: "Video dosyası hazırlanıyor",
    pendingBody:
      "Bu kayıt playlist içinde görünür ve medya dosyası hazır olduğunda oynatılabilir hale gelir.",
    chapters: "Bölümler",
    captionsOn: "Altyazı açık",
    captionsOff: "Altyazı kapalı",
    noCaptions: "Altyazı yok",
    speed: "Hız",
    duration: "Süre",
    download: "Videoyu indir",
    fullscreen: "Tam ekran",
    pictureInPicture: "Resim içinde resim",
    replay: "Başa sar",
    back: "10 saniye geri",
    forward: "10 saniye ileri",
    play: "Oynat",
    pause: "Duraklat",
    mute: "Sessiz",
    unmute: "Sesi aç",
    readyForUpload: "Ürün turu kütüphanesi",
  },
  ru: {
    library: "Библиотека обзоров",
    search: "Поиск видео",
    all: "Все",
    videos: "видео",
    nowPlaying: "Сейчас воспроизводится",
    playThis: "Открыть это видео",
    nextVideo: "Следующий шаг",
    continue: "Продолжить обзор",
    finishedTitle: "Обзор завершен",
    finishedBody:
      "Вы дошли до главы о готовности к запуску. Начните снова с управленческого обзора, если хотите показать клиенту всю историю.",
    restart: "Начать с первого видео",
    currentStep: "Текущий шаг",
    supabaseReady: "Готово к проверке",
    localFallback: "Черновой просмотр",
    pendingTitle: "Видео готовится",
    pendingBody:
      "Этот пункт остается в плейлисте и станет доступен для просмотра, когда медиафайл будет готов.",
    chapters: "Разделы",
    captionsOn: "Субтитры включены",
    captionsOff: "Субтитры выключены",
    noCaptions: "Субтитров нет",
    speed: "Скорость",
    duration: "Длительность",
    download: "Скачать видео",
    fullscreen: "Во весь экран",
    pictureInPicture: "Картинка в картинке",
    replay: "Сначала",
    back: "Назад на 10 секунд",
    forward: "Вперед на 10 секунд",
    play: "Воспроизвести",
    pause: "Пауза",
    mute: "Без звука",
    unmute: "Включить звук",
    readyForUpload: "Библиотека обзоров",
  },
} as const

type PlayerLocale = keyof typeof playerCopy

export function VideoLibraryPlayer({
  library,
  locale,
}: {
  library: VideoLibraryPayload
  locale: string
}) {
  const copy = playerCopy[resolvePlayerLocale(locale)]
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerShellRef = useRef<HTMLDivElement | null>(null)
  const [selectedSlug, setSelectedSlug] = useState(
    library.videos[0]?.slug ?? ""
  )
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>(copy.all)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.82)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(library.videos[0]?.durationSeconds ?? 0)
  const [captionsEnabled, setCaptionsEnabled] = useState(true)

  const selectedVideo = useMemo(
    () =>
      library.videos.find((video) => video.slug === selectedSlug) ??
      library.videos[0],
    [library.videos, selectedSlug]
  )

  const categories = useMemo(
    () => [
      copy.all,
      ...Array.from(new Set(library.videos.map((video) => video.category))),
    ],
    [copy.all, library.videos]
  )

  const filteredVideos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return library.videos.filter((video) => {
      const matchesCategory =
        category === copy.all || video.category === category
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [video.title, video.description, video.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)

      return matchesCategory && matchesQuery
    })
  }, [category, copy.all, library.videos, query])

  const hasPlayableVideo = Boolean(selectedVideo?.videoUrl)
  const hasCaptions = Boolean(selectedVideo?.captions.length)
  const selectedVideoSlug = selectedVideo?.slug
  const selectedIndex = useMemo(
    () => library.videos.findIndex((video) => video.slug === selectedVideoSlug),
    [library.videos, selectedVideoSlug]
  )
  const nextVideo =
    selectedIndex >= 0 ? library.videos[selectedIndex + 1] : undefined

  useEffect(() => {
    if (!selectedVideoSlug) return

    const video = videoRef.current
    if (!video) return

    video.pause()
    video.currentTime = 0
  }, [selectedVideoSlug])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = playbackRate
  }, [playbackRate, selectedVideoSlug])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.volume = volume
    video.muted = isMuted
  }, [isMuted, selectedVideoSlug, volume])

  const selectVideo = useCallback((video: VideoLibraryItem) => {
    const currentVideo = videoRef.current
    currentVideo?.pause()
    if (currentVideo) {
      currentVideo.currentTime = 0
    }

    setSelectedSlug(video.slug)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(video.durationSeconds)
  }, [])

  const syncDuration = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const nextDuration = Number.isFinite(video.duration)
      ? video.duration
      : selectedVideo?.durationSeconds ?? 0
    setDuration(nextDuration)
  }, [selectedVideo?.durationSeconds])

  const syncTime = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
  }, [])

  const togglePlay = useCallback(async () => {
    const video = videoRef.current
    if (!video || !hasPlayableVideo) return

    if (video.paused) {
      try {
        await video.play()
      } catch {
        setIsPlaying(false)
      }
    } else {
      video.pause()
    }
  }, [hasPlayableVideo])

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return

    const nextTime = Math.min(Math.max(time, 0), duration)
    video.currentTime = nextTime
    setCurrentTime(nextTime)
  }, [duration])

  const handleSeekChange = (event: ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(event.target.value))
  }

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextVolume = Number(event.target.value)
    setVolume(nextVolume)
    setIsMuted(nextVolume === 0)
  }

  const toggleMute = () => {
    setIsMuted((current) => !current)
  }

  const replay = () => {
    seekTo(0)
  }

  const skipBy = (seconds: number) => {
    seekTo(currentTime + seconds)
  }

  const toggleFullscreen = async () => {
    const shell = playerShellRef.current
    if (!shell) return

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await shell.requestFullscreen()
  }

  const togglePictureInPicture = async () => {
    const video = videoRef.current
    if (!video || !hasPlayableVideo) return

    if (!document.pictureInPictureEnabled) return

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
      return
    }

    await video.requestPictureInPicture()
  }

  if (!selectedVideo) return null

  return (
    <section
      id="video-library"
      className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"
      data-testid="video-library"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.75fr)]">
        <div
          ref={playerShellRef}
          className="premium-surface overflow-hidden rounded-3xl p-3 sm:p-4"
          data-testid="video-player"
        >
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#061a17] text-white shadow-2xl shadow-slate-950/20">
            {hasPlayableVideo ? (
              <video
                key={selectedVideo.slug}
                ref={videoRef}
                className="h-full w-full bg-[#061a17] object-contain"
                controls={false}
                crossOrigin="anonymous"
                onDurationChange={syncDuration}
                onLoadedMetadata={syncDuration}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onTimeUpdate={syncTime}
                playsInline
                poster={selectedVideo.thumbnailUrl}
                preload="metadata"
                src={selectedVideo.videoUrl ?? undefined}
              >
                {captionsEnabled
                  ? selectedVideo.captions.map((track) => (
                      <track
                        key={`${track.srclang}-${track.label}`}
                        default={track.default}
                        kind="subtitles"
                        label={track.label}
                        src={track.src}
                        srcLang={track.srclang}
                      />
                    ))
                  : null}
              </video>
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(6, 26, 23, 0.82), rgba(6, 107, 99, 0.42)), url(${selectedVideo.thumbnailUrl})`,
                }}
              />
            )}

            {!hasPlayableVideo ? (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="max-w-xl rounded-2xl border border-white/16 bg-[#061a17]/82 p-5 text-center shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-emerald-100 ring-1 ring-white/16">
                    <UploadCloud className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-black tracking-[0.16em] text-emerald-100 uppercase">
                    {copy.readyForUpload}
                  </p>
                  <h3 className="mt-2 text-2xl font-black">
                    {copy.pendingTitle}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-emerald-50/78">
                    {copy.pendingBody}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/92 via-black/62 to-transparent p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="w-12 shrink-0 text-right text-xs font-black text-white/76 tabular-nums">
                  {formatTime(currentTime)}
                </span>
                <input
                  aria-label="Seek video"
                  className="h-2 w-full cursor-pointer accent-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!hasPlayableVideo}
                  max={Math.max(duration, 1)}
                  min={0}
                  onChange={handleSeekChange}
                  step={0.1}
                  type="range"
                  value={Math.min(currentTime, Math.max(duration, 1))}
                />
                <span className="w-12 shrink-0 text-xs font-black text-white/76 tabular-nums">
                  {formatTime(duration)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <IconButton
                  disabled={!hasPlayableVideo}
                  icon={<RefreshCw className="h-4 w-4" />}
                  label={copy.replay}
                  onClick={replay}
                />
                <IconButton
                  disabled={!hasPlayableVideo}
                  icon={<SkipBack className="h-4 w-4" />}
                  label={copy.back}
                  onClick={() => skipBy(-10)}
                />
                <button
                  aria-label={isPlaying ? copy.pause : copy.play}
                  className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-[#061a17] shadow-xl shadow-black/20 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!hasPlayableVideo}
                  onClick={togglePlay}
                  type="button"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Play className="h-5 w-5" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">
                    {isPlaying ? copy.pause : copy.play}
                  </span>
                </button>
                <IconButton
                  disabled={!hasPlayableVideo}
                  icon={<SkipForward className="h-4 w-4" />}
                  label={copy.forward}
                  onClick={() => skipBy(10)}
                />
                <IconButton
                  disabled={!hasPlayableVideo}
                  icon={
                    isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )
                  }
                  label={isMuted ? copy.unmute : copy.mute}
                  onClick={toggleMute}
                />
                <input
                  aria-label="Volume"
                  className="h-2 w-24 cursor-pointer accent-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!hasPlayableVideo}
                  max={1}
                  min={0}
                  onChange={handleVolumeChange}
                  step={0.01}
                  type="range"
                  value={isMuted ? 0 : volume}
                />
                <button
                  aria-label={
                    hasCaptions
                      ? captionsEnabled
                        ? copy.captionsOn
                        : copy.captionsOff
                      : copy.noCaptions
                  }
                  className={cn(
                    "inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-full border border-white/14 px-3 text-xs font-black text-white shadow-sm transition",
                    captionsEnabled && hasCaptions
                      ? "bg-teal-300/22 text-teal-50"
                      : "bg-white/10 hover:bg-white/16",
                    !hasCaptions && "cursor-not-allowed opacity-45"
                  )}
                  disabled={!hasCaptions}
                  onClick={() => {
                    setCaptionsEnabled((current) => !current)
                  }}
                  title={
                    hasCaptions
                      ? captionsEnabled
                        ? copy.captionsOn
                        : copy.captionsOff
                      : copy.noCaptions
                  }
                  type="button"
                >
                  <Captions className="h-4 w-4" aria-hidden="true" />
                </button>
                <label className="ml-auto inline-flex h-10 items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 text-xs font-black text-white">
                  <Gauge className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{copy.speed}</span>
                  <select
                    aria-label={copy.speed}
                    className="bg-transparent text-xs font-black text-white outline-none"
                    onChange={(event) => setPlaybackRate(Number(event.target.value))}
                    value={playbackRate}
                  >
                    {playbackRates.map((rate) => (
                      <option key={rate} className="text-slate-950" value={rate}>
                        {rate}x
                      </option>
                    ))}
                  </select>
                </label>
                <IconButton
                  disabled={!hasPlayableVideo}
                  icon={<PictureInPicture2 className="h-4 w-4" />}
                  label={copy.pictureInPicture}
                  onClick={togglePictureInPicture}
                />
                <IconButton
                  icon={<Maximize2 className="h-4 w-4" />}
                  label={copy.fullscreen}
                  onClick={toggleFullscreen}
                />
                {selectedVideo.videoUrl ? (
                  <a
                    aria-label={copy.download}
                    className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-white/14 bg-white/10 px-3 text-white shadow-sm transition hover:bg-white/16"
                    download
                    href={selectedVideo.videoUrl}
                    title={copy.download}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-1 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.44fr)]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                  <Video className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.nowPlaying}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/76 px-3 py-1 text-xs font-bold text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.duration} {formatTime(selectedVideo.durationSeconds)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/76 px-3 py-1 text-xs font-bold text-muted-foreground">
                  <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {library.source === "supabase"
                    ? copy.supabaseReady
                    : copy.localFallback}
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {selectedVideo.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                {selectedVideo.description}
              </p>

              <button
                className="group grid w-full grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.055] p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/[0.08] hover:shadow-xl hover:shadow-primary/[0.08]"
                onClick={() => {
                  const targetVideo = nextVideo ?? library.videos[0]
                  if (targetVideo) selectVideo(targetVideo)
                }}
                type="button"
              >
                <span
                  className="relative block aspect-video overflow-hidden rounded-xl bg-cover bg-center shadow-sm"
                  style={{
                    backgroundImage: `linear-gradient(135deg, rgba(6, 26, 23, 0.18), rgba(6, 107, 99, 0.24)), url(${(nextVideo ?? library.videos[0])?.thumbnailUrl})`,
                  }}
                >
                  <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-primary shadow-sm transition group-hover:scale-105">
                      <Play className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-black tracking-[0.14em] text-primary uppercase">
                    {nextVideo ? copy.nextVideo : copy.finishedTitle}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm font-black leading-5 text-foreground">
                    {nextVideo ? nextVideo.title : copy.finishedBody}
                  </span>
                  <span className="mt-1 block text-xs font-bold text-muted-foreground">
                    {nextVideo ? copy.continue : copy.restart}
                  </span>
                </span>
                <ChevronRight
                  className="h-5 w-5 text-primary transition group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-primary/15 bg-primary/[0.045] p-3">
                <div className="flex items-center justify-between gap-3 text-xs font-black text-primary">
                  <span>{copy.currentStep}</span>
                  <span className="tabular-nums">
                    {Math.max(selectedIndex + 1, 1)} / {library.videos.length}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/12">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          ((selectedIndex + 1) / library.videos.length) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/72 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-black tracking-[0.14em] text-muted-foreground uppercase">
                  <ListVideo className="h-4 w-4 text-primary" aria-hidden="true" />
                  {copy.chapters}
                </div>
                <div className="grid gap-2">
                  {selectedVideo.chapters.map((chapter) => (
                    <button
                      key={`${selectedVideo.slug}-${chapter.label}-${chapter.time}`}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left text-xs font-bold text-foreground transition hover:border-primary/35 hover:bg-primary/[0.035] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!hasPlayableVideo}
                      onClick={() => seekTo(chapter.time)}
                      type="button"
                    >
                      <span className="min-w-0 truncate">{chapter.label}</span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {formatTime(chapter.time)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="premium-surface rounded-3xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-primary uppercase">
                {copy.library}
              </p>
              <h3 className="mt-1 text-xl font-black text-foreground">
                {library.videos.length} {copy.videos}
              </h3>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ListVideo className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          {library.warning ? (
            <div className="mt-4 rounded-2xl border border-amber-300/45 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
              {library.warning}
            </div>
          ) : null}

          <label className="mt-4 flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-3 text-sm font-bold text-foreground shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">{copy.search}</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
              type="search"
              value={query}
            />
          </label>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-black transition",
                  category === item
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/15"
                    : "border-border bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground"
                )}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-4 grid max-h-[760px] gap-3 overflow-y-auto pr-1">
            {filteredVideos.map((video) => {
              const active = video.slug === selectedVideo.slug

              return (
                <button
                  key={video.slug}
                  className={cn(
                    "group grid grid-cols-[112px_minmax(0,1fr)] gap-3 rounded-2xl border bg-card p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/[0.08]",
                    active
                      ? "border-primary/45 bg-primary/[0.045] ring-2 ring-primary/15"
                      : "border-border"
                  )}
                  data-testid={`video-card-${video.slug}`}
                  onClick={() => selectVideo(video)}
                  type="button"
                >
                  <span
                    className="relative block aspect-video overflow-hidden rounded-xl bg-cover bg-center"
                    style={{
                      backgroundImage: `linear-gradient(135deg, rgba(6, 26, 23, 0.16), rgba(6, 107, 99, 0.18)), url(${video.thumbnailUrl})`,
                    }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-black text-white backdrop-blur">
                      <Clock3 className="h-3 w-3" aria-hidden="true" />
                      {formatTime(video.durationSeconds)}
                    </span>
                    <span className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/88 text-primary shadow-sm">
                      {active ? (
                        <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-col justify-center">
                    <span className="mb-1 inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                      {video.category}
                    </span>
                    <span className="line-clamp-2 text-sm font-black leading-5 text-foreground">
                      {video.title}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-muted-foreground">
                      {video.description}
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-primary">
                      {active ? copy.nowPlaying : copy.playThis}
                      <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>
      </div>
    </section>
  )
}

function IconButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-white/14 bg-white/10 px-3 text-white shadow-sm transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  )
}

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function resolvePlayerLocale(locale: string): PlayerLocale {
  if (locale === "tr" || locale === "de" || locale === "ru") return locale
  return "en"
}
