type Scene = {
  scene_number: number;
  thumbnail_tc: string;
};

type Input = {
  project_id: string;
  scenes: { scenes: Scene[] }[];
  fps: number;
};

const offsets = [-8, 0, 8];

const timecodeToSeconds = (timecode: string, fps: number) => {
  const [hours, minutes, rest] = timecode.split(":");
  const [seconds, frames] = rest.split(".");
  const baseSeconds = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  return baseSeconds + Number(frames) / fps;
};

const secondsToTimecode = (seconds: number, fps: number) => {
  const clamped = Math.max(0, seconds);
  const totalFrames = Math.floor(clamped * fps);
  const frame = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const sec = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:${String(sec).padStart(2, "0")}.${String(frame).padStart(2, "0")}`;
};

export async function main(input: Input) {
  const commands = input.scenes.flatMap((board, boardIndex) =>
    board.scenes.flatMap((scene) =>
      offsets.map((offset) => {
        const baseSeconds = timecodeToSeconds(scene.thumbnail_tc, input.fps);
        const candidateSeconds = baseSeconds + offset / input.fps;
        const candidateTc = secondsToTimecode(candidateSeconds, input.fps);

        return {
          storyboard_index: boardIndex,
          scene_number: scene.scene_number,
          offset,
          command: [
            "ffmpeg",
            "-y",
            "-ss",
            candidateTc,
            "-i",
            `./uploads/${input.project_id}.mp4`,
            "-frames:v",
            "1",
          "-vf",
          "scale=1280:-2",
          "-c:v",
          "libwebp",
            "-quality",
            "80",
            `./thumbs/${input.project_id}/sb${boardIndex}_scene${scene.scene_number}_${offset}.webp`,
          ],
        };
      }),
    ),
  );

  return {
    project_id: input.project_id,
    fps: input.fps,
    commands,
  };
}
