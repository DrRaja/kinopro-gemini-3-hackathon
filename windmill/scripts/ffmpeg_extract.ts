type Scene = {
  scene_number: number;
  start_tc: string;
  end_tc: string;
  storyboard_id?: string;
};

type Input = {
  project_id: string;
  scenes: { scenes: Scene[] }[];
};

export async function main(input: Input) {
  const commands = input.scenes.flatMap((board, boardIndex) =>
    board.scenes.map((scene) => ({
      storyboard_index: boardIndex,
      scene_number: scene.scene_number,
      cpu: [
        "ffmpeg",
        "-y",
        "-ss",
        scene.start_tc,
        "-to",
        scene.end_tc,
        "-i",
        `./uploads/${input.project_id}.mp4`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        `./clips/${input.project_id}/sb${boardIndex}_scene${scene.scene_number}.mp4`,
      ],
      prod: [
        "ffmpeg",
        "-y",
        "-ss",
        scene.start_tc,
        "-to",
        scene.end_tc,
        "-i",
        `./uploads/${input.project_id}.mp4`,
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "18",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        `./clips/${input.project_id}/sb${boardIndex}_scene${scene.scene_number}.mp4`,
      ],
      // nvenc: [
      //   "ffmpeg",
      //   "-y",
      //   "-ss",
      //   scene.start_tc,
      //   "-to",
      //   scene.end_tc,
      //   "-i",
      //   `./uploads/${input.project_id}.mp4`,
      //   "-c:v",
      //   "h264_nvenc",
      //   "-preset",
      //   "p1",
      //   "-tune",
      //   "ll",
      //   "-c:a",
      //   "aac",
      //   "-b:a",
      //   "192k",
      //   `./clips/${input.project_id}/sb${boardIndex}_scene${scene.scene_number}.mp4`,
      // ],
    })),
  );

  return {
    project_id: input.project_id,
    commands,
  };
}
