type Input = {
  project_id: string;
  payload: unknown;
};

export async function main(input: Input) {
  return {
    project_id: input.project_id,
    status: "persisted",
  };
}
