/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import Artplayer from "artplayer";
import artplayerPluginChapter from "./artPlayerPluinChaper";
import autoSkip from "./autoSkip";
import artplayerPluginVttThumbnail from "./artPlayerPluginVttThumbnail";
import {
  backward10Icon,
  backwardIcon,
  captionIcon,
  forward10Icon,
  forwardIcon,
  fullScreenOffIcon,
  fullScreenOnIcon,
  loadingIcon,
  logo,
  muteIcon,
  pauseIcon,
  pipIcon,
  playIcon,
  playIconLg,
  settingsIcon,
  volumeIcon,
} from "./PlayerIcons";
import "./Player.css";
import website_name from "@/src/config/website";
import getChapterStyles from "./getChapterStyle";
import artplayerPluginHlsControl from "artplayer-plugin-hls-control";
import artplayerPluginUploadSubtitle from "./artplayerPluginUploadSubtitle";

Artplayer.LOG_VERSION = false;
Artplayer.CONTEXTMENU = false;

const KEY_CODES = {
  M: "KeyM",
  I: "KeyI",
  F: "KeyF",
  V: "KeyV",
  SPACE: "Space", 
  SPACE_LEGACY: "Spacebar", 
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_RIGHT: "ArrowRight",
  ARROW_LEFT: "ArrowLeft",
};

