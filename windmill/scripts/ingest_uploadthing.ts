type Input = {
  project_id: string;
  asset_url: string;
  filename: string;
};

export async function main(input: Input) {
  return {
    project_id: input.project_id,
    asset_url: input.asset_url,
    filename: input.filename,
    status: "uploaded",
  };
}
