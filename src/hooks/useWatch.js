/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import getAnimeInfo from "@/src/utils/getAnimeInfo.utils";
import getEpisodes from "@/src/utils/getEpisodes.utils";
import getNextEpisodeSchedule from "../utils/getNextEpisodeSchedule.utils";

export const useWatch = (animeId, initialEpisodeId) => {
  const [error, setError] = useState(null);
  const [buffering, setBuffering] = useState(true);
  const [animeInfo, setAnimeInfo] = useState(null);
  const [episodes, setEpisodes] = useState(null);
  const [animeInfoLoading, setAnimeInfoLoading] = useState(false);
  const [totalEpisodes, setTotalEpisodes] = useState(null);
  const [seasons, setSeasons] = useState(null);

  const [servers, setServers] = useState([]);
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamInfo, setStreamInfo] = useState({ embed: true });

  const [episodeId, setEpisodeId] = useState(null);
  const [activeEpisodeNum, setActiveEpisodeNum] = useState(null);

  const [activeServerId, setActiveServerId] = useState(null);
  const [activeServerType, setActiveServerType] = useState("sub");
  const [activeServerName, setActiveServerName] = useState(null);

  const [autoNext, setAutoNext] = useState(true);
  const [serverLoading, setServerLoading] = useState(true);
  const [nextEpisodeSchedule, setNextEpisodeSchedule] = useState(null);

  /* ================= RESET ================= */
  useEffect(() => {
    setEpisodes(null);
    setEpisodeId(null);
    setActiveEpisodeNum(null);
    setStreamUrl(null);
    setServers([]);
    setError(null);
  }, [animeId]);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const load = async () => {
      try {
        setAnimeInfoLoading(true);
        const [animeData, epData] = await Promise.all([
          getAnimeInfo(animeId, false),
          getEpisodes(animeId),
        ]);

        setAnimeInfo(animeData?.data);
        setSeasons(animeData?.seasons);
        setEpisodes(epData?.episodes);
        setTotalEpisodes(epData?.totalEpisodes);

        // Extract episode ID from initialEpisodeId or first episode
        if (initialEpisodeId) {
          // If initialEpisodeId is provided, use it directly
          setEpisodeId(initialEpisodeId);
        } else if (epData?.episodes?.[0]?.id) {
          // Extract episode ID from the episode object
          const firstEp = epData.episodes[0];
          const epMatch = firstEp.id.match(/ep=(\d+)/);
          if (epMatch) {
            setEpisodeId(epMatch[1]);
          }
        }
      } catch (e) {
        console.error("Failed to load anime:", e);
        setError("Failed to load anime");
      } finally {
        setAnimeInfoLoading(false);
      }
    };
    load();
  }, [animeId]);

  /* ================= NEXT EP ================= */
  useEffect(() => {
    getNextEpisodeSchedule(animeId)
      .then(setNextEpisodeSchedule)
      .catch(() => {});
  }, [animeId]);

  /* ================= ACTIVE EP NUM ================= */
  useEffect(() => {
    if (!episodes || !episodeId) return;
    const ep = episodes.find(e => {
      const epMatch = e.id.match(/ep=(\d+)/);
      return epMatch && epMatch[1] === String(episodeId);
    });
    setActiveEpisodeNum(ep?.episode_no ?? null);
  }, [episodeId, episodes]);

  /* ================= SERVERS ================= */
  useEffect(() => {
    if (!episodeId) return;

    setServerLoading(true);

    // Server configurations based on the new API documentation
    const list = [
      {
        id: "megaplay-sub",
        name: "Megaplay",
        domain: "https://megaplay.buzz",
        type: "sub",
      },
      {
        id: "megaplay-dub",
        name: "Megaplay",
        domain: "https://megaplay.buzz",
        type: "dub",
      },
      {
        id: "vidwish-sub",
        name: "Vidwish",
        domain: "https://vidwish.live",
        type: "sub",
      },
      {
        id: "vidwish-dub",
        name: "Vidwish",
        domain: "https://vidwish.live",
        type: "dub",
      },
    ];

    // Load saved server preferences
    const savedName = localStorage.getItem("server_name");
    const savedType = localStorage.getItem("server_type");

    // Find initial server based on saved preferences
    const initial =
      list.find(s => s.name === savedName && s.type === savedType) ||
      list.find(s => s.type === (savedType || "sub")) ||
      list[0];

    setServers(list);
    setActiveServerId(initial.id);
    setActiveServerName(initial.name);
    setActiveServerType(initial.type);
    setServerLoading(false);
  }, [episodeId]);

  /* ================= BUILD IFRAME/STREAM URL ================= */
  useEffect(() => {
    if (!episodeId || !activeServerId) return;

    setBuffering(true);
    const server = servers.find(s => s.id === activeServerId);
    if (!server) return;

    // Build URL according to the new API documentation
    // Format: https://domain/stream/s-2/{episodeId}/{language}
    const url = `${server.domain}/stream/s-2/${episodeId}/${server.type}`;

    setStreamUrl(url);
    setStreamInfo({ 
      embed: true,
      streamingLink: {
        iframe: url
      }
    });

    // Save preferences
    localStorage.setItem("server_name", server.name);
    localStorage.setItem("server_type", server.type);

    setBuffering(false);
  }, [episodeId, activeServerId, servers]);

  /* ================= AUTO NEXT ================= */
  const goNextEpisode = () => {
    if (!episodes || !activeEpisodeNum) return;
    const next = episodes.find(e => e.episode_no === activeEpisodeNum + 1);
    if (next) {
      const epMatch = next.id.match(/ep=(\d+)/);
      if (epMatch) {
        setEpisodeId(epMatch[1]);
      }
    }
  };

  return {
    error,
    buffering,
    animeInfo,
    episodes,
    totalEpisodes,
    seasons,
    servers,
    streamUrl,
    streamInfo,
    episodeId,
    setEpisodeId,
    activeEpisodeNum,
    activeServerId,
    setActiveServerId,
    activeServerType,
    setActiveServerType,
    activeServerName,
    autoNext,
    setAutoNext,
    nextEpisodeSchedule,
    goNextEpisode,
    animeInfoLoading,
    serverLoading,
  };
};