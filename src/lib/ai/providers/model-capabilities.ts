export function supportsTextCompletion(model: {
  architecture?: { output_modalities?: string[] };
}): boolean {
  const modalities = model.architecture?.output_modalities;
  return !modalities?.length || modalities.includes("text");
}
