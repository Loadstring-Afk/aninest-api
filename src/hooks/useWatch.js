/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
import getAnimeInfo from "@/src/utils/getAnimeInfo.utils";
import getEpisodes from "@/src/utils/getEpisodes.utils";
import getNextEpisodeSchedule from "../utils/getNextEpisodeSchedule.utils";

export const useWatch = (animeId, initialEpisodeId) => {
  const [error, setError] = useState(null);
  const [buffering, setBuffering] = useState(true);
  const [streamInfo, setStreamInfo] = useState(null);
  const [animeInfo, setAnimeInfo] = useState(null);
  const [episodes, setEpisodes] = useState(null);
  const [animeInfoLoading, setAnimeInfoLoading] = useState(false);
  const [totalEpisodes, setTotalEpisodes] = useState(null);
  const [seasons, setSeasons] = useState(null);
  const [servers, setServers] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [isFullOverview, setIsFullOverview] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [intro, setIntro] = useState(null);
  const [outro, setOutro] = useState(null);
  const [episodeId, setEpisodeId] = useState(null);
  const [activeEpisodeNum, setActiveEpisodeNum] = useState(null);
  const [activeServerId, setActiveServerId] = useState(null);
  const [activeServerType, setActiveServerType] = useState("sub");
  const [activeServerName, setActiveServerName] = useState(null);
  const [serverLoading, setServerLoading] = useState(true);
  const [nextEpisodeSchedule, setNextEpisodeSchedule] = useState(null);

  /* =========================
     RESET ON ANIME CHANGE
  ========================= */
  useEffect(() => {
    setEpisodes(null);
    setEpisodeId(null);
    setActiveEpisodeNum(null);
    setServers(null);
    setActiveServerId(null);
    setStreamInfo(null);
    setStreamUrl(null);
    setSubtitles([]);
    setThumbnail(null);
    setIntro(null);
    setOutro(null);
    setBuffering(true);
    setServerLoading(true);
    setError(null);
    setAnimeInfo(null);
    setSeasons(null);
    setTotalEpisodes(null);
    setAnimeInfoLoading(true);
  }, [animeId]);

  /* =========================
     FETCH ANIME + EPISODES
  ========================= */
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setAnimeInfoLoading(true);

        const [animeData, episodesData] = await Promise.all([
          getAnimeInfo(animeId, false),
          getEpisodes(animeId),
        ]);

        setAnimeInfo(animeData?.data);
        setSeasons(animeData?.seasons);
        setEpisodes(episodesData?.episodes);
        setTotalEpisodes(episodesData?.totalEpisodes);

        const newEpisodeId =
          initialEpisodeId ||
          (episodesData?.episodes?.length
            ? episodesData.episodes[0].id.match(/ep=(\d+)/)?.[1]
            : null);

        setEpisodeId(newEpisodeId);
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError(err.message || "An error occurred.");
      } finally {
        setAnimeInfoLoading(false);
      }
    };

    fetchInitialData();
  }, [animeId]);

  /* =========================
     NEXT EPISODE SCHEDULE
  ========================= */
  useEffect(() => {
    const fetchNextEpisodeSchedule = async () => {
      try {
        const data = await getNextEpisodeSchedule(animeId);
        setNextEpisodeSchedule(data);
      } catch (err) {
        console.error("Error fetching next episode schedule:", err);
      }
    };

    fetchNextEpisodeSchedule();
  }, [animeId]);

  /* =========================
     ACTIVE EPISODE NUMBER
  ========================= */
  useEffect(() => {
    if (!episodes || !episodeId) {
      setActiveEpisodeNum(null);
      return;
    }

    const activeEpisode = episodes.find(ep => {
      const match = ep.id.match(/ep=(\d+)/);
      return match && match[1] === episodeId;
    });

    setActiveEpisodeNum(activeEpisode?.episode_no ?? null);
  }, [episodeId, episodes]);

  /* =========================
     SET STATIC IFRAME SERVERS
  ========================= */
  useEffect(() => {
    if (!episodeId) return;

    setServerLoading(true);

    const serverList = [
      {
        serverName: "Megaplay",
        domain: "https://megaplay.buzz",
        type: "sub",
        data_id: "megaplay-sub",
      },
      {
        serverName: "Megaplay",
        domain: "https://megaplay.buzz",
        type: "dub",
        data_id: "megaplay-dub",
      },
      {
        serverName: "Vidwish",
        domain: "https://vidwish.live",
        type: "sub",
        data_id: "vidwish-sub",
      },
      {
        serverName: "Vidwish",
        domain: "https://vidwish.live",
        type: "dub",
        data_id: "vidwish-dub",
      },
    ];

    const savedName = localStorage.getItem("server_name");
    const savedType = localStorage.getItem("server_type");

    const initialServer =
      serverList.find(
        s => s.serverName === savedName && s.type === savedType
      ) ||
      serverList.find(s => s.type === savedType) ||
      serverList[0];

    setServers(serverList);
    setActiveServerId(initialServer.data_id);
    setActiveServerName(initialServer.serverName);
    setActiveServerType(initialServer.type);

    setServerLoading(false);
  }, [episodeId]);

  /* =========================
     BUILD EMBED STREAM URL
  ========================= */
  useEffect(() => {
    if (!episodeId || !activeServerId || !servers) return;

    setBuffering(true);

    const server = servers.find(s => s.data_id === activeServerId);
    if (!server) {
      setError("Invalid server selected");
      setBuffering(false);
      return;
    }

    const embedUrl = `${server.domain}/stream/s-2/${episodeId}/${activeServerType}`;

    setStreamUrl(embedUrl);
    setStreamInfo({ embed: true });
    setSubtitles([]);
    setIntro(null);
    setOutro(null);
    setThumbnail(null);

    localStorage.setItem("server_name", server.serverName);
    localStorage.setItem("server_type", activeServerType);

    setBuffering(false);
  }, [episodeId, activeServerId, activeServerType, servers]);

  return {
    error,
    buffering,
    serverLoading,
    streamInfo,
    animeInfo,
    episodes,
    nextEpisodeSchedule,
    animeInfoLoading,
    totalEpisodes,
    seasons,
    servers,
    streamUrl,
    isFullOverview,
    setIsFullOverview,
    subtitles,
    thumbnail,
    intro,
    outro,
    episodeId,
    setEpisodeId,
    activeEpisodeNum,
    setActiveEpisodeNum,
    activeServerId,
    setActiveServerId,
    activeServerType,
    setActiveServerType,
    activeServerName,
    setActiveServerName,
  };
};