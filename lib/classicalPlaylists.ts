export type ClassicalPlaylist = {
  id: string;
  label: string;
  composer: string;
  src: string;
};

export const CLASSICAL_PLAYLISTS: ClassicalPlaylist[] = [
  {
    id: "morning-piano",
    label: "Morning piano",
    composer: "Chopin · Nocturnes",
    src: "/assets/Audio/audio1.mp3",
  },
  {
    id: "baroque",
    label: "Baroque",
    composer: "Bach · Preludes",
    src: "/assets/Audio/audio2.mp3",
  },
  {
    id: "strings",
    label: "Strings",
    composer: "Mozart · Quartets",
    src: "/assets/Audio/audio3.mp3",
  },
  {
    id: "quiet-cafe",
    label: "Quiet café",
    composer: "Satie · Gymnopédies",
    src: "/assets/Audio/audio4.mp3",
  },
  {
    id: "evening",
    label: "Evening close",
    composer: "Beethoven · Moonlight",
    src: "/assets/Audio/audio5.mp3",
  },
];

export const CLASSICAL_STORAGE_KEY = "hotcol-classical-player";
export const CLASSICAL_DEFAULT_VOLUME = 0.25;
