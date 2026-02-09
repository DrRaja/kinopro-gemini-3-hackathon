type Input = {
  project_id: string;
  status: string;
};

export async function main(input: Input) {
  return {
    project_id: input.project_id,
    status: input.status,
    notified: true,
  };
}
