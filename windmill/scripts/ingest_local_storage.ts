type Input = {
  project_id: string;
  asset_path: string;
  filename: string;
};

export async function main(input: Input) {
  return {
    project_id: input.project_id,
    asset_path: input.asset_path,
    filename: input.filename,
    status: "local_stored",
  };
}