export default function Player({
  streamUrl,
  subtitles,
  thumbnail,
  intro,
  outro,
  autoSkipIntro,
  autoPlay,
  autoNext,
  episodeId,
  episodes,
  playNext,
  animeInfo,
  episodeNum,
  streamInfo,
}) {
  const artRef = useRef(null);
  const iframeRef = useRef(null);
  const leftAtRef = useRef(0);
  const boundKeydownRef = useRef(null);
  const proxy = import.meta.env.VITE_PROXY_URL;
  const m3u8proxy = import.meta.env.VITE_M3U8_PROXY_URL?.split(",") || [];
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(
    episodes?.findIndex((episode) => episode.id.match(/ep=(\d+)/)?.[1] === episodeId)
  );
  const [isIframeMode, setIsIframeMode] = useState(false);

  useEffect(() => {
    if (episodes?.length > 0) {
      const newIndex = episodes.findIndex(
        (episode) => episode.id.match(/ep=(\d+)/)?.[1] === episodeId
      );
      setCurrentEpisodeIndex(newIndex);
    }
  }, [episodeId, episodes]);

  // Check if we should use iframe mode
  useEffect(() => {
    if (streamUrl) {
      const isMegaplayOrVidwish = streamUrl.includes('megaplay.buzz') || streamUrl.includes('vidwish.live');
      setIsIframeMode(isMegaplayOrVidwish);
    }
  }, [streamUrl]);

  useEffect(() => {
    const applyChapterStyles = () => {
      const existingStyles = document.querySelectorAll("style[data-chapter-styles]");
      existingStyles.forEach((style) => style.remove());
      const styleElement = document.createElement("style");
      styleElement.setAttribute("data-chapter-styles", "true");
      const styles = getChapterStyles(intro, outro);
      styleElement.textContent = styles;
      document.head.appendChild(styleElement);
      return () => {
        styleElement.remove();
      };
    };

    if (streamUrl || intro || outro) {
      const cleanup = applyChapterStyles();
      return cleanup;
    }
  }, [streamUrl, intro, outro]);

  // SIMPLE IFRAME MODE FOR MEGAPLAY/VIDWISH
  useEffect(() => {
    if (!streamUrl || !artRef.current) return;

    const container = artRef.current;
    
    // Clear container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Check if we should use iframe (Megaplay/Vidwish)
    const useIframe = streamUrl.includes('megaplay.buzz') || streamUrl.includes('vidwish.live');
    
    if (useIframe) {
      // Create iframe for Megaplay/Vidwish
      const iframe = document.createElement('iframe');
      iframe.src = streamUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.background = '#000';
      iframe.allowFullscreen = true;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.title = `Watch ${animeInfo?.title || 'Anime'} Episode ${episodeNum}`;
      
      container.appendChild(iframe);
      iframeRef.current = iframe;
      
      return () => {
        if (iframeRef.current && container.contains(iframeRef.current)) {
          container.removeChild(iframeRef.current);
          iframeRef.current = null;
        }
      };
    } else {
      // Use Artplayer for other streams
      const iframeUrl = streamInfo?.streamingLink?.iframe;
      const headers = {
        referer: iframeUrl ? new URL(iframeUrl).origin + "/" : window.location.origin + "/",
      };

      let fullscreenRefocusTimeout = null;

      try {
        if (!container.hasAttribute("tabindex")) container.setAttribute("tabindex", "0");
        else {
          const current = parseInt(container.getAttribute("tabindex"), 10);
          if (isNaN(current) || current < 0) container.setAttribute("tabindex", "0");
        }
        container.style.outline = "none";
      } catch (e) {
        // ignore
      }

      const art = new Artplayer({
        url:
          m3u8proxy[Math.floor(Math.random() * m3u8proxy?.length)] +
          encodeURIComponent(streamUrl) +
          "&headers=" +
          encodeURIComponent(JSON.stringify(headers)),
        container: container,
        type: "m3u8",
        autoplay: autoPlay,
        volume: 1,
        setting: true,
        playbackRate: true,
        pip: true,
        hotkey: false, 
        fullscreen: true,
        mutex: true,
        playsInline: true,
        lock: true,
        airplay: true,
        autoOrientation: true,
        fastForward: true,
        aspectRatio: true,
        moreVideoAttr: {
          crossOrigin: "anonymous",
          preload: "none",
          playsInline: true,
        },
        plugins: [
          artplayerPluginHlsControl({
            quality: {
              setting: true,
              getName: (level) => level.height + "P",
              title: "Quality",
              auto: "Auto",
            },
          }),
          artplayerPluginUploadSubtitle(),
          artplayerPluginChapter({ chapters: createChapters() }),
        ],
        subtitle: {
          style: {
            color: "#fff",
            "font-weight": "400",
            left: "50%",
            transform: "translateX(-50%)",
            "margin-bottom": "2rem",
          },
          escape: false,
        },
        layers: [
          {
            name: website_name,
            html: logo,
            tooltip: website_name,
            style: {
              opacity: 1,
              position: "absolute",
              top: "5px",
              right: "5px",
              transition: "opacity 0.5s ease-out",
            },
          },
        ],
        controls: [
          {
            html: backward10Icon,
            position: "right",
            tooltip: "Backward 10s",
            click: () => {
              art.currentTime = Math.max(art.currentTime - 10, 0);
            },
          },
          {
            html: forward10Icon,
            position: "right",
            tooltip: "Forward 10s",
            click: () => {
              art.currentTime = Math.min(art.currentTime + 10, art.duration);
            },
          },
        ],
        icons: {
          play: playIcon,
          pause: pauseIcon,
          setting: settingsIcon,
          volume: volumeIcon,
          pip: pipIcon,
          volumeClose: muteIcon,
          state: playIconLg,
          loading: loadingIcon,
          fullscreenOn: fullScreenOnIcon,
          fullscreenOff: fullScreenOffIcon,
        },
        customType: { 
          m3u8: (video, url, art) => {
            if (Hls.isSupported()) {
              if (art.hls) art.hls.destroy();
              const hls = new Hls();
              hls.loadSource(url);
              hls.attachMedia(video);
              art.hls = hls;
              art.on("destroy", () => hls.destroy());
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
              video.src = url;
            }
          }
        },
      });

      // Handle video end for auto-next
      art.on('video:ended', () => {
        if (currentEpisodeIndex < episodes?.length - 1 && autoNext) {
          const nextEp = episodes[currentEpisodeIndex + 1];
          const epMatch = nextEp.id.match(/ep=(\d+)/);
          if (epMatch) {
            playNext(epMatch[1]);
          }
        }
      });

      // Save continue watching
      art.on('video:timeupdate', () => {
        leftAtRef.current = Math.floor(art.currentTime);
      });

      // Cleanup
      return () => {
        if (art && art.destroy) {
          art.destroy(false);
        }
        if (fullscreenRefocusTimeout) clearTimeout(fullscreenRefocusTimeout);
        
        // Save continue watching
        try {
          const continueWatching = JSON.parse(localStorage.getItem("continueWatching")) || [];
          const newEntry = {
            id: animeInfo?.id,
            data_id: animeInfo?.data_id,
            episodeId,
            episodeNum,
            adultContent: animeInfo?.adultContent,
            poster: animeInfo?.poster,
            title: animeInfo?.title,
            japanese_title: animeInfo?.japanese_title,
            leftAt: leftAtRef.current,
            updatedAt: Date.now(),
          };

          if (newEntry.data_id) {
            const filtered = continueWatching.filter((item) => item.data_id !== newEntry.data_id);
            filtered.unshift(newEntry);
            localStorage.setItem("continueWatching", JSON.stringify(filtered));
          }
        } catch (err) {
          console.error("Failed to save continueWatching:", err);
        }
      };
    }
  }, [streamUrl, streamInfo, autoPlay, autoNext, episodeId, episodes, currentEpisodeIndex, playNext, animeInfo, episodeNum]);

  const createChapters = () => {
    const chapters = [];
    if (intro?.start !== 0 || intro?.end !== 0) {
      chapters.push({ start: intro.start, end: intro.end, title: "intro" });
    }
    if (outro?.start !== 0 || outro?.end !== 0) {
      chapters.push({ start: outro.start, end: outro.end, title: "outro" });
    }
    return chapters;
  };

  return <div ref={artRef} className="w-full h-full bg-black" />;
}